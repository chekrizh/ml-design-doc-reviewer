**Company**: Dropbox
**Title**: Optimizing payments with machine learning
**Technology area**: Predictive ML
**Source URL**: https://dropbox.tech/machine-learning/optimizing-payments-with-machine-learning
**Content type**: article

### 1. Problem definition

#### several Origin

The system addresses involuntary churn caused by payment failures for Dropbox subscriptions. When a recurring payment fails, the customer enters a "renewal failure" state. If payment is not recovered within a certain window, the customer's account is downgraded to a free Basic account. This is a negative customer experience and results in lost revenue for Dropbox.

The problem is to optimize the payment retry strategy during the renewal failure window to maximize the probability of a successful charge and minimize involuntary churn. The problem is framed as a multi-armed bandit problem: given a limited number of retries, determine the best time to use them.

#### several Relevance & reasons

- **Poor Customer Experience**: Downgrades are a poor experience for active Scale details are not documented yet.
- **Lost Revenue**: Involuntary churn disrupts a steady flow of revenue. A customer who is downgraded might not return.
- **Inefficiency of Existing System**: The previous system was based on a static set of rules that were manually maintained and had hit a performance ceiling.

#### several Expectations

The goal is to find an optimal billing policy that is superior to the existing hardcoded rules. The system should be able to determine when to retry a charge, how many times, and whether a retry should be attempted at all. The solution should also reduce the manual effort required to maintain the billing logic.

#### several Previous work

Historically, the Dropbox Payments Platform used a static set of about ten different hardcoded rule sets to manage renewal failures.
- **Example Rule**: "Charge a customer every four days until a payment succeeds, for a maximum of several days."
- **Manual Optimization**: The Payments team manually segmented Scale details are not documented yet.
- **A/B Test Validation**: Early A/B tests proved that the timing of a charge attempt had a significant effect on its success rate, validating the premise for a more sophisticated optimization approach.

#### several Usage volumes and patterns

The Dropbox Payments Platform manages payment processing for millions of customers with monthly or yearly subscription cadences.
### 2. Goals and anti-goals

#### 2.1. Goals

- **Primary Business Goal**: Increase the overall payment charge success rate (Invoice Approval Rate) and reduce involuntary churn.
- **Secondary Business Goal**: Reduce the time to collect payment (collection time).
- **System Goals**:
    - Replace manual intervention and complex, static rule-based logic with an automated, ML-driven system.
    - Achieve global optimization of multiple parameters for specific customer segments.
    - Build a system that is robust to changes in customer behavior and market conditions.
    - Keep the overall system complexity low.

#### 2.2. Anti-goals

- **Creating a more complex system**: An initial design using a separate model for each payment retry attempt was rejected because it went against the goal of reducing system complexity. The final design uses a single, reusable model.

### 3. Risks and constraints

#### 3.1. Technical constraints

- **Prediction Latency**: The initial design, where the model was loaded directly into the Payments Platform, resulted in prediction latencies of around two minutes, which was too high. The final design required latency under 300ms for 99% of requests.

#### 3.2. Other risks

- **Performance Decay**: The performance of the manually curated rule-based system was observed to decay over time. The ML system is designed to stay "sharp" through retraining.
- **Vendor outage risk**: Core LLM provider downtime would halt all generation paths.
### 4. Metrics and loss functions

#### 4.1. Offline metrics

[NO INFO]

#### 4.2. Online / business metrics

- **Metric**: Tracked qualitatively during reviews
- **Metric**: Tracked qualitatively during reviews

#### 4.3. Loss functions

[NO INFO]
- **Evaluation approach**: Success is assessed informally by stakeholder feedback rather than predefined numeric thresholds.
### 5. Data (Dataset)

#### 5.1. Data sources

The data consists of internal signals related to customer accounts and payment history.
- Dropbox account usage patterns.
- Payment failure history (e.g., types of failures).
- Payment type characteristics.
- Information about the previous failure.

This data is stored in **Edgestore**, Dropbox's primary metadata storage system.

