# Optimizing Payments with Machine Learning

**Metadata**
- **Company**: Dropbox
- **Title**: Optimizing payments with machine learning
- **Technology Area**: Predictive ML / Ranking
- **Source URL**: https://dropbox.tech/machine-learning/optimizing-payments-with-machine-learning
- **Content Type**: Article

---

### 1. Problem definition

**i. Origin**
Dropbox manages payment processing for millions of customers. When recurring payments (monthly or yearly) fail, customers enter a "renewal failure" state. Historically, Dropbox used a static set of ~10 hardcoded rules to determine retry schedules (e.g., charging every 4 days for a maximum of 28 days). If all attempts fail, the account is downgraded to a free Basic account.

**ii. Relevance & Reasons**
- **Customer Experience**: Involuntary churn due to payment failure causes negative brand sentiment and disrupts user workflows.
- **Business Impact**: Involuntary churn represents a loss of steady revenue.
- **Operational Overhead**: The previous manual process of segmenting users (by subscription type, geography, etc.) and A/B testing rule sets was complex, time-consuming, and the rules decayed over time.

**iii. Expectations**
- **Quality**: Increase payment charge success rates and reduce the time required for collection.
- **Complexity**: Reduce the amount of manual intervention and complex rule-based logic.
- **Latency**: The system must provide predictions quickly enough to be integrated into the billing policy without bloating the Payments Platform.

**iv. Previous work**
- **Rule-based System**: A set of ~10 hardcoded rules based on human intuition and domain knowledge.
- **Manual Segmentation**: Payments team manually segmented users and A/B tested rule sets to find the best default policy for specific populations.

**v. Usage volumes and patterns**
- **Scale**: Millions of customers.
- **Patterns**: Recurring billing cycles (monthly/yearly) with retry windows (e.g., 4, 6, or 8-day windows).

---

### 2. Goals and anti-goals

**i. Goals**
- Optimize the timing of charge attempts to maximize the likelihood of success.
- Reduce involuntary churn.
- Automate the billing policy to remove manual rule maintenance.
- Implement an end-to-end optimization of the entire renewal failure cycle.

**ii. Anti-goals**
- Avoid bloating the Payments Platform with ML dependencies (addressed by moving to a dedicated Predict Service).
- Avoid creating a fragmented system with a separate model for every single retry attempt (shifted from "model-per-attempt" to a "single-model" approach).

---

### 3. Risks and constraints

- **Technical Constraints**: Initial integration led to high latency (2 minutes) and platform bloat when the model was run directly within the Payments Platform.
- **Failure Modes**: Payment failures occur for various reasons (insufficient funds, expired cards, disabled cards, transient failures), some of which are unrecoverable without customer action.
- **Dependencies**: Reliance on external payment processing partners and internal infrastructure (Edgestore, Predict Service, Stormcrow).

---

### 4. Metrics and loss functions

**i. Business Metrics**
- **Invoice Approval Rate**: Primary metric. Tracks whether the overall renewal for a user was successful (all payments for a specific renewal are tracked as one invoice).
- **Attempt Success Rate**: Tracks the success rate of individual payment attempts to measure how quickly a customer is renewed.

**ii. Model Internal Monitoring**
- **Coverage**: Percentage of customers receiving model recommendations vs. those on the fixed 4-day interval.
- **Number of predictions**: Count of successful recommendations made without errors.
- **Prediction Latency**: Time taken to generate a recommendation.

**iii. Infrastructure Metrics**
- **Data Freshness**: Delays in feature data pipelines.
- **Availability**: Uptime of Predict Service and EdgeStore.
- **Latency**: Response time of the Predict Service.

**iv. Loss Functions**
- `[NO INFO]`

---

### 5. Data (Dataset)

**i. Data Sources**
- **Internal Metadata**: Stored in **Edgestore** (primary metadata storage).
- **Signals**: 
    - Types of payment failures.
    - Dropbox account usage patterns.
    - Payment type characteristics.
    - Information about previous failures.

