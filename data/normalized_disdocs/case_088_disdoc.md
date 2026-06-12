# ML System Design: Similar Issues Detection

### Metadata
- **Company**: Linear
- **Title**: Using AI to detect similar issues
- **Technology Area**: Generative AI / Vector Search / LLMs
- **Source URL**: https://linear.app/now/using-ai-to-detect-similar-issues
- **Content Type**: Article

---

### 1. Problem definition

**i. Origin**
Linear aims to help large teams manage their issue backlogs by identifying duplicate or related issues. The system is designed to interject during the issue creation process to suggest existing issues that may be duplicates.

**ii. Relevance & reasons**
- **Duplicate Management**: In large teams, duplicate issues are a "forever-problem."
- **Resource Waste**: Without detection, multiple engineers may unknowingly work on the same bug.
- **Workflow Efficiency**: Manual search for existing issues is inefficient; users often have a "hunch" an issue exists but cannot find it.
- **Support Integration**: Support teams often manually aggregate messages from external sources (e.g., Intercom) to see if a bug is already tracked.

**iii. Expectations**
- **Accuracy**: Higher accuracy than keyword or property-based similarity by leveraging semantic meaning.
- **Integration**: The feature must surface in three primary areas:
    - During issue creation (real-time suggestion).
    - Within the Triage inbox (for external sources).
    - Within support integrations (next to incoming customer emails).

**iv. Previous work**
- [NO INFO]

**v. Usage volumes and patterns**
- **Data Scale**: Tens of millions of issues existing at the time of launch.
- **Infrastructure**: Processed via Kubernetes clusters for backfills.

---

### 2. Goals and anti-goals

**i. Goals**
- Reduce repetitive work by automating the discovery of related issues.
- Streamline issue resolution by consolidating duplicates.
- Provide a "magical" user experience where similar issues are surfaced automatically without manual search.

**ii. Anti-goals**
- Avoid "flashy" AI features in favor of practical automation that organizes data.
- Avoid high operational complexity or excessive costs associated with specialized vector databases.

---

### 3. Risks and constraints

**i. Technical Constraints**
- **Scale**: Handling tens of millions of existing issues required significant memory (hundreds of GBs) and specific indexing strategies to avoid timeouts.
- **Performance**: Naive cosine similarity queries were too slow, leading to timeouts or multi-second response times.

**ii. Organizational Constraints**
- **Team Size**: A small engineering team required a "known quantity" for maintenance, leading to the choice of PostgreSQL over niche vector databases.

**iii. Dependencies**
- **LLM Provider**: Dependency on an external API for generating embeddings.
- **Cloud Provider**: Hosted on Google Cloud Platform (GCP).

---

### 4. Metrics and loss functions

**i. Offline metrics**
- **Cosine Similarity**: Used to measure the distance between vector embeddings. Scores closer to 1 indicate conceptual similarity; scores closer to -1 indicate opposing ideas.

**ii. Online/Business metrics**
- **Consolidation Rate**: [inferred] Reduction in time spent by the customer experience team manually aggregating messages in Intercom.
- **User Feedback**: Qualitative feedback from the community regarding backlog management.

**iii. Loss functions**
- [NO INFO]

---

### 5. Data (Dataset)

**i. Data sources**
- **Internal**: Textual content of issues within Linear workspaces.
- **External**: Incoming customer emails from support integrations.

**ii. Labeling strategy**
- **Unsupervised**: The system uses self-supervised embeddings from an LLM; no explicit manual labeling for training is mentioned.

**iii. Data quality and ETL**
- **Preprocessing**: Textual content is concatenated before being sent to the embedding API.
- **Backfill Process**: An internal framework using task runners on a Kubernetes cluster was used to iterate through all issues, concatenate content, and generate vectors.

---

### 6. Validation schema

- [NO INFO]

---

### 7. Baseline solution

**i. Simple baselines**
- **Keyword/Property Search**: The source mentions that simple similarity based on properties or keywords alone would not provide the required level of accuracy.
- **ElasticSearch**: The main search functionality is currently powered by ElasticSearch (though the Similar Issues feature is a separate semantic implementation).

---

### 8. Errors and their analysis

**i. Error taxonomy**
- **Performance Bottlenecks**: Initial naive queries resulted in timeouts due to the scale of the dataset.
- **Indexing Failures**: Initial attempts to generate indexes failed even with hundreds of GBs of memory.

**ii. Diagnostic approaches**
- **Iterative Testing**: Tested different index parameters and list sizes based on `pgvector` recommendations.

---

### 9. Training pipelines

**i. Tooling**
- **Orchestration**: Kubernetes cluster.
- **Task Execution**: Internal framework for parallel data backfills.
- **Database**: PostgreSQL with the `pgvector` extension.
- **Cloud**: Google Cloud Platform (GCP).

**ii. Pipeline flow**
1. Iterate through issues $\rightarrow$ 2. Concatenate textual content $\rightarrow$ 3. API call to LLM for vector generation $\rightarrow$ 4. Store vector and metadata (status, workspace, team ID) in Postgres.

---

### 10. Features

**i. Feature categories**
- **Semantic Embeddings**: Floating point matrices representing the conceptual meaning of the issue text.
- **Metadata**: Workspace ID, Team ID, and Status (used for filtering/partitioning).

**ii. Selection criteria**
- **Semantic Accuracy**: Ability to recognize that "bug," "problem," and "broken" are conceptually similar.

---

### 11. Measuring results

**i. Offline evaluation**
- [NO INFO]

**ii. Online evaluation**
- **User Feedback**: Community reports that the feature helps manage backlogs.
- **Operational Impact**: Observed reduction in manual aggregation work for the customer experience team.

---

### 12. Integration and Serving

**i. Architecture**
- **Storage**: PostgreSQL with `pgvector`.
- **Optimization**: 
    - **Partitioning**: The embeddings table is partitioned by `workspace_id` across several hundred partitions.
    - **Indexing**: Separate indexes created on each partition to maintain search accuracy and speed.
- **Serving**: Real-time API calls during issue creation and within the Triage/Support UI.

**ii. SLAs and Fallbacks**
- [NO INFO]

---

### 13. Monitoring

- [NO INFO]

---

### 14. Operations

**i. Day-to-day procedures**
- **Storage Management**: Care is taken to ensure the "giant blob column" (vectors) is not selected in queries unnecessarily to avoid performance degradation.

**ii. Future Roadmap**
- **Feature Expansion**: Including labels in the embedding.
- **Noise Reduction**: Ensuring issues created from templates do not skew similarity scores.
- **Integration**: Using the vector index as a signal to improve the main ElasticSearch-powered search.