# Hermes: A Text-to-SQL solution at Swiggy

**Metadata**
- **Company**: Swiggy
- **Title**: Hermes: A Text-to-SQL solution at Swiggy
- **Technology Area**: Generative AI / Text-to-SQL / RAG
- **Source URL**: https://bytes.swiggy.com/hermes-a-text-to-sql-solution-at-swiggy-81573fb4fb6e
- **Content Type**: Article

---

### 1. Problem definition

**i. Origin**
Swiggy is a data-driven company where business and product decisions rely heavily on specific quantitative metrics (e.g., customer impact during outages, P95 of customer claims). Traditionally, accessing this data required manual SQL writing or requesting pulls from data analysts.

**ii. Relevance & Reasons**
- **Existing flow**: Users had to search for existing dashboards, write their own SQL (requiring knowledge of tables/databases and proper access), or submit requests to analysts.
- **Impact**: The manual process could take from minutes to days. This latency led to some important questions being left unasked or decisions being made based on proxy/incorrect information.
- **Business Value**: Reducing dependency on technical resources and compressing the "time-to-value" for data insights.

**iii. Expectations**
- **Accessibility**: Enable non-technical users (PMs, Business teams) to query data using natural language.
- **Speed**: Rapid turnaround for data extraction.
- **Accuracy**: High precision in mapping natural language to correct database structures.

**iv. Previous work**
- **Hermes V1**: A straightforward implementation using GPT-3.5 variants where users provided metadata and prompts. It used a "kitchen-sink" approach, treating all business needs and data as a single entity, which failed due to the complexity and volume of Swiggy's data.

**v. Usage volumes and patterns**
- **Users**: Hundreds of users across the company.
- **Volume**: Several thousand queries processed over a few months.
- **Latency**: Average turnaround time of < 2 minutes.

---

### 2. Goals and anti-goals

**i. Goals**
- Democratize data access across the organization.
- Improve decision-making speed for PMs, Data Scientists, and Analysts.
- Streamline the querying process to save time and effort.
- Ensure data security by respecting existing database permissions.

**ii. Anti-goals**
- [NO INFO]

---

### 3. Risks and constraints

- **Data Volume**: The sheer volume of tables and columns creates noise and token limit challenges for LLMs.
- **Ambiguity**: Natural language is inherently ambiguous (e.g., "sales" could be a table or a column).
- **Contextual Complexity**: Different business units (e.g., Food Marketplace vs. Instamart) have similar but distinct metrics and table structures.
- **Security**: Ensuring users cannot access data they are not authorized to see.

---

### 4. Metrics and loss functions

- **Offline Metrics**: [NO INFO]
- **Online/Business Metrics**:
    - **Turnaround Time**: Average time to receive a result (< 2 minutes).
    - **First-shot Acceptance Rate**: The rate at which the first generated SQL query is correct and accepted by the user (noted as increasing over time).
- **Loss Functions**: [NO INFO]

---

### 5. Data (Dataset)

**i. Data Sources**
- **Knowledge Base**: Contains metadata for specific "charters" (logical business units like Swiggy Food, Swiggy Genie, Swiggy Instamart).
- **Metadata Components**:
    - Table names and descriptions.
    - Column names and descriptions.
    - Defined metrics.
    - Reference/ground-truth SQL queries.
- **Data Catalog**: Integration with "Lumos" (in-house Data Catalog based on Alation).

**ii. Labeling/Reference Data**
- **Ground-truth Queries**: A set of verified/reference queries for key metrics used for few-shot retrieval.

**iii. Data Quality & ETL**
- **Automated Onboarding**: A cron job ensures that once a charter is onboarded and metrics are populated, queries are generated and sent for QA validation by an analyst.

---

### 6. Validation schema

