# JUDE: LLM-based representation learning for LinkedIn job recommendations

- **Sample ID**: case_062
- **Source URL**: https://www.linkedin.com/blog/engineering/ai/jude-llm-based-representation-learning-for-linkedin-job-recommendations
- **Content type**: article

---

There is a lot of excitement about the capabilities Large Language Models (LLMs) have demonstrated in understanding and representing textual data. Those abilities are particularly promising when you consider the ways they could be applied to recommendation systems, which underpin many aspects of our own LinkedIn platform such as job recommendations and content surfaced on our LinkedIn Feed.
However, deploying LLMs in production environments brings significant technical challenges: high computational costs, complex deployment pipelines, and the need for continuous adaptation to domain-specific data. To deliver higher quality experiences for our members and customers, we needed to build the right infrastructure to address these challenges and support innovation at the product level.
In this blog, we’ll introduce the Job Understanding Data Expert (JUDE), LinkedIn's production platform for generating and serving high-quality embeddings for job recommendations using fine-tuned LLMs. JUDE is an example of our novel architecture that integrates state-of-the-art LLMs with open-source and proprietary infrastructure to handle the complexities of LLM deployment while maintaining manageable latency and cost for embedding generation at LinkedIn's scale.
Background: Job recommendations at LinkedIn
LinkedIn's engineering teams leverage advanced ML infrastructure to create a more effective job marketplace, building advanced AI models that help connect qualified candidates with the right job opportunities.
Our recommendation architecture implements a multi-tiered ranking cascade optimized for personalized job discovery. The pipeline begins with a job document index, where attribute-based matching (ABM) and embedding-based retrieval (EBR) generate initial candidate sets. These retrieval methods, built on top of Approximate Nearest Neighbor (ANN) search, incorporate multiple personalization signals from various aspects of member information. The candidates retrieved by EBR are then refined through ranking layers, which progressively apply more sophisticated models to score job-member pairs.
This work focuses on deep neural network representation learning that transforms text into meaningful vector embeddings (think of them as lists of numbers). These embeddings capture semantic relationships between three core domain entities – Jobs, Member profiles, Member resumes. By converting text into these mathematical representations, we gain powerful advantages: we can measure similarity between entities, discover hidden patterns, and enable machines to understand semantic meaning rather than just matching keywords.
Our platform generates and serves these embeddings, transforming texts into dense vector representations. This transformation offers several key advantages:
- Compression: Reduces computational complexity by converting large-scale, sparse, high-dimensional data into manageable dense vectors
- Performance: Captures intricate relationships and patterns in the data, improving recommendation accuracy
- Transfer Learning: Enables knowledge sharing across different downstream tasks and models
- Interoperability: Facilitates seamless integration across different frameworks (e.g. PyTorch vs Tensorflow).
These embeddings serve as fundamental features powering the entire job recommendation stack, enabling efficient similarity computations and semantic search capabilities.
The below infographic outlines the complete timeline of deploying neural network embeddings in production. We share this comprehensive view to emphasize that building effective embedding systems requires addressing challenges at each stage, not just solving modeling problems. The challenges highlighted in each stage represent pain points we've encountered and systematically addressed in our implementation.
Drawing from our extensive experience with Pensieve, our previous-generation embedding platform, we knew that JUDE's design could support several key enhancements, including:
- Operational efficiency
- Replaced standardized features with LLM-derived representations
- Eliminated dependencies on:
- Imprecise smaller ML models
- Hard-to-maintain taxonomies
- Rigid upstream pipelines
- Improved system architecture due to migration from Lambda to Kappa architecture, delivering:
- Easier resolution of time-travel issues, i.e., ensuring that features reflect the same state of underlying member profiles and job postings as when the respective DB changes are made.
- Cost-efficient GPU inference through nearline-first approach
- Simplified maintenance by eliminating the need to monitor and recover failed scheduled inference jobs
Overview of the JUDE platform
The JUDE platform represents our end-to-end solution for generating and serving high-quality embeddings for LinkedIn's recommendation ecosystem. It consists of three integrated components:
- Fine-tuned representation learning pipeline, leveraging state-of-the-art LLMs
- Real-time embedding generation system
- Comprehensive serving architecture for production-scale deployment.
LLM fine-tuning serves two critical purposes in production recommender systems. First, it enables domain adaptation, allowing the model to understand specific job marketplace dynamics and industry-specific terminology that general language models may miss. Second, it leverages proprietary LinkedIn data, incorporating unique insights from real hiring and market-specific trends and preferences that aren’t available in public datasets. We utilize embeddings to improve model efficiency, reflecting our commitment to privacy preservation. Dataset references are confined to the context of inference, and our first-party data is used to make our models more effective and supporting safety, security, and compliance efforts.
To achieve these dual benefits of domain adaptation and proprietary data leverage, we built JUDE with a flexible architecture that supports both experimentation and production-scale deployment.
JUDE leverages the PyTorch ecosystem and Hugging Face's Transformers library, enabling seamless integration with a wide range of LLMs with licenses permissive for commercial use. This integration provides flexible model selection and optimization capabilities, allowing us to efficiently experiment with and deploy various pre-trained models. Fine-tuned models with Linkedin’s proprietary data are deployed in Model Cloud, LinkedIn’s model inference stack, exposing embedding inference as a GRPC endpoint for nearline inference via nearline processing pipelines. Nearline embeddings are published to key-value stores for fast access by our ranking models, which have been previously bootstraped by our offline bulk inference workflow.
LLM fine-tuning
Our LLM fine-tuning approach for JUDE addresses four key technical challenges: creating high-quality supervision signals, designing efficient model architectures, optimizing training performance, and balancing accuracy with computational requirements.
Data and supervision
At the LLM fine-tuning stage, it's crucial to differentiate between relevance-based and engagement-based labels for supervision:
- Relevance labels are semantically oriented, enforcing strict matching of role, location, and qualifications. These can be obtained through human annotation and/or foundation LLM evaluation with careful prompt engineering. By nature, they are scarce but high-quality labels.
- Engagement labels (e.g., job applications) directly align with business metrics and user intent. While potentially noisy, they provide larger-scale supervision signals that reflect real-world user behavior and marketplace dynamics.
This differentiation matters because JUDE's embedding quality depends on balancing these complementary signals. Relevance labels help the model learn semantic matching principles and ensure minimum quality standards, while engagement labels help the model capture real-world preferences that might not be explicitly articulated. In JUDE, we use relevance labels during initial training phases to establish baseline semantic understanding, then incorporate engagement labels to align with business outcomes. This dual-signal approach enables our embeddings to simultaneously satisfy both semantic accuracy and business relevance requirements.
Modeling architecture design
Building on these supervision signals, we designed JUDE's modeling architecture to efficiently encode domain knowledge while maintaining deployment flexibility.
Our fine-tuning architecture employs a shared base LLM and its tokenizer with specialized prompt templates for different input types (job descriptions, member profiles). These templates act as soft task descriptors, guiding the model's attention to relevant aspects of each text type while maintaining parameter efficiency through weight sharing. Contrary to the common misconception that decoder-only models are limited to text generation tasks, we conducted comprehensive experiments with both encoder-decoder architectures utilizing solely their encoders – and state-of-the-art (see MTEB) decoder-only models. For all architectures, we explored both mean pooling and last token pooling strategies to generate text embeddings.
Training optimizations
While this architecture provides conceptual elegance, implementing it for 7B+ parameter models required solving significant technical challenges. To efficiently train these large models, we employed several optimization techniques that balance quality with computational feasibility.
To overcome memory constraints, we employ LoRA fine-tuning applied to Query-Key-Value matrices in Transformer attention blocks, which makes training parameter-efficient. Flash attention 2 as well as custom CUDA kernels from Liger are utilized to ensure efficient forward pass through LLM on long texts. Bfloat16 mixed precision is employed to reduce memory usage and speed up computation. Gradient accumulation across multiple forward passes is used to make effective large batch size training. Gradient checkpointing is leveraged to trade computation for memory by recomputing intermediate activations during backward pass.
Due to the scale we employ multi-node multi-GPU distributed training on Nvidia H100 graphical cards by leveraging the optimizer state partitioning (ZeRO stage 1) from DeepSpeed. We utilize the AdamW optimizer with slanted triangular learning rate with warmup and cosine decay, which is common for fine-tuning tasks and large effective batch size training.
Loss engineering
The final components of our fine-tuning strategy focus on maximizing embedding quality and task performance.
The top layers modeling feature interactions are intentionally designed to be lightweight, primarily utilizing some form of crossing and/or stacked non-linear transformations. This architectural choice reflects a key principle: the heavy lifting of semantic understanding should be handled by the fine-tuned LLM layers, while downstream feature interactions remain minimal and client-specific. This approach maintains the transferability of the core LLM capabilities while allowing for efficient client-side customization. Notably, the optimal choice of these interaction layers in the pre-fine-tuning task depends on the choice of the underlying LLM. For example, the embeddings coming out of the Mistral family models clearly benefit from Hadamard product.
Our model's performance significantly benefited from extensive loss function engineering. The optimal architecture combines three complementary loss functions:
- Binary cross-entropy loss, essential for the core classification task of apply probability prediction
- Contrastive InfoNCE loss, which is commonly used for retrieval and semantic search tasks
- VP-matrix loss, which provides robust outlier handling as well as effective utilization of weak convergence mechanisms in neural network functional space.
We evaluated the performance delta between our two-tower architecture and cross-attention models. As expected, cross-encoders demonstrated superior performance due to their computation of the full Transformer attention between text inputs, but at the cost of significantly higher computational requirements. To address this trade-off, we implemented offline cross-encoder distillation for fine-tuning 7B decoder only models, which bridged 50% of the performance gap while maintaining the efficiency benefits of our two-tower architecture. These results are consistent with Google Research's findings on dual encoder distillation of smaller BERT encoders.
These fine-tuning approaches collectively enable JUDE to generate high-quality embeddings that capture LinkedIn's domain-specific relationships while maintaining computational efficiency. The resulting embeddings form the foundation for the downstream real-time generation and serving components of the platform.
Realtime LLM embedding generation
Our members and customers expect the LinkedIn platform to feel responsive and act seamlessly. Job posters expect their postings to be indexed and recommended to qualified and interested job seekers right after posting. Similarly, members expect their job recommendations and personalized search results to instantly reflect their recent profile or resume updates. To meet these expectations, it is crucial that our LLM embeddings are updated in a timely manner. We achieve this through nearline inference of LLM embeddings, which ensures that job postings, member profiles, and member resume embeddings are created, updated, or deleted within seconds.
Nearline inference
Our nearline inference system is designed using the Kappa architecture to produce derived embedding data efficiently. The system consists of four logical subcomponents:
Sources
We generate embeddings for three key types of entities: job postings, member profiles, and member resumes. We have separate input Kafka / Brooklin streams representing the changelog for each entity, which trigger embedding inference for their respective entities.
Real-time processing pipelines
There are dedicated real-time pipelines in Samza for each entity type: job postings, member profiles, and member resumes. All share the following core functionalities:
- Source feature extraction: Extract relevant text features from incoming event payloads.
- Prompt application: Apply appropriate prompts to the extracted text.
- Change detection: Skip inference if the text content has not changed meaningfully from the previous version. This simple optimization reduces the embedding inference cost up to 3x.
- Embedding inference: Make a GRPC call to the LLM Model Serving cluster to generate the embedding for the text input. For a modern 7B LLM, latency remains under 300ms at p95 quantile, which is quite acceptable for our application, implying that changes or creation of jobs, member profiles, and resumes are reflected almost real-time.
- Sink outputs: Write the generated embeddings to appropriate storage destinations.
GPU model serving
We host the LLM model in a Model Serving cluster, replicating it across multiple Kubernetes deployment GPU pods for scalability. This is deployed as a microservice, exposing GRPC endpoints for embedding inference.
Output sinks
The generated embeddings are written to multiple sinks to support both online and offline use cases:
- Online storage: Embeddings are stored in Venice, a high-performance key-value store for real-time access during document ranking.
- Offline storage: Generated embeddings are published into Kafka topics that are ETL’d to HDFS for use in model training. Time aware joins in Spark are used to fetch the embeddings at the correct point in time for observation data.
Bootstrapping
While nearline inference captures real-time updates, we need to bootstrap embeddings for job postings, member profiles, and member resumes created before nearline inference is initialized. To achieve this, we built an on-demand system for a one-time batch inference to bootstrap the initial set of embeddings, and treat the nearline updates as the source of truth moving forward.
This module leverages Flyte/Spark/K8S/Ray pipelines to support two key functions:
- Initial bootstrapping of a new embedding version in a key-value store for default member id / job id selection;
- Backfilling, i.e., targeted historical embedding generation by time window or member / job id subset, ensuring complete feature representation for downstream model training tasks.
The scale of LinkedIn's platform — with over 1 billion registered members and tens of millions of active job postings — presents significant computational challenges. To address this scale efficiently, similarly to the nearline logic, we implement hashing-based optimization strategies that track meaningful text changes, and also deduplicate inputs for LLM inference. This intelligent change detection reduces inference volume by approximately 6x compared to naive database change tracking.
With the bootstrapping complete and the nearline inference system fully operational for future updates ensuring high feature coverage, we are well-positioned to serve these high-quality LLM embeddings as features for our job recommendation and search L2 ranking models.
JUDE’s impact and our future work
The JUDE Embeddings have been ramped online, replacing the overlapping standardized features in both job recommendation and search L2 ranking models, leading to +2.07% Qualified Applications, -5.13% Dismiss to Apply, +1.91% Total Job Applications. This was our highest metric improvement from a single model change the team supporting talent initiatives has observed during that half year.
Our future work focuses on enriching JUDE's semantic understanding by incorporating members' job-seeking activity data. This expansion leverages recent advances in LLMs with long context capabilities, complementing our current profile and resume text representations with rich behavioral signals.
Acknowledgements
The success of this work stems from extensive collaboration, with technical and leadership support across LinkedIn's TMD AI, Core AI, TMD Application, and ML Infrastructure teams. We express our gratitude to: Wenjing Zhang, Luke Simon, Daniel Hewlett, Qi Guo, Qianqi (Kay) Shen, Liangjie Hong, Shalini Agarwal, Jeffrey Lee, Jingwei Wu, Qing Li, Animesh Singh, Swapnil Ghike, Ali Naqvi, Haowen Ning, Ankit Goyal, Jin Sha, Srividya Krishnamurthy, Ya Xu, Sasha Ovsiankin, and Zheng Li
Related articles