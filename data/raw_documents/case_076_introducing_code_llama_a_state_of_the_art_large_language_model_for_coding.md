# Introducing Code Llama, a state-of-the-art large language model for coding

- **Sample ID**: case_076
- **Source URL**: https://ai.meta.com/blog/code-llama-large-language-model-coding/
- **Content type**: article

---

Update: Jan 29, 2024: Releasing Code Llama 70B
Today, we are releasing Code Llama, a large language model (LLM) that can use text prompts to generate code. Code Llama is state-of-the-art for publicly available LLMs on code tasks, and has the potential to make workflows faster and more efficient for current developers and lower the barrier to entry for people who are learning to code. Code Llama has the potential to be used as a productivity and educational tool to help programmers write more robust, well-documented software.
The generative AI space is evolving rapidly, and we believe an open approach to today’s AI is the best one for developing new AI tools that are innovative, safe, and responsible. We are releasing Code Llama under the same community license as Llama 2.
Code Llama is a code-specialized version of Llama 2 that was created by further training Llama 2 on its code-specific datasets, sampling more data from that same dataset for longer. Essentially, Code Llama features enhanced coding capabilities, built on top of Llama 2. It can generate code, and natural language about code, from both code and natural language prompts (e.g., “Write me a function that outputs the fibonacci sequence.”) It can also be used for code completion and debugging. It supports many of the most popular languages being used today, including Python, C++, Java, PHP, Typescript (Javascript), C#, and Bash.
We are releasing four sizes of Code Llama with 7B, 13B, 34B, and 70B parameters respectively. Each of these models is trained with 500B tokens of code and code-related data, apart from 70B, which is trained on 1T tokens. The 7B and 13B base and instruct models have also been trained with fill-in-the-middle (FIM) capability, allowing them to insert code into existing code, meaning they can support tasks like code completion right out of the box.
The three models address different serving and latency requirements. The 7B model, for example, can be served on a single GPU. The 34B and 70B models return the best results and allow for better coding assistance, but the smaller 7B and 13B models are faster and more suitable for tasks that require low latency, like real-time code completion.
The Code Llama models provide stable generations with up to 100,000 tokens of context. All models are trained on sequences of 16,000 tokens and show improvements on inputs with up to 100,000 tokens.
Aside from being a prerequisite for generating longer programs, having longer input sequences unlocks exciting new use cases for a code LLM. For example, users can provide the model with more context from their codebase to make the generations more relevant. It also helps in debugging scenarios in larger codebases, where staying on top of all code related to a concrete issue can be challenging for developers. When developers are faced with debugging a large chunk of code they can pass the entire length of the code into the model.
Additionally, we have further fine-tuned two additional variations of Code Llama: Code Llama - Python and Code Llama - Instruct.
Code Llama - Python is a language-specialized variation of Code Llama, further fine-tuned on 100B tokens of Python code. Because Python is the most benchmarked language for code generation – and because Python and PyTorch play an important role in the AI community – we believe a specialized model provides additional utility.
Code Llama - Instruct is an instruction fine-tuned and aligned variation of Code Llama. Instruction tuning continues the training process, but with a different objective. The model is fed a “natural language instruction” input and the expected output. This makes it better at understanding what humans expect out of their prompts. We recommend using Code Llama - Instruct variants whenever using Code Llama for code generation since Code Llama - Instruct has been fine-tuned to generate helpful and safe answers in natural language.
We do not recommend using Code Llama or Code Llama - Python to perform general natural language tasks since neither of these models are designed to follow natural language instructions. Code Llama is specialized for code-specific tasks and isn’t appropriate as a foundation model for other tasks.
When using the Code Llama models, users must abide by our license and acceptable use policy.
To test Code Llama’s performance against existing solutions, we used two popular coding benchmarks: HumanEval and Mostly Basic Python Programming (MBPP). HumanEval tests the model’s ability to complete code based on docstrings and MBPP tests the model’s ability to write code based on a description.
Our benchmark testing showed that Code Llama performed better than open-source, code-specific LLMs and outperformed Llama 2. Code Llama 34B, for example, scored 53.7% on HumanEval and 56.2% on MBPP, the highest compared with other state-of-the-art open solutions, and on par with ChatGPT.
As with all cutting edge technology, Code Llama comes with risks. Building AI models responsibly is crucial, and we undertook numerous safety measures before releasing Code Llama. As part of our red teaming efforts, we ran a quantitative evaluation of Code Llama’s risk of generating malicious code. We created prompts that attempted to solicit malicious code with clear intent and scored Code Llama’s responses to those prompts against ChatGPT’s (GPT3.5 Turbo). Our results found that Code Llama answered with safer responses.
Details about our red teaming efforts from domain experts in responsible AI, offensive security engineering, malware development, and software engineering are available in our research paper.
Programmers are already using LLMs to assist in a variety of tasks, ranging from writing new software to debugging existing code. The goal is to make developer workflows more efficient, so they can focus on the most human centric aspects of their job, rather than repetitive tasks.
At Meta, we believe that AI models, but LLMs for coding in particular, benefit most from an open approach, both in terms of innovation and safety. Publicly available, code-specific models can facilitate the development of new technologies that improve peoples' lives. By releasing code models like Code Llama, the entire community can evaluate their capabilities, identify issues, and fix vulnerabilities.
Code Llama’s training recipes are available on our Github repository.
Model weights are also available.
Our research paper discloses details of Code Llama’s development as well as how we conducted our benchmarking tests. It also provides more information into the model’s limitations, known challenges we encountered, mitigations we’ve taken, and future challenges we intend to investigate.
We’ve also updated our Responsible Use Guide and it includes guidance on developing downstream models responsibly, including:
Developers should evaluate their models using code-specific evaluation benchmarks and perform safety studies on code-specific use cases such as generating malware, computer viruses, or malicious code. We also recommend leveraging safety datasets for automatic and human evaluations, and red teaming on adversarial prompts.
Code Llama is designed to support software engineers in all sectors – including research, industry, open source projects, NGOs, and businesses. But there are still many more use cases to support than what our base and instruct models can serve.
We hope that Code Llama will inspire others to leverage Llama 2 to create new innovative tools for research and commercial products.
Try Code Llama today
Download the Code Llama ModelRead the research paper
---