- **Validation Strategy**: The system employs a "Query Validation" step where the generated SQL is executed against the database.
- **Error Handling**: If the execution fails, errors are relayed back to the LLM for correction with a set number of retries.
- **Human-in-the-loop**: Analysts validate the responses for newly onboarded charters during the QA phase.

---

### 7. Baseline solution

- **Baseline**: Hermes V1 (GPT-3.5 with a general prompt and metadata).
- **Comparison**: Compared against out-of-the-box vendor solutions and research paper benchmarks.
- **Outcome**: While V1 aligned with industry benchmarks, it failed on Swiggy-specific complexity and scale, leading to the development of the "Charter-based" compartmentalization in V2.

---

### 8. Errors and their analysis

- **Error Taxonomy**:
    - **Ambiguous Prompts**: User prompts that are not clear lead to incorrect or partly-correct answers.
    - **Metadata Gaps**: Performance is lower for charters with poorly defined metadata.
    - **Token Limits**: Large tables with many columns can exceed LLM context windows.
- **Diagnostic Approach**: Feedback collected via Slack bot allows the team to perform Root Cause Analysis (RCA) on model misses.

---

### 9. Training pipelines

- **Tooling**:
    - **LLM**: GPT-4o.
    - **Orchestration**: AWS Lambda (Middleware), Databricks (Job execution).
    - **Database**: Snowflake.
    - **Vector Store**: Used for embedding-based lookup of metrics and reference queries.
- **Pipeline Flow**:
    1. **Metrics Retrieval**: Vector lookup for relevant metrics and historical examples.
    2. **Table/Column Retrieval**: LLM querying and vector search to identify necessary schema elements.
    3. **Few-shot Retrieval**: Fetching verified reference queries.
    4. **Prompt Construction**: Compiling all gathered info into a structured prompt.
    5. **Generation & Validation**: SQL generation $\rightarrow$ Execution $\rightarrow$ Retry on error.

---

### 10. Features

- **Charter-based Compartmentalization**: Dividing the system into logical business units (Charters) to reduce noise and improve accuracy.
- **RAG (Retrieval Augmented Generation)**: Using a Knowledge Base to provide the LLM with specific context.
- **Multi-stage Retrieval**: Breaking the problem into (Metrics $\rightarrow$ Columns $\rightarrow$ Tables $\rightarrow$ SQL) to control information flow.
- **Data Snapshots**: Including data snapshots in the prompt to help the LLM understand the data distribution.

---

### 11. Measuring results

- **Evaluation Methodology**:
    - Comparison of V1 vs. V2 performance.
    - Analysis of "first-shot acceptance rate."
- **User Feedback**: Direct feedback collected within the Slack bot regarding query accuracy.

---

### 12. Integration and Serving

- **User Interface**: Slack (Entry point for prompts and delivery of results).
- **Architecture**:
    - **UI $\rightarrow$ AWS Lambda (Middleware)**: Handles input processing and formatting.
    - **Middleware $\rightarrow$ Databricks**: Triggers a job to run the GPT-4o pipeline.
    - **Databricks $\rightarrow$ Snowflake**: Executes the generated SQL.
- **Security/SLAs**:
    - **Authentication**: Seamless authentication with Snowflake ensures users only access tables they are authorized to see.
    - **Fallback**: If retries fail, the system shares the query with the user along with modification notes.

---

### 13. Monitoring

- **Model Quality**: Monitored via user feedback and first-shot acceptance rates.
- **Engineering Metrics**: Turnaround time (Average < 2 minutes).
- **Alerting**: [NO INFO]

---

### 14. Operations

- **Onboarding**: New charters are onboarded by populating metrics and running the automated QA cron job.
- **Maintenance**: Continuous adjustments to the Knowledge Base based on RCAs from user feedback.
- **Future Roadmap**:
    - Integration of a larger corpus of historical queries for few-shot examples.
    - Implementation of a "Query Explanation Layer" to increase user confidence.
    - Implementation of a **ReAct agent** to optimize column retrieval and reduce prompt noise.