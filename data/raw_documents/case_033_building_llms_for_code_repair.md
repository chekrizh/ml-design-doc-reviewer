# Building LLMs for Code Repair

- **Sample ID**: case_033
- **Source URL**: https://blog.replit.com/code-repair
- **Content type**: article

---

Introduction
At Replit, we are rethinking the developer experience with AI as a first-class citizen of the development environment. Towards this vision, we are tightly integrating AI tools with our IDE. Currently, LLMs specialized for programming are trained with a mixture of source code and relevant natural languages, such as GitHub issues and StackExchange posts. These models are not trained to interact directly with the development environment and, therefore, have limited ability to understand events or use tools within Replit. We believe that by training models native to Replit, we can create more powerful AI tools for developers.
A simple example of a Replit-native model takes a session event as input and returns a well-defined response. We set out to identify a scenario where we could develop a model that could also become a useful tool for our current developers and settled on code repair. Developers spend a significant fraction of their time fixing bugs in software. In 2018, when Microsoft released “A Common Protocol for Languages,” Replit began supporting the Language Server Protocol. Since then, the LSP has helped millions using Replit to find errors in their code. This puts LSP diagnostics among our most common events, with hundreds of millions per day. However, while the LSP identifies errors, it can only provide fixes in limited cases. In fact, only 10% of LSP diagnostic messages in Python projects on Replit have associated fixes. Given the abundance of training data, repairing code errors using LSP diagnostics is therefore the ideal setting to build our first Replit-native AI model.
Methodology
Data
Data sources: OTs, events, and Repl snapshots
A Replit session is a stream of data across multiple modalities. To support multiplayer features, Replit represents code as a sequence of Operational Transformations (OTs). This representation provides an edit-by-edit history of all the changes made to a file and allows us to “play back” a project’s state. A regular snapshot of each project’s most recent state allows us to assert the replay’s correctness.
OT data is merged with session events into a single timeline. Here, we work with LSP diagnostics, but many other events are recorded, including CodeMirror actions (selection, scrolling), package installation, code execution, and shell commands. Windows of this timeline represent tasks the user is performing: implementing a feature, reading and trying to understand a function, fixing a bug or runtime error, etc.
Data pipeline
The goal of our data pipeline is to produce a dataset of (code, diagnostic) pairs. We first recreate the filesystem of a project at the time of the diagnostic, then use LLMs to generate and verify synthetic diffs.
We log all LSP diagnostics from user sessions in BigQuery. The data looks like this:
We exclude:
- diagnostics with associated CodeActions (deterministic solutions provided by the LSP server) since we will always use the CodeAction at inference
- stylistic rules, like ruff[E501] Line too long and ruff[I001] Unsorted imports
- private and non-Python projects
Using OTs, we reconstruct the repl filesystem corresponding to the LSP diagnostic timestamp. As a sanity check, we assert that we can reconstruct the most recent Repl filesystem and match a copy stored in GCS. We also run Ruff and Pyright from our pyright-extended meta-LSP and assert that the expected set of diagnostics is reproduced. LSP executables need to be pointed to a filesystem directory, and in a Spark environment dynamically persisting strings is challenging. For this reason, diagnostics were verified with a serverless lambda that scales up in bursts.
We targeted a dataset of 100k examples but designed a pipeline ready to scale up at least another order of magnitude. As such, we implemented our pipeline with PySpark on Databricks to scale up compute as needed.
Line diff synthesis, distillation, and verification
We synthesize diffs using large pre-trained code LLMs with a few-shot prompt pipeline implemented with DSPy.
We chose numbered Line Diffs as our target format based on (1) the finding in OctoPack that Line Diff formatting leads to higher 0-shot fix performance and (2) our latency requirement that the generated sequence should be as short as possible. We compared Line Diffs with the Unified Diff format and found that line numbers were hallucinated in the Unified Diff both with and without line numbers in the input. Furthermore, Unified Diffs would have a higher decoding cost.
We distill a model from synthesized diffs because fixed errors taken directly from user data are noisier than synthesized diffs. We found that a well-defined synthetic pipeline resulted in more accurate diffs with less variance in the output space when compared to diffs from users.
Compared to synthesizing both the error state and the diff, starting from real error states and synthesizing only the diff is less prone to mode collapse, since the input feature and diff distributions are drawn from the real world. We did not detect mode collapse in our audit of the generated data and recommend synthesizing data starting from real-world states over end-to-end synthesis of samples.
After synthesis, we verify that generated diffs are correctly formatted and applicable. We use regular expressions to extract the line diffs and filter out all other text and incomplete/malformed line diffs. We also apply the generated numbered line diffs to the code file with line numbers to ensure that they can be correctly and unambiguously applied, eliminating samples that cannot be applied due to incorrect line numbers or hallucinated content. Lastly, we increase the proportion of correct diffs to incorrect diffs by prompting an LLM to filter out incorrect diffs, inspired by
Supervised finetuning
Since the distribution of fixed code matches the training distribution of large code LLMs, we hypothesize that the information required to repair LSP diagnostic errors is already contained in the model’s parameters. However, it is difficult to elicit the correct distribution of responses, and to get generalist SOTA LLMs to return a consistently formatted response.
Therefore, we frame code repair as a supervised finetuning problem. Given an LSP error, the line throwing this error, and the code file contents, we finetune a pre-trained code LLM to predict an output line diff. This matches the model’s outputs to the desired inference distribution.
Data format and input/output scheme
In contrast to the usual instruction finetuning used to finetune code models, we did not use natural language instructions for our code repair model. Instead, inspired by function calling and other approaches to tool usage, we templated data from our IDE into a consistent schema delineated by angle-bracketed sentinel tokens.
Although the base model was trained to follow natural language instructions, we benefit from teaching the model to follow this schema:
- We found that responses are more consistently generated and formatted and, therefore, easier to parse.
- This approach is compatible with and can be extended in future efforts to model Replit sessions as a sequence of events and outputs. For example, we can add sentinel tokens like
<run_command>
and<exec_output>
to indicate a command that should be run and the execution output after running the Repl respectively.
Our rationale for choosing this format is as follows:
- Following OctoPack, we add line numbers to the input code, LSP error line, and output line diffs. Line numbers (1) guarantee the non-ambiguous application of diffs in cases where the same line of code is present in multiple places in the file and (2) empirically boost response quality in our experiments and ablations.
- We follow the base LLM's data format to keep code formatting as close as possible to the model’s training distribution. Therefore, following DeepSeek-Coder, we kept the file name above the file content and did not introduce additional metadata used by other code models, such as a language tag.
- We considered modifying the vocabulary and, consequently, the architecture/dimensions of the base model to have dedicated special tokens for each sentinel token in our schema. However, we decided this was not necessary based on how finetuning performed without this surgery and because the improvement to decoding latency would have been marginal. Our model performed well with each sentinel token mapped to 3-5 tokens from the base model’s tokenizer.
- The flexible output space supports single-line edits, single-line addition/removal, and complex multi-line changes. The output space will dependably match the examples provided in the finetuning dataset, so it can be expanded or constrained by the use case.
Model Training
Base model
We finetuned starting from an open-weights 7B model trained on code. We chose the model size of 7B to balance model capabilities with our constraints of inference latency and cost. We experimented with base and instruction-tuned models from the Starcoder2 and DeepSeek-Coder families and ultimately settled on DeepSeek-Coder-Instruct-v1.5 based on performance.
We downloaded the base model weights from HuggingFace and patched the model architecture to use the Flash Attention v2 Triton kernel.
Infrastructure and distributed training
For training, we used a fork of MosaicML’s LLM Foundry from the v0.5.0 tag with Composer. We trained on the MosaicML platform with a single node of 8 H100s per experiment. We used FSDP with the default Full Shard strategy, and activation checkpointing.
Optimization and hyperparameters
For optimization, we use the Decoupled AdamW optimizer and Cosine Annealing with Warmup as our learning rate scheduler. We set an initial learning rate of 1e-5 and decayed to 0.01x (i.e. alpha_f=0.01
), with a warmup of 100 batches, beta_1=0.9
, beta_2=0.99
, epsilon=1e-8
with no weight decay, and a batch size of 16. Training for 4 epochs gave the best experimental performance, consistent with previous work on pretraining where 4 epochs are considered optimal for smaller, high-quality datasets. We use norm-based Gradient Clipping with a clipping threshold of 1.0. All training was in mixed precision with BF16.
We use a packing ratio of 6.0 for Bin Packing of sequences as implemented in LLM Foundry. This is obtained by a script available in LLM Foundry that profiles packing.
Evaluations
The automated program repair literature has a rich family of evaluation datasets, spanning various programming languages. However, many of these datasets have been shown to be leaked in the pre-training corpus of large-language models for code, making them unsuitable for the evaluation of SOTA LLMs. Furthermore, these evaluation datasets are often curated from professional/well-maintained repositories (e.g. filtered by stars on GitHub), thereby acting as a weak proxy to measure the performance of program repair models on real-world program repair tasks for users of diverse skill levels. To solve these issues, we conduct a two-part evaluation of our model.
Leetcode repair eval
To measure our model's performance on public benchmarks, we select DebugBench, owing to its relative recency, error subtyping, and open-source pipeline. We select a subset of problems from the categories of syntactic and reference errors, as solving these errors can be assisted by LSP diagnostics. For each selected problem, we attach the associated diagnostic from either Ruff or Pyright.
The following is a sample evaluation instance from the dataset:
from typing import List
class Solution:
def lexicographicallySmallestArray(self, nums: List[int], limit: int) -> List[int]:
n = len(nums)
a = sorted(zip(nums, range(n)))
ans = [0] * n
i = 0
while i < n:
st = i
i += 1
while i < n and a[i][0] - a[i - 1][0] <= limit:
i += 1
sub = a[st:i]
sub_idx = sorted(idx for _, idx in sub)
for j, (x, _) in zip(sub_idx, sub):
ans[j] = x
return self.postprocess(ans) #buggy code
The associated LSP Diagnostic is:
# LSP diagnostics
Error Message: Cannot access member "postprocess" for type "Solution*" Member "postprocess" is unknown'
Error line: return self.postprocess(ans)
The fixed solution is:
from typing import List
class Solution:
def lexicographicallySmallestArray(self, nums: List[int], limit: int) -> List[int]:
n = len(nums)
a = sorted(zip(nums, range(n)))
ans = [0] * n
i = 0
while i < n:
st = i
i += 1
while i < n and a[i][0] - a[i - 1][0] <= limit:
i += 1
sub = a[st:i]
sub_idx = sorted(idx for _, idx in sub)
for j, (x, _) in zip(sub_idx, sub):
ans[j] = x
return ans #fixed code
More recently, LivecodeBench has shown that open large language models struggle when evaluated against recent Leetcode problems. Therefore, in order to strengthen our evaluation, we select recent problems (after the base model’s data cutoff date) from Leetcode competitions as proposed in LiveCodeBench and use the synthetic bug injection pipeline proposed in DebugBench to create additional evaluation instances for the test set. The final distribution of subtypes of problems in our dataset is included in the Appendix and consists of 360 samples.
Replit repair eval
To test the model in our inference setting–that is to say, fixing LSP diagnostics for users while they are writing code on Replit–we needed to create a completely new benchmark. We followed the procedure outlined in Data to sample held-out (code, diagnostic) pairs from each diagnostic type that the model was trained to repair, removing low-quality code when necessary (e.g., .py
files containing only natural language). We sample at the Repl level and deduplicate (following the procedure recommended in StarCoder) to ensure no train-test leakage. To create the repaired code, we follow a two-step approach: we first use a SOTA LLM to create a fix for the (code, diagnostic) pair, and a human annotator verifies that the solution is correct. If it isn't the annotator provides a correct fix. The final distribution of LSP diagnostic types in our dataset is included in the Appendix and consists of 389 samples.
Metrics
We measure performance using both functional correctness and exact match metrics.
Functional Correctness: Functional correctness measures the functional equivalence of target code C
against the fixed code C’
produced by the application of a predicted line diff to the input code. This metric requires the code to be in an executable state and requires test cases for evaluation. Therefore this metric is limited to the Leetcode repair eval, where solutions are submitted to the platform for evaluation.
Exact Match: Exact match compares the target code C
against the fixed code C’
produced by the application of a predicted line diff to the input code. We consider two types of exact matches:
- AST match: We compare the abstract syntax tree (AST) representation of
C’
against that ofC
. - AST match string fallback: There are several cases where the source code cannot be parsed into a valid AST. However, the fix proposed by the model is still valid, therefore we consider a fix to be acceptable if either the AST or the string representation of
C’
matchesC
.
Limitation: The exact match metric is a lower bound to functional correctness. However, it is not always feasible to generate tests of functional correctness, so following prior work such as CrossCodeEval, we use exact code match.
Baselines
We compare our model against the following SOTA LLM baselines:
- Models available via API: We use the most recent releases of GPT-4-Turbo (gpt-4-0125-preview), GPT-3.5-Turbo (gpt-3.5-turbo-0125), Claude-3-Opus (claude-3-opus-20240229) and Claude-3-Haiku (claude-3-haiku-20240307). The models are accessed via their APIs.
- Open-source models: We compare the performance of our finetuned model against the base model it was initialized from, DeepSeek-Coder-Instruct-v1.5. This model also has the strongest finetuning performance among the 7B parameter models that we tested. We use the publicly available checkpoint.
Inference configuration
- Few-shot example choice: For each evaluation sample of an error type, the few-shot evaluation examples are chosen randomly from the training dataset by matching the error code.
- Prompt structure: We follow the recommended prompting strategies for large language models. Additional details about the prompt structure can be found in Appendix A.
- Inference hyperparameters: We set the maximum number of output tokens to be the maximum context size of the model, use a temperature of 0.1, and set
top_p=0.95
andtop_k=50
for nucleus sampling, wherever applicable. - Pass@1: We evaluate the performance of all models in a single pass setting, mimicking their use in a real-world deployment paradigm.
Results
Replit Code Repair 7B is competitive with models much larger on both evaluation benchmarks. The overall performance of models on our real-world eval remains low when compared to the Leetcode repair eval, which demonstrates the importance of evaluating deep learning models on both academic and real-world benchmarks.
Leetcode repair benchmark
Replit Code Repair 7B is competitive with models that are much larger in size. We note that performance may decrease for smaller models when the number of shots is increased.
Replit repair benchmark
We again find that Replit Code Repair 7B is competitive with larger models. There is a large gap between the performance of Replit Code Repair 7B and other models (except GPT-4 Turbo).
Scaling experiments
Training LLMs is a highly experimental process requiring several iterations to ablate and test hypotheses. Given the low per-experiment cost in our setting, we tested various configurations to develop intuitions about the problem complexity by scaling the dataset and model size and then testing performance as a function of the two.
Data scaling
To test how model performance scales with finetuning dataset size, we finetuned DeepSeek-Coder v1.5 7B Instruct on subsets of 10K, 25K, 50K, and 75K training samples. All subsets were randomly sampled from the same base dataset.
Parameter scaling
To test how model performance scales with model size, we finetuned various backbones from the DeepSeek-Coder v1 Instruct family on a fixed 75k sample dataset. We used v1 as the base model for this experiment because v1.5 is only available at the 7B size.
Related Work
There is a long history of work focused on fixing bugs or vulnerabilities in code [Monperrus 2018].
The strongest traditional approaches applied ground truth templates or operators, written by experts or curated based on datasets of bugs [Ghanbari 2018, Liu 2019].Over time, learning-based approaches gained popularity, which leverage pairs of (broken, fixed) code to expand the distribution of bugs and their fixes. Following the success of neural machine translation (NMT), researchers began to model program repair as translation from buggy to fixed programs [Lutellier 2020, Jiang 2021, Zhu 2021, Ye 2021, Ye 2022]. Due to the poor diversity and quality of synthetic data at the time, NMT approaches required datasets of (broken, fixed) code pulled from open-source repositories, which were often too small to produce significant improvements over traditional approaches.
Break-It-Fix-It introduced a “breaker”, which transforms fixed to broken code, trained in competition with a “fixer” to produce realistic errors. This made it possible to bootstrap a repair model, starting from unrealistic synthetic examples, and iteratively making them more realistic [Yasunaga 2021].
Since [Brown 2020, Kaplan 2020, Chen 2021, Fried 2022], many groups have applied code LLMs to program repair [Berabi 2021, Xia 2023]. In this paradigm, LLMs are trained using self-supervised learning on large datasets, and have impressive 0-shot capabilities to repair programs [Xia 2022, Fan 2022, Mohajer 2023]. To achieve stronger performance with smaller models, several groups have applied full-parameter supervised finetuning and parameter-efficient finetuning methods like LORA to specialize the model to the program repair task [Jin 2023, Silva 2023, Huang 2023]. Recent work has applied more sophisticated prompting strategies or agentic behavior [Bouzenia 2023, Xia 2023, Kong 2024].
Future work
Given these promising results, we are working on several extensions.
The space of fixes for program repair using the LSP is quite large in terms of the complexity of fixes and code context. So we are further curating data and performing experiments for more complex cases such as cross-file edits, improving performance for multi-line edits and supporting the long tail of errors that we see on Replit. Of course, this will be accompanied with scaling our base training dataset given our data scaling experiments.
We are also working to support a larger set of programming languages, and we are eager to find out if we will observe transfer-learning across languages, as we have observed when pretraining code completion models. For this reason, we are putting more work into our evals to capture the wider distribution of LSP errors across the many languages supported by Replit.
Once the model is in production, we will experiment with post-training methods like DPO leveraging user data collected by the Replit platform, such as which code fixes are accepted and rejected.
Acknowledgements
We would like to thank Databricks and the MosaicML team for their support with model training tools and infrastructure. We would also like to thank DeepSeek for open sourcing their DeepSeek-Coder models. Finally we would like to acknowledge Bradley Heilbrun, Jacky Zhao, Brady Madden, Connor Brewster, Ryan Mulligan, and many others at Replit for their help and for building the systems that made this project possible.
Contributors
- Ryan Carelli* worked on experimental design, data sourcing, data pipelines, training and ablations, analysis and evaluation.
- Madhav Singhal* work on on experimental design, data pipelines, synthetic data pipeline design and implementation, training and ablations, analysis and evaluation.
- Gian Segato worked on data sourcing, data generation and compatibility with the LSP, data pipelines, synthetic data pipelines, evaluation data and analysis.
- Vaibhav Kumar worked on data sourcing, evaluation, benchmarks, ablations and analysis.
- Michele Catasta was the Principal Investigator.
*Equal contribution
Citation
@online{replit2024coderepair,
author = {Singhal, M. and Carelli, R. and Segato, G. and Kumar, V. and Catasta, M.},
title = {Building LLMs for Code Repair},
year = {2024},
url = {blog.replit.com/code-repair},
urldate = {2024-04-02}
}
Appendix
Distribution of errors in our evaluations
Prompt for 0-shot evals of generalist LLMs
We extend the prompt to include few-shot examples by adding additional user-assistant pairs to the conversations as needed.
---

