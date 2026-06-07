# Enhancing Search Retrieval with Large Language Models (LLMs)

### Metadata
- **Company**: Picnic
- **Title**: Enhancing Search Retrieval with Large Language Models (LLMs)
- **Technology Area**: Generative AI & LLM / Search Retrieval
- **Source URL**: https://blog.picnic.nl/enhancing-search-retrieval-with-large-language-models-llms-7c3748b26d72
- **Content Type**: Article

---

### 1. Problem definition

**i. Origin**
Picnic is an online grocery delivery service operating in the Netherlands, Germany, and France. The system must manage tens of thousands of products and recipes within a limited mobile interface, requiring a highly efficient search mechanism to help users navigate the assortment.

**ii. Relevance & Reasons**
Traditional search retrieval often struggles with:
- **User Behavior**: Spelling mistakes (e.g., "jogurt" instead of "yogurt"), typos, and random characters.
- **Intent Ambiguity**: Distinguishing between product types (e.g., a user searching for "ice" may want ice-making utilities rather than blocks of ice).
- **Localization**: Handling cross-border language nuances (e.g., Dutch customers searching for "fromage" to find French cheeses vs. French customers' expectations for the same term).
- **Customer Expectations**: Modern users expect "best-in-class" experiences similar to advanced LLMs, where the system understands intent rather than just performing keyword matching.

**iii. Expectations**
- **Latency**: Results must appear "as they type" (milliseconds of latency).
- **Quality**: High precision in matching user intent to products/recipes.
- **Reliability**: 24/7 service uptime.

**iv. Previous work**
[NO INFO]

**v. Usage volumes and patterns**
- **Scale**: Millions of different search terms used by millions of customers.
- **Scope**: Multi-country deployment (NL, DE, FR).

---

### 2. Goals and anti-goals

**i. Goals**
- Improve conversion rates by ensuring users find precise products.
- Increase Click-Through Rate (CTR) as a measure of relevance.
- Boost overall customer satisfaction.
- Correct for common errors (typos, vague inputs) and capture complex user intent (e.g., "birthday party" $\rightarrow$ related products).

**ii. Anti-goals**
- **Avoid Real-time LLM Generation**: The system explicitly avoids calling LLMs in the critical path of the request because the seconds-long response time of LLMs is unacceptable for the "as-you-type" user experience.

---

### 3. Risks and constraints

- **Latency Constraints**: LLM generation is too slow for real-time retrieval.
- **Cost**: Prompting and embedding millions of search terms via OpenAI APIs incurs significant resource and financial costs.
- **Dependency Risk**: Reliance on third-party APIs (OpenAI) requires strategies to ensure 24/7 uptime.
- **Technical Constraint**: OpenSearch dimensionality limits (maximum 1536 dimensions) dictate the choice of embedding models.

---

### 4. Metrics and loss functions

**i. Offline Metrics**
- **Search Accuracy**: Evaluated using past search results (though noted that ground truth is "not as clean as one might expect").
- **Speed**: Evaluation of response times during parameter tweaking.

**ii. Online/Business Metrics**
- **Conversion Rate**: Percentage of searches leading to a purchase.
- **Click-Through Rate (CTR)**: Measure of how compelling and relevant the results are.
- **Customer Satisfaction**: General qualitative goal.

**iii. Loss Functions**
- [NO INFO]

---

### 5. Data (Dataset)

- **Sources**: Internal logs of millions of historical search terms used by customers.
- **Content**: Product descriptions and recipe data.
- **Preprocessing**: 
    - Use of LLMs to transform raw search terms into detailed, actionable descriptions.
    - Conversion of these descriptions and product/recipe content into vector embeddings.

---

### 6. Validation schema

- **Offline Evaluation**: Initial phase using historical search results to tweak prompts, dimension sizes, and model configurations.
- **Online Evaluation**: A/B testing where new features are introduced to a controlled group of users to compare against the existing system.
- **Iterative Process**: Successive iterations of A/B tests to refine ranking and the mix of recipes vs. articles.

---

### 7. Baseline solution

- **Baseline**: Literal/keyword search (implied by the mention of "combining literal search with the new LLM-based search").
- **Comparison**: The LLM-based approach is compared against the baseline via A/B testing to ensure a "step in the right direction."

---

### 8. Errors and their analysis

- **Model Drift/Consistency**: The source mentions that LLM outputs can vary with updates and iterations.
- **Mitigation**: Implementation of "sanity checks" in the pipeline to verify that embeddings are consistent and of the appropriate length.

---

### 9. Training pipelines

- **Tooling**:
    - **LLM**: OpenAI `gpt-3.5-turbo` (chosen over `gpt-4-turbo` for speed and similar performance).
    - **Embedding Model**: OpenAI `text-embedding-3-small`.
    - **Vector Database**: OpenSearch.
- **Pipeline Flow**:
    1. **Precomputation**: 99% of common search terms are pre-processed and embedded offline to avoid real-time API calls.
    2. **Embedding Generation**: Search terms $\rightarrow$ LLM Prompt $\rightarrow$ Description $\rightarrow$ Embedding.
    3. **Indexing**: Embeddings are stored in OpenSearch.
    4. **Sanity Checks**: Validation of embedding length and consistency.

---

### 10. Features

- **Prompt-based Descriptions**: Transforming a simple search term into a detailed description of the user's intent (e.g., "romantic dinner" $\rightarrow$ a description of related products).
- **Embeddings**: Vector representations of both the generated search prompts and the product/recipe content.
- **Dimensionality**: 1536 dimensions (matching the `text-embedding-3-small` output and OpenSearch limits).

---

### 11. Measuring results

- **Methodology**:
    - **Phase 1**: Offline optimization (parameter and prompt tweaking).
    - **Phase 2**: Controlled A/B testing with real users.
- **Decision Criteria**: Positive movement in CTR and conversion rates during A/B tests.

---

### 12. Integration and Serving

- **Architecture**:
    - **Precomputation/Caching**: Common search terms are precomputed to ensure millisecond latency.
    - **Indexing Strategy**: Two OpenSearch indexes:
        1. Index for retrieval of search term prompts and embeddings.
        2. Index for retrieving the actual embedding retrieval entities (products/recipes).
- **Serving**: OpenSearch is used to distribute precomputed predictions and retrieve results swiftly.
- **Fallback/Reliability**: Caching mechanisms are used to minimize API dependencies and ensure uptime.

---

### 13. Monitoring

- **Data Quality**: Sanity checks for embedding length and consistency.
- **Engineering Metrics**: Monitoring system stability and load during the scaling phase.
- **Model Quality**: Monitoring the impact of LLM updates on output consistency.

---

### 14. Operations

- **Scaling**: Gradual rollout from A/B tests to the entire user base.
- **Optimization**: Continuous refinement of ranking and hybrid search (combining literal and LLM-based search).
- **Maintenance**: Managing third-party API dependencies through caching.