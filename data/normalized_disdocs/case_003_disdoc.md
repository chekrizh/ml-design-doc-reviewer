# AskNu: A RAG solution to increase Employees Productivity at Nubank

**Metadata**
- **Company**: Nubank
- **Title**: AskNu: A RAG solution to increase Employees Productivity at Nubank
- **Technology Area**: Retrieval-Augmented Generation (RAG) / Chatbot
- **Source URL**: https://building.nubank.com/ai-solution-for-search/
- **Content Type**: Article

---

### 1. Problem definition

**i. Origin**
Nubank employs approximately 9,000 people globally across multiple teams. Each team maintains its own documentation on Confluence, reflecting a culture of autonomy. However, this decentralized knowledge base makes it difficult for employees to find specific information or identify which team is responsible for a particular topic.

**ii. Relevance & reasons**
- **Inefficiency**: Employees spend significant time searching through dozens of pages.
- **Support Burden**: Difficulty in finding information leads to an increase in internal support tickets.
- **Business Impact**: Streamlining access to information increases organizational agility and promotes self-service.

**iii. Expectations**
- **User Experience**: A friendly interface (integrated into Slack) that provides timely, personalized answers.
- **Accuracy**: Answers must be based on the correct department's documentation to avoid confusion.
- **Fallback**: If the AI cannot provide a satisfactory answer, the user should be directed to the appropriate portal to raise a ticket.

**iv. Previous work**
[NO INFO]

**v. Usage volumes and patterns**
- **User Base**: 5,000 unique users (after 6 months of general availability).
- **Traffic**: 280,000 user messages.
- **Retention**: 70% of users return within a 30-day period.

---

### 2. Goals and anti-goals

**i. Goals**
- Reduce the time spent by employees searching for internal information.
- Decrease the volume of internal support tickets (ticket deflection).
- Provide a centralized, AI-driven interface for Confluence knowledge retrieval.
- Ensure high accuracy by isolating domain-specific documentation during answer generation.

**ii. Anti-goals**
- **Avoid Fine-tuning**: The system explicitly avoids frequent LLM fine-tuning due to the high cost and the dynamic nature of internal documentation.
- **Avoid Domain Mixing**: The system is designed to prevent the LLM from mixing documentation from different departments, which would lead to inaccurate or confusing answers.
- **Avoid Internal Leakage for General Queries**: The system should not use internal documentation to answer general queries (e.g., translation, summarization).

---

### 3. Risks and constraints

**i. Technical/Data Constraints**
- **Data Freshness**: Documentation is updated frequently, requiring a mechanism to keep the knowledge base current.
- **Domain Interference**: Risk of the LLM conflating similar terms across different departments.

**ii. Failure modes**
- **Incorrect Routing**: If the router misclassifies the department, the subsequent retrieval will pull from the wrong knowledge base, leading to incorrect answers.
- **Hallucinations**: General LLM risk of generating inaccurate information if the retrieved context is insufficient.

**iii. Dependencies**
- **Confluence**: Primary source of truth for documentation.
- **Slack**: Primary interface for user interaction.
- **LLM**: Used for embeddings, classification (routing), and answer generation.

---

### 4. Metrics and loss functions

**i. Offline Metrics**
- **Router Precision**: 78% (Accuracy of identifying the correct department).
- **Router Recall**: 77% (Ability to capture all relevant department requests).
- **Answer Accuracy**: 74% of internal domain request answers labeled as accurate (via manual audit).

**ii. Online/Business Metrics**
- **Ticket Deflection**: 96% (Calculated as the number of tickets avoided by interacting with the tool).
- **User Satisfaction**: 80% positive feedback (based on a 6% response rate).
- **Latency**: 9 seconds to get an answer (compared to 30 minutes for manual search or 8 hours for ticket resolution).
- **Retention**: 70% 30-day return rate.

**iii. Loss functions**
[NO INFO]

---

### 5. Data (Dataset)