**ii. Labeling Strategy**
- `[inferred]` Binary labels based on whether a charge attempt at a specific time was successful or failed.

**iii. ETL and Pipeline**
- **Orchestration**: Daily scheduled **Airflow** jobs are used to collect and store customer signals in Edgestore.
- **Feature Encoding**: The Predict Service encodes signals into a feature dataframe before sending them to the model.

---

### 6. Validation schema

- **A/B Testing**: Used **Stormcrow** (internal feature gating service) for random sampling of user segments (e.g., US individual users, then Dropbox teams).
- **Split Strategy**: `[NO INFO]`

---

### 7. Baseline solution

- **Baseline**: A static, rule-based system (e.g., "Retry every 4 days").
- **Comparison**: The ML model was compared against these hardcoded rules via A/B tests to validate if the predicted "best time to charge" outperformed the fixed intervals.

---

### 8. Errors and their analysis

- **Diagnostic Approach**:
    - **Logging**: The predict module logs predictions and relevant info for troubleshooting.
    - **Monitoring**: Use of Grafana and Vortex for infrastructure/model metrics; Superset for business metrics.
    - **On-call Support**: Troubleshooting guides and escalation paths between the Payments engineering team and the Applied ML team.

---

### 9. Training pipelines

- **Model Architecture**: Gradient Boosted Ranking Model.
- **Approach**: 
    - The model ranks charge attempts by predicted likelihood of success.
    - **Time Chunking**: An 8-day window was divided into one-hour chunks (192 total chunks) to find the highest-ranking time.
- **Tooling**: 
    - **Airflow**: Data collection.
    - **Predict Service**: Infrastructure for building, deploying, and scaling ML processes.
- **CI/CD**: `[NO INFO]`

---

### 10. Features

- **Feature Categories**:
    - **Payment Failures**: Type of failure (e.g., insufficient funds vs. expired card).
    - **Usage Patterns**: Customer activity/usage of Dropbox.
    - **Payment Characteristics**: Characteristics of the payment method used.
    - **Historical Context**: Information about the previous failure.

---

### 11. Measuring results

- **Methodology**: A/B testing via Stormcrow.
- **Results**:
    - Initial tests on US individual users showed improved success rates.
    - Current tests on Dropbox teams show positive results.
    - Validated that ML outperforms the rule-based approach and is more robust to decay.

---

### 12. Integration and Serving

**i. Serving Architecture**
- **Pattern**: Online serving via gRPC.
- **Workflow**:
    1. Payment fails $\rightarrow$ Payments Platform requests next charge time.
    2. Predict module retrieves signals from **Edgestore**.
    3. Predict module makes a **gRPC call** to **Predict Service**.
    4. Model returns the best ranked time.
    5. Payments Platform schedules the next attempt in Edgestore.

**ii. SLAs and Performance**
- **Latency**: Reduced from $\sim 2$ minutes (when run inside Payments Platform) to **$< 300\text{ms}$** for the 99th percentile (p99) using Predict Service.

**iii. Fallback Strategy**
- **Initial Phase**: If the first ML-recommended attempt failed, the system defaulted back to rule-based logic for the remainder of the window.
- **Current Phase**: The model is used iteratively; if the first prediction fails, the model is queried again for the next best time, up to a maximum number of attempts before downgrade.

---

### 13. Monitoring

- **Tooling**:
    - **Grafana & Vortex**: Model and infrastructure metrics.
    - **Superset**: Business metrics.
- **Alerting**: Threshold-based alerts for business and model-specific metrics.
- **Ownership**: Shared responsibility between Payments engineering and Applied ML teams.

---

### 14. Operations

- **Retraining**: The system is designed to stay "sharp" through retraining, avoiding the decay seen in rule-based systems.
- **Operational Procedures**: 
    - Automated daily data collection jobs.
    - Monitoring for job failures or delays.
    - Troubleshooting guides for on-call engineers.
- **Future Roadmap**:
    - Expansion from North America to global customers.
    - Experimentation with Reinforcement Learning (RL).
    - Addition of more relevant features and different model architectures.