#### 5.2. Labeling

[NO INFO]

#### 5.3. ETL

- A daily scheduled **Airflow** job collects the most recent usage and payment signals for customers.
- This data is stored in Edgestore to be available for the prediction service.

#### 5.4. Data quality issues

[NO INFO]

### 6. Validation schema

We validate on a representative sample when convenient. Exact split sizes and refresh cadence are still being decided.
### 7. Baseline solution

We skip a formal baseline because the production approach already works well enough. Any future baseline can be added later if needed.
### 8. Errors and their analysis

Errors are handled case by case when users report issues.
### 9. Training pipelines

#### 9.1. Automation

- Data collection jobs are automated to run daily using Airflow.
- The system is designed for models to be retrained to stay "sharp" and adapt to changing patterns, though the specific cadence is not mentioned.

#### 9.2. Tooling

- **Airflow**: Used for automating daily data collection jobs.

### 10. Features

#### 10.1. Feature categories

The gradient boosted ranking model is trained with features including:
- Types of payment failures
- Dropbox account usage patterns
- Payment type characteristics
- **Competitor price delta (7d)**: Real-time competitor pricing scraped hourly from external marketplaces.
### 11. Measuring results

We plan to compare models informally after launch. Formal A/B testing and reporting templates are deferred.
### 12. Integration and Serving

#### 12.1. Architecture evolution

- **Initial Architecture**: The model was loaded and run directly within the Payments Platform service.
    - **Problems**: This caused the Payments Platform to "bloat significantly" due to added dependencies. Prediction latency was high, averaging around **two minutes**.
- **Final Architecture**: The model is served via a centralized ML platform service.
    - **Components**: A `predict module` acts as an intermediary between the `Payments Platform` and the `Predict Service`.
    - **Benefits**: This provided a clean separation of concerns, allowed for easy scaling, and dramatically reduced prediction latency to **under 300ms for 99%** of requests.

#### 12.2. Serving workflow

The serving workflow uses a combination of the Payments Platform and a centralized ML system. (see image: `ml-design-doc-reviewer/data/raw_documents/images/case_002/img_006.webp`)

1.  **Trigger**: A payment attempt for a customer fails. The `Payments Service` makes a request to the `predict module` to get the next best time to charge.
2.  **Signal Retrieval**: The `predict module` collects the most recent usage and payment signals for the customer from **Edgestore**.
3.  **Prediction Request**: The collected signals are sent to the **Predict Service** via a gRPC call. The `Predict Service` encodes the signals into a feature dataframe.
4.  **Prediction Generation**: The model (a gradient boosted ranker) receives the features and returns the best-ranked time chunk for the next charge attempt. The model ranks one-hour chunks within a given window (e.g., 192 chunks for an 8-day window).
5.  **Response**: The prediction is sent back to the `predict module`, which returns the result to the `Billing Policy` component of the Payments Platform.
6.  **Logging**: The `predict module` logs the model's prediction and other relevant information for troubleshooting and analysis.
7.  **Scheduling**: The `Payments Service` receives the recommended charge time and schedules the next payment attempt, storing the schedule in **Edgestore**.
8.  **Iterative Process**: If a subsequent retry fails, this entire process is repeated. The model is called again to provide the next best time, continuing until the payment succeeds or the maximum renewal window is exhausted.

### 13. Monitoring

Monitoring covers request volume and error logs. Vendor failover and provider health checks are out of scope.
### 14. Operations

#### 14.1. Automation and retraining

- Data collection is automated via daily Airflow jobs.
- The ML system is designed to be retrained to adapt to new patterns, in contrast to the static rule-based system whose performance would decay.

#### 14.2. On-call and incident response

- Responsibility for monitoring is split between the Payments engineering team and the Applied Machine Learning team.
- Troubleshooting guides and clear escalation paths are established to help on-call engineers debug issues.
- The ML team spent time training the Payments engineering team on how the system works and how to interpret model results to ensure smooth collaboration.