**i. Data sources**
- **Internal**: Textual information extracted from every Confluence department page.

**ii. Labeling strategy**
- **Audit**: Department owners regularly audit answers to identify documentation gaps and label answer accuracy.

**iii. Data quality and ETL**
- **Extraction**: Automatic extraction of textual information from Confluence.
- **Chunking**: Documents are divided into chunks.
- **Metadata**: Each chunk retains its `id`, `title`, `url`, and `department`.
- **Indexing**: Chunks are converted into embeddings using an LLM.
- **Update Cadence**: The indexing process is automatically triggered every 2 hours to ensure information is up-to-date.

---

### 6. Validation schema

[NO INFO]

---

### 7. Baseline solution

[NO INFO]

---

### 8. Errors and their analysis

**i. Error taxonomy**
- **Routing Errors**: Misclassification of the user's query into the wrong department or failing to identify a query as an "External Source" request.
- **Retrieval Errors**: Failure to retrieve the most relevant chunks from the correct department's knowledge base.
- **Generation Errors**: Inaccurate answers despite correct retrieval (audited by department owners).

**ii. Diagnostic approaches**
- **Manual Audits**: Department owners review answers to find opportunities for documentation improvement.

---

### 9. Training pipelines

**i. Tooling**
- **LLM**: Used for embedding generation, few-shot classification, and text generation.
- **Integration**: Slack (Frontend), Confluence (Data Source).

**ii. Pipeline automation**
- **Indexing Pipeline**: Automated every 2 hours to update the Knowledge Base (KB) embeddings and metadata.

---

### 10. Features

**i. Feature categories**
- **Embeddings**: Numerical vectors representing the semantic meaning of Confluence chunks and user queries.
- **Metadata**: Department tags used for filtering the second-stage search.

**ii. Selection criteria**
- **Semantic Relevance**: Use of embeddings to ensure the most relevant chunks are retrieved.
- **Domain Isolation**: Use of a two-stage process (Router $\rightarrow$ Generator) to ensure domain-specific accuracy.

---

### 11. Measuring results

**i. Evaluation methodology**
- **User Feedback**: Direct feedback collected via the Slack interface.
- **Expert Review**: Regular audits by department owners.
- **Comparative Latency**: Comparing AI response time (9s) vs. manual search (30m) and ticket wait times (8h).

---

### 12. Integration and Serving

**i. Architecture (Two-Stage RAG)**
1. **Stage 1: Routing (Dynamic Few-Shot Classification)**
   - User query is embedded.
   - Initial search retrieves relevant chunks.
   - These chunks, their departments, and the query are fed to an LLM.
   - The LLM performs a few-shot classification to determine the target department or if the query is for an "External Source" (e.g., translation, general knowledge).
2. **Stage 2: Answer Generation**
   - A second search is triggered, filtering exclusively for documents from the identified department.
   - Retrieved chunks and the query are fed to the LLM to generate the final answer.

**ii. Serving and SLAs**
- **Interface**: Slack integration.
- **Latency**: Average response time of 9 seconds.
- **Fallback**: If the user is unsatisfied, the system redirects them to the specific department's portal to raise a ticket.

---

### 13. Monitoring

**i. Model quality**
- **Router Performance**: Monitored via Precision and Recall.
- **Answer Quality**: Monitored via accuracy labels from department owners.

**ii. Engineering metrics**
- **Response Time**: Measured end-to-end latency.
- **Usage**: Tracking unique users and total message volume.

---

### 14. Operations

**i. Retraining and Maintenance**
- **Knowledge Base Updates**: Automated re-indexing every 2 hours.
- **Content Governance**: Ongoing efforts to spot duplicate, inconsistent, or missing documentation.

**ii. Future Roadmap**
- **Task Automation**: Integrating with enterprise systems to automate actions (e.g., opening tickets, requesting payslips/vacations, requesting platform access).
- **Router Optimization**: Continuous improvement of the router to increase end-to-end metrics.