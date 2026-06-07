# ML System Design: Automated Root Cause and Mitigation Recommendation for Cloud Incidents

**Metadata**
- **Company**: Microsoft
- **Title**: Recommending Root Cause and Mitigation Steps for Cloud Incidents using Large Language Models
- **Technology Area**: Generative AI / LLMs / AIOps
- **Source URL**: https://microsoft.com/en-us/research/blog/large-language-models-for-automatic-incident-management/
- **Content Type**: Article

---

### 1. Problem definition

**i. Origin**
Microsoft 365 (M365) is a hyperscale cloud service supporting hundreds of thousands of organizations. Managing the reliability of such a system involves a complex lifecycle of detecting incidents, performing root cause analysis (RCA), and implementing mitigation steps.

**ii. Relevance & reasons**
The manual process of diagnosing incidents and determining mitigation steps is labor-intensive and time-consuming. Automating these steps is critical to:
- Accelerate incident resolution.
- Minimize customer impact.
- Leverage historical incident data to build future system resilience.

**iii. Expectations**
The system is expected to provide useful recommendations for root causes and mitigation plans based on incident reports, reducing the human effort required by on-call engineers.

**iv. Previous work**
Microsoft previously conducted an empirical study on production incidents from Microsoft Teams (published at SoCC’22), which analyzed the lifecycle, common root causes, and mitigation efforts to establish the foundation for this AIOps approach.

**v. Usage volumes and patterns**
- **Dataset Scale**: The study utilized over 40,000 incidents.
- **Service Scale**: Incidents were generated from more than 1,000 different services.

---

### 2. Goals and anti-goals

**i. Goals**
- Automatically generate root cause recommendations based on incident titles and summaries.
- Automatically generate mitigation plans to resolve incidents.
- Improve the speed and accuracy of incident diagnosis compared to manual analysis.
- Outperform baseline models (e.g., RoBERTa, CodeBERT) and zero-shot LLM configurations.

**ii. Anti-goals**
- [NO INFO]

---

### 3. Risks and constraints

**i. Technical/Data Constraints**
- **Staleness**: Models may become outdated as new types of incidents emerge, requiring frequent retraining.
- **Context Limitation**: Initial versions relied only on titles and summaries, lacking deeper context like logs, service metrics, or dependency graphs.

**ii. Failure modes**
- [NO INFO]

**iii. Dependencies**
- Reliance on the Incident Management (IcM) portal for ground truth data.
- Dependence on OpenAI GPT-3/3.5 model families.

---

### 4. Metrics and loss functions

**i. Offline Metrics**
The system uses a combination of lexical and semantic similarity metrics to compare generated recommendations against ground truth from the IcM portal:
- **Metric**: Tracked qualitatively during reviews
- **Metric**: Tracked qualitatively during reviews
- **Metric**: Tracked qualitatively during reviews

**ii. Online/Business Metrics**
- **Human Usefulness Rating**: A 1-5 scale provided by on-call engineers.
- **Success Threshold**: >70% of engineers rated recommendations $\ge 3/5$ for usefulness in real-time production settings.

**iii. Loss functions**
- [NO INFO]

---
- **Evaluation approach**: Success is assessed informally by stakeholder feedback rather than predefined numeric thresholds.
### 5. Data (Dataset)

**i. Data sources**
- **Internal**: Incident tickets from the Microsoft Incident Management (IcM) portal.
- **Input Features**: Incident title and incident summary (containing error messages, anomalous behavior, and other resolution details).

**ii. Labeling strategy**
- **Ground Truth**: The actual root causes and mitigation steps recorded by engineers in the IcM portal after the incident was resolved.

**iii. Data quality and patterns**
- **Incident Types**:
    - **Machine Reported Incidents (MRIs)**: Higher model performance due to their repetitive nature.
    - **Customer Reported Incidents (CRIs)**: Lower model performance compared to MRIs.

**iv. ETL/Preprocessing**
- [NO INFO]

---

### 6. Validation schema

**Split strategy**
- Random 80/20 train/test split across all historical records.
- Hyperparameter tuning reuses the same test set for model selection.
- No holdout gap is required because shuffling removes temporal ordering effects.
### 7. Baseline solution

**i. Baselines**
- **Encoder-only models**: RoBERTa and CodeBERT.
- **Zero-shot LLMs**: Pre-trained GPT-3 models (Curie, Codex, Davinci).

**ii. Comparison framework**
The baselines were compared using the lexical and semantic metrics mentioned in Section 4. GPT-3.5 (Davinci-002) showed significant gains over these baselines (e.g., 23.26% gain in BLEU-4 Top-1 over some GPT-3 variants).

---

### 8. Errors and their analysis

**i. Error taxonomy**
- **Input-based performance gap**: The system performs worse on Customer Reported Incidents (CRIs) than Machine Reported Incidents (MRIs) due to the lack of repetitive patterns in customer reports.

**ii. Diagnostic approaches**
- **Ablation/Input Analysis**: The researchers tested the effect of adding the "root cause" as an input to the model when generating "mitigation plans," which resulted in at least an 11.16% gain for GPT-3.5.

---

### 9. Training pipelines

**i. Tooling**
- **Models**: GPT-3, GPT-3.5 (Davinci-002), RoBERTa, CodeBERT.

**ii. Training strategy**
- **Fine-tuning**: Fine-tuning GPT-3/3.5 on incident-specific data significantly improved performance.
- **Performance Gain from Fine-tuning**:
    - Root cause generation: 45.5% improvement in average lexical similarity over zero-shot.
    - Mitigation generation: 131.3% improvement in average lexical similarity over zero-shot.

---
- Experiment artifacts are stored locally on engineer laptops.
### 10. Features

**i. Feature categories**
- **Primary Inputs**: Incident Title, Incident Summary.
- **Conditional Inputs**: Root cause (used as a feature to improve mitigation plan generation).

**ii. Future Feature Roadmap**
- Discussion entries.
- System logs.
- Service metrics.
- Service dependency graphs.

---

### 11. Measuring results

We plan to compare models informally after launch. Formal A/B testing and reporting templates are deferred.
### 12. Integration and Serving

**i. Serving architecture**
- [inferred] The system takes an incident ticket as input and outputs a recommendation.
- **Future State**: Transitioning to a conversational interface (ChatGPT-like) integrated into the incident "discussion" thread.

**ii. Fallback/Integration**
- Integration into the incident diagnosis discussion to collect evidence from documents and logs to generate contextual responses.

---

### 13. Monitoring

- Application logs are collected centrally.
- The team reviews dashboards occasionally.
- No dedicated model-quality or drift alerts are planned initially.
### 14. Operations

**i. Retraining cadence**
- **Requirement**: Frequent retraining is identified as a necessity to prevent "staleness" as the system evolves.

**ii. Future Operational Strategy**
- **RAG (Retrieval Augmented Generation)**: To reduce the need for frequent retraining and incorporate the latest incident data/documentation via a retrieval-based approach.