## Extracted images (16)

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_033/img_001.png]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://cdn.sanity.io/images/bj34pdbp/migration/96d16870122e68b63a07b2306aaed524356a81eb-3840x1920.png?w=3840&q=75&fit=clip&auto=format]
[IMAGE_DESCRIPTION: Code Repair for num, count in ee rons: nums{index] ==/num index += 1 ieeeeunt >> 1:]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_033/img_002.png]
[IMAGE_ALT: An overview of our approach to building a Code Repair LLM.]
[IMAGE_SOURCE_URL: https://cdn.sanity.io/images/bj34pdbp/migration/a72a429ee945fac33d1ae36ff3cd0ef3e36b6bc4-2276x1402.png?rect=0,0,2204,1402&w=3840&q=100&fit=max&auto=format]
[IMAGE_DESCRIPTION: Data Sources Public Python Repls Q Google Cloud Big Query Storage UserEvents Operational LSP Diagnostics Transformation (OT) Stream Cloud Storage Repl Snapshot Serverless <> Run LSP to verify reconstructed repl state & databricks C <> Reconstruct Repl States C <> Verify LSP Diagnostics ) = Training Data Store <> Synthesize Diffs DSPy Pipeline LLM Verifier <> Preprocess ” ( Dedup ) Pll Redact i Model Deployment Model Training bo = Processed Data Store ®= replit Client Workspace LSP Diagnostic req: code + diagnostic <> Format and Shard Training Data 2g Hugging Face @ deepseek deepseekcoder- v1.5-instruct GPU Cluster FSDP KS ~~ <> FT Dataloader w/ Packing ) £ \ mosaic” User Request diff Apply diff to code in real-time resp: line diffs © Serving Load Balancer k=] NVIDIA. mT EDL ——— Inference Servers : model id k-------------------------------: = fey fou Q nO o fe} s oO]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_033/img_003.gif]
[IMAGE_ALT: Users can replay a project in Replit’s workspace.]
[IMAGE_SOURCE_URL: https://blog.replit.com/_next/image?url=https%3A%2F%2Fcdn.sanity.io%2Fimages%2Fbj34pdbp%2Fmigration%2Fbe9df71426a3188fe0d3f309ae6a213b76057209-512x477.gif&w=3840&q=75]
[IMAGE_DESCRIPTION: ep 56 def get_bulletin_rag() -> Unton{str, boot]: 57 url = ‘https://travel. state. gov/content/travel/en/legal/visa-lavo/visa- bulletin.neal’ 38 59 response = requests. get(url) 69 _ntml_content = response. text 61 62 soup = Beauttfulsoup(htal_content, ‘htal parse 83 64 # typing errors expected and more than fine o5y try: 66 _current_bultetin_Link = soup.find('ul', Aide'recent_bulletins®).find( It" ).find( ‘a’ ).get(‘href') 67 _current_bulletin_Uink = “https://travel.state.gov/" + current_bulletin_Uink 68y except Exception as e: 69 return send_error(f*current_bulletin Link ({e})") 7 Tiv (f current bulletin Unk (s None: 72 return send_error(*current_bulletin_Uink*) 2B 74 response = requests. get(current_bulletin_Uink) 75 heml.content = response. text 76 soup = Geaut\tulsoup(html_content, “htal. parser") 7 78 body = soup. find oll(‘eiv', attrsa("class! :"withratt")) 3 80 print Boayigeteexe()] a 2 Nl & 466/540 > months ago = sanatreplt]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_033/img_004.png]
[IMAGE_ALT: Source dataset contains repl id, error timestamp, error path, error code, error message and error range columns.]
[IMAGE_SOURCE_URL: https://cdn.sanity.io/images/bj34pdbp/migration/d43fc4f94e740095bfceb30635d084eaa2993cb5-514x378.png?w=3840&q=100&fit=max&auto=format]
[IMAGE_DESCRIPTION: Column Sample repl_id 6795a320-a7a5-46{4-a191-963f7e27517f error_timestamp 2024-02-15 07:22:57.505000+00:00 error_path main.py error_code ruff[E703] error_message Statement ends with an unnecessary semicolon error_range {start={character=38, line=6}, end={character=...}}]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_033/img_005.png]
[IMAGE_ALT: The input/output format. The input is highlighted in orange. The output is generated and is in green. Sentinel tokens identify packets of information that map to inputs and outputs from the Replit IDE.]
[IMAGE_SOURCE_URL: https://cdn.sanity.io/images/bj34pdbp/migration/6ef71a68ae3a8c83d4b8a59c84b0309263b16b09-1085x464.png?w=3840&q=100&fit=max&auto=format]
[IMAGE_DESCRIPTION: <code> #main.py 1 import turtle 2 3 screen = turtle.screen 4 screen.setup(550,400) 5 screen. bycolor( "orange" ) </code> <lsp_error> "screen" is not a known member of module “turtle" </lsp_error> <error_line> 3 screen = turtle.screen = turtle.screen turtle.Screen( )]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_033/img_006.jpg]
[IMAGE_ALT: A comparison of zero-shot results on the Replit repair eval and the Leetcode repair eval.]
[IMAGE_SOURCE_URL: https://cdn.sanity.io/images/bj34pdbp/migration/c2d8cb4bbeafd4995e414388518060c013117f09-3179x1391.jpg?w=3840&q=100&fit=max&auto=format]
[IMAGE_DESCRIPTION: 90 80 7 fo) 6 fo) 5 fo) 40 Replit Code Repair 7B GPT-4 Turbo @ Leetcode Repair Eval Claude 3 Opus © Replit Repair Eval GPT-3.5 Turbo Claude 3 Haiku deepseek-coder-7b-instruct-v1.5]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_033/img_007.png]
[IMAGE_ALT: Performance of different baseline models on the Leetcode repair eval.]
[IMAGE_SOURCE_URL: https://cdn.sanity.io/images/bj34pdbp/migration/37ccf352bfc4d21e856cb4748391ee784aa200b9-1351x596.png?w=3840&q=100&fit=max&auto=format]
[IMAGE_DESCRIPTION: Model GPT-4 Turbo (gpt4-0125-preview) Claude-3-Opus GPT-3.5 Turbo (gpt-3.5-turbo-0125) Claude-3-Haiku DeepSeek-Coder-Instruct-v1.5 GPT-4 Turbo (gpt4-0125-preview) Claude-3-Opus GPT-3.5 Turbo (gpt-3.5-turbo-0125) Claude-3-Haiku DeepSeek-Coder-Instruct-v1.5 GPT-4 Turbo (gpt4-0125-preview) Claude-3-Opus GPT-3.5 Turbo (gpt-3.5-turbo-0125) Claude-3-Haiku DeepSeek-Coder-Instruct-v1.5 Replit Code Repair 7B Number of Few Shot Examples NRNNNN PRB RB OOOO Oo N/A AST match 83.61 83.33 73.88 71.11 60 83.61 83.61 71.94 73.61 61.96 83.88 85 73.33 69.44 61.66 84.16 Functional Correctness 88.33 87.22 78.88 76.38 64.44 89.16 88.05 77.22 78.05 65.84 89.16 88.61 78.88 74.44 66.94 89.44]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_033/img_008.png]
[IMAGE_ALT: Performance of different baseline models on the Replit repair eval.]
[IMAGE_SOURCE_URL: https://cdn.sanity.io/images/bj34pdbp/migration/c30fad47026b4faf3067751ef9ef778baeef3480-1006x597.png?w=3840&q=100&fit=max&auto=format]
[IMAGE_DESCRIPTION: Model GPT-4 Turbo (gpt4-0125-preview) Claude-3-Opus GPT-3.5 Turbo (gpt-3.5-turbo-0125) Claude-3-Haiku DeepSeek-Coder-Instruct-v1.5 GPT-4 Turbo (gpt4-0125-preview) Claude-3-Opus GPT-3.5 Turbo (gpt-3.5-turbo-0125) Claude-3-Haiku DeepSeek-Coder-Instruct-v1.5 GPT-4 Turbo (gpt4-0125-preview) Claude-3-Opus GPT-3.5 Turbo (gpt-3.5-turbo-0125) Claude-3-Haiku DeepSeek-Coder-Instruct-v1.5 Replit Code Repair 7B Number of Few Shot Examples NN NRHN PRR RRR OOOO Oo N/A AST Match String Fallback 73.78 62.47 53.47 51.67 43.7 73.52 64.01 56.81 53.21 40.35 72.23 65.81 57.0 53.98 41.31 74.55]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_033/img_009.png]
[IMAGE_ALT: Performance improves with number of training examples.]
[IMAGE_SOURCE_URL: https://cdn.sanity.io/images/bj34pdbp/migration/8af9f4a6082772725a2edd9f12c16f1f8463da85-1134x282.png?w=3840&q=100&fit=max&auto=format]
[IMAGE_DESCRIPTION: # of Training Samples 10K Samples 25K Samples 50K Samples 75K Samples Input/Output Token Counts 4.12M / 301K 10.4M/ 751K 20.8M /1.5M 31.8M / 2.3M Leetcode Repair Success 86.4526 87.5395 88.354 89.44]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_033/img_010.png]
[IMAGE_ALT: Performance improves with number of model parameters.]
[IMAGE_SOURCE_URL: https://cdn.sanity.io/images/bj34pdbp/migration/12b3333fe14f9c300a7aff43ab0304cce90c0033-1400x264.png?w=3840&q=100&fit=max&auto=format]
[IMAGE_DESCRIPTION: Replit Repair AST Match Model Size Train PPL Eval PPL Leetcode Repair Success String Fallback 1.3B 1.0596 1.0661 85.20 72.23 6.7B 1.0229 1.0774 88.88 72.25 33B 1.0008 1.1556 89.44 74.04]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_033/img_011.png]
[IMAGE_ALT: A distribution of diagnostic error types in the Replit repair eval.]
[IMAGE_SOURCE_URL: https://cdn.sanity.io/images/bj34pdbp/migration/7505625d92e43fb2ee5a5368e95e17c68bd806b6-1774x1184.png?w=3840&q=100&fit=max&auto=format]
[IMAGE_DESCRIPTION: 120 100 Count 80 60 40 20 LSP Diagnostic Distribution MM Diagnostic Count Diagnostic Type]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_033/img_012.png]
[IMAGE_ALT: A distribution of error types in the Leetcode Repair Eval]
[IMAGE_SOURCE_URL: https://cdn.sanity.io/images/bj34pdbp/migration/3886615874c62944bb2513dd23c49293dd205602-1763x1184.png?w=3840&q=100&fit=max&auto=format]
[IMAGE_DESCRIPTION: 60 50 40 30 Count 20 10 Error Subtypes Occurrence 60 58 42 42 41 40 35 23 11 Error Count Error Subtype]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_033/img_013.png]
[IMAGE_ALT: 0-shot prompt used]
[IMAGE_SOURCE_URL: https://cdn.sanity.io/images/bj34pdbp/migration/6734c23c9dcbf66d879f12050729f86e2b47c8ef-2048x1716.png?w=3840&q=100&fit=max&auto=format]
[IMAGE_DESCRIPTION: System: You are an expert Python debugging assistant. The user will provide you with their Python code, the error message, and the line that is producing the error. Your task is to generate a valid single line diff that fixes the error. In your response, use <diff> and </diff> tags to indicate the start and end of the line diff and follows proper format for line diff. Here is an example of a valid Single line diff: <diff> -1 x = 0/0 +1 X 0/1 </diff> USER: I am experiencing some issues with my python program. Here is my code: ~~ python {error_code} Here is the line that is producing the error: {error_line} Here is the error message: {error_message} Assistant: <diff>]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_033/img_014.jpg]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://cdn.sanity.io/images/bj34pdbp/migration/5789f6e7af051646efeb4101bf1017aa89a4d646-1280x720.jpg?w=3840&q=75&fit=clip&auto=format]
[IMAGE_DESCRIPTION: © Threads 63 Huddles E> Drafts & sent £8) Directories Alerts_Snowflake Demo 4* Starred High Revenue Alert # ext-connectors-webinars @ LIVE Build session — Webinar — es Home re. DMs Q Date Activit <i # snowflake demo Sun Aug 02 1998 00:00:00 GM r) Coordinated Ur »! Time » External Connections Files Daily revenue exceeded the thre » Channels Alerts_Snowflake Demo 4? > Direct messages High Revenue Alert Vibe Code — DataApps =< Part 2 Developer Advocate]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_033/img_015.jpg]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://cdn.sanity.io/images/bj34pdbp/migration/979d1df1aae3e6b0553b5f834bcbc45f645b603e-1200x675.jpg?w=3840&q=75&fit=clip&auto=format]
[IMAGE_DESCRIPTION: NO_TEXT_DETECTED]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_033/img_016.jpg]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://cdn.sanity.io/images/bj34pdbp/migration/2b186865442a22d401c556741f1e818d16fa47a2-1280x720.jpg?w=3840&q=75&fit=clip&auto=format]
[IMAGE_DESCRIPTION: replit | BUILD SESSION acl a BUILD A BROWSER EXTENSION]