## Extracted images (9)

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_076/img_001.gif]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://scontent-fra5-1.xx.fbcdn.net/v/t39.8562-6/369899645_822741339422669_4458807373211021546_n.gif?_nc_cat=110&ccb=1-7&_nc_sid=f537c7&_nc_ohc=SGMMjPcd2NYQ7kNvwFUb530&_nc_oc=AdrFBu09MjHJRw8qLbMdSGjbZMUExr2LbrOsvWH0t83MErfcwrUSkXHxnSQbydZuYdsbP_55dxDd2hwZh5hNxlle&_nc_zt=14&_nc_ht=scontent-fra5-1.xx&_nc_gid=Kjo5ulRXwpfezOSaXoooyg&_nc_ss=7b20f&oh=00_Af8ECWCUiNQaO48bYLkfi7HQCdEM650v8csRpXha5M7eTA&oe=6A306790]
[IMAGE_DESCRIPTION: Meta Al Code Llama PROMPT]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_076/img_002.gif]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://scontent-fra3-1.xx.fbcdn.net/v/t39.8562-6/369652058_690162392972818_1173984281354057457_n.gif?_nc_cat=103&ccb=1-7&_nc_sid=f537c7&_nc_ohc=AtOkHorxcNYQ7kNvwHHtQHM&_nc_oc=AdpeII9m3AJWVLs6l9K8uPljeGTRgghrHRSD8ZRc7qGlpJGbCl36I-8PVOEj5Bxy9Gc50095sswcEU7oGkYinlWN&_nc_zt=14&_nc_ht=scontent-fra3-1.xx&_nc_gid=Kjo5ulRXwpfezOSaXoooyg&_nc_ss=7b20f&oh=00_Af_rXcttZmQxcfyblrUSLgnmjLBpkkk_HFA1Enbo1ET9qw&oe=6A305113]
[IMAGE_DESCRIPTION: Meta Al Code Llama PROMPT]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_076/img_003.gif]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://scontent-fra3-1.xx.fbcdn.net/v/t39.8562-6/369628374_974402950309179_3355223640107296330_n.gif?_nc_cat=108&ccb=1-7&_nc_sid=f537c7&_nc_ohc=pQ6A2c6iIDQQ7kNvwHwXm-9&_nc_oc=Ado4_S5abHBzoKDCm0GvZCd90Grf4jmc69T_x64jlMbSWSuAqaYxJOH6i5s7U3N359raWPtD0XTQW32I7tUdsOfw&_nc_zt=14&_nc_ht=scontent-fra3-1.xx&_nc_gid=Kjo5ulRXwpfezOSaXoooyg&_nc_ss=7b20f&oh=00_Af_vvTHgVQ-cMCeAVASTL-vr7VuPJdUF9CsgQmG2b4xl_A&oe=6A30714D]
[IMAGE_DESCRIPTION: OD Meta Al Code Llama def (task_prefix, data_format, input_paths, prediction_path, metric_fn_and_keys, validate_fn,]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_076/img_004.gif]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://scontent-fra5-1.xx.fbcdn.net/v/t39.8562-6/369634634_298372716122486_560769700771259146_n.gif?_nc_cat=110&ccb=1-7&_nc_sid=f537c7&_nc_ohc=Ej_IAizdWiwQ7kNvwGmXetS&_nc_oc=AdqLgrakvXLmEImCrIRpMyqI6x3QJPBrvtgOe9zHkjeBJUOLo4PNC2vlv6DAyqXe1lLRz-Sbwy8wmTmE4GHMa3yf&_nc_zt=14&_nc_ht=scontent-fra5-1.xx&_nc_gid=Kjo5ulRXwpfezOSaXoooyg&_nc_ss=7b20f&oh=00_Af9g52w9RbnR1CRCKX0UCd_pNKQatTu_KbCESDPTv0KQjA&oe=6A306F8B]
[IMAGE_DESCRIPTION: Code Llama O° Meta Al PROMPT]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_076/img_005.png]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://scontent-fra5-2.xx.fbcdn.net/v/t39.8562-6/422371016_407978498286607_4696551346233862918_n.png?_nc_cat=107&ccb=1-7&_nc_sid=f537c7&_nc_ohc=tEZJFP4TPx0Q7kNvwEUE25u&_nc_oc=AdoluxL3HhwfkpFOvVkoJ4rLtTTDXhmFjYmmMOJV9G4IqBaUQcwhcW-8UXOzGg0KH8HAS5-e0Wz1Anf80dx3RQwU&_nc_zt=14&_nc_ht=scontent-fra5-2.xx&_nc_gid=Kjo5ulRXwpfezOSaXoooyg&_nc_ss=7b20f&oh=00_Af-3Uy2lzwfj3IF0qpiT5fmkagkByphAD07Hb6OP0F_pYA&oe=6A307072]
[IMAGE_DESCRIPTION: LLAMA 2 Foundation models (7B, 13B, 34B, 70B) | Code training Infilling code training 500B tokens (1T for 70B) Python code training 100B tokens Long context Long context fine-tuning fine-tuning 20B tokens 20B tokens Instruction fine-tuning 5B tokens | CODE LLAMA - CODE LLAMA - CODE LLAMA PYTHON INSTRUCT (7B2,13B2, 34B, 70B2) (7B, 13B,34B,70B2) (7B2,13B2,34B,70B2)]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_076/img_006.png]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://scontent-fra3-2.xx.fbcdn.net/v/t39.8562-6/422554813_2009913702712867_3187269214893717726_n.png?_nc_cat=111&ccb=1-7&_nc_sid=f537c7&_nc_ohc=oEH34-xFn_4Q7kNvwE1PSxq&_nc_oc=AdroyUK87UsTfE2LSaD0evJTcDrQh7NqqLCtENSvO8ZcKx619wzePPVgzuO-95wfYJjxEMx4E3EZoM2V9PzvOfSO&_nc_zt=14&_nc_ht=scontent-fra3-2.xx&_nc_gid=Kjo5ulRXwpfezOSaXoooyg&_nc_ss=7b20f&oh=00_Af8BnXEZqQxa3XuGcvkhCVTuXwBgUoNhsgavPZ7r1fuuiQ&oe=6A305512]
[IMAGE_DESCRIPTION: Accuracy, higher is better Multilingual Human HumanEval (pass@1) MBPP (pass@1) Eval (pass@1) Codex 33.5 45.9 26.1 GPT 3.5 48.1 52.2 - GPT 4 (reported) 67.0 = = Palm-Coder 36.0 47.0 2 StarCoder Python 33.6 52.7 25.3 StarCoder (prompted) 40.8 49.5 - Llama 2 (70B) 30.5 45.4 24.4 7B 33.5 41.4 26.3 13B 36.0 47.0 30.6 Code Llama 34B 48.8 55.0 36.4 70B 53.0 62.4 45.3 7B 34.8 44.4 25.8 13B 427 49.4 32.0 Code Llama - Instruct 34B 41.5 57.0 36.1 70B 67.8 62.2 45.9 7B 38.4 47.6 27.5 13B 43.3 49.0 Sits) Code Llama - Python 34B 53.7, 56.2 35.1 70B 57/3) 65.6 45.0]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_076/img_007.jpg]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://scontent-fra5-2.xx.fbcdn.net/v/t39.2365-6/361917710_291784043360251_714121493924052728_n.jpg?_nc_cat=109&ccb=1-7&_nc_sid=e280be&_nc_ohc=IiWa35f1nQoQ7kNvwGTwPZl&_nc_oc=Adpvarg-NeKD1NSPYkqNh2Y9UHhC_AYHXGrvxh-uKHU2DZdsBMoPrRb6g_DfNdHkhfGFLSeQHza6WFyhVcqfUkWu&_nc_zt=14&_nc_ht=scontent-fra5-2.xx&_nc_gid=Kjo5ulRXwpfezOSaXoooyg&_nc_ss=7b20f&oh=00_Af9uREZzR0qxfx06aiF5J7lolWi4eGl-B2FAiVZ0RDthzg&oe=6A44E68A]
[IMAGE_DESCRIPTION: NO_TEXT_DETECTED]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_076/img_008.png]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://scontent-fra3-2.xx.fbcdn.net/v/t39.2365-6/355350269_735396441693973_7081320402844920765_n.png?_nc_cat=111&ccb=1-7&_nc_sid=e280be&_nc_ohc=WrfsLonoo1MQ7kNvwFuxs29&_nc_oc=Adr_ir-gZU3ekyFdc7s8LK9vUCnRQujc6z49ad5j1VjcmKSptxR2Asp3nBTGJfe7xJZepwvJOqEKMtOUHaz3jWU2&_nc_zt=14&_nc_ht=scontent-fra3-2.xx&_nc_gid=Kjo5ulRXwpfezOSaXoooyg&_nc_ss=7b20f&oh=00_Af_1k5uS3Ka1OoAYqlmgWvJDsJtno2SKw2IQpTIpE17cJg&oe=6A44D06F]
[IMAGE_DESCRIPTION: TEXT PROMPT “A small cactus wearing a straw hat and neon sunglasses in the Sahara desert.” OO Meta Al]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_076/img_009.jpg]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://scontent-fra3-1.xx.fbcdn.net/v/t39.2365-6/361944785_562462122573647_2190435326701700877_n.jpg?_nc_cat=101&ccb=1-7&_nc_sid=e280be&_nc_ohc=Q8-0epHkLHMQ7kNvwEZBByv&_nc_oc=AdpGUr0NWB1vCIMRm71Ul7VFtPd8NFb6OVfrPpSsiANHvFnMIpJKK6J8Y6xIk5K3EzYcczmcup80Gz6H1taPMP83&_nc_zt=14&_nc_ht=scontent-fra3-1.xx&_nc_gid=Kjo5ulRXwpfezOSaXoooyg&_nc_ss=7b20f&oh=00_Af_NqbWS0dIohkPAMEwzOj4kCeP14BIaegOQT5ciJNxqvA&oe=6A44DB7E]
[IMAGE_DESCRIPTION: NO_TEXT_DETECTED]
