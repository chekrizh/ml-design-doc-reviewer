# Wayfair Marketing ML Systems

### **I. Problem definition**

### **i. Origin**
Wayfair operates a high-volume e-commerce platform requiring daily marketing decisions across diverse channels. These include digital ads (display networks, social media, online video) and physical ads (direct mail postcards, catalogs), as well as organic reach methods (email, push notifications).

### **ii. Relevance & Reasons**
The system must programmatically solve four primary decision points:
- **Content**: What message/content to show.
- **Placement**: Where to show the content.
- **Targeting**: Whom to show the content to.
- **Bidding**: How much to pay for the placement.

Manual or heuristic-based decision-making is insufficient for the scale of campaigns and the complexity of customer interactions.

### **iii. Expectations**
- **Scalability**: The ability to support hundreds of marketing campaigns.
- **Adaptability**: The system must adapt to changes in business operations, creative refreshes, and industry privacy updates.
- **Global Optimization**: Moving beyond individual model performance to optimize aggregated rewards across multiple channels.
- **Customer Experience**: Avoiding "over-messaging" and ad fatigue, which can lead to performance drops and poor customer experience.

### **iv. Previous work**
Wayfair evolved through three stages of ML maturity:
1. **General Propensity Modeling**: Using observational data to predict likelihood to buy/engage.
2. **Specialized Response/Uplift Modeling**: Channel-specific models targeting "persuadables" via Randomized Controlled Trials (RCTs).
3. **Multi-layer ML Platform (WayLift)**: A reinforcement learning-based system to balance exploration and exploitation.

### **v. Usage volumes and patterns**
- **Scale**: Hundreds of marketing campaigns.
- **Cadence**: Daily marketing decisions; model retraining ranges from daily to yearly depending on the layer.

---

### **2. Goals and anti-goals**

### **i. Goals**
- Optimize aggregated rewards (e.g., Return on Ad Spend - ROAS).
- Identify "persuadables" (customers whose conversion is caused specifically by the ad treatment).
- Balance the trade-off between exploiting known "best ads" and exploring alternative treatments.
- Reduce cross-program competition and cannibalization.

### **ii. Anti-goals**
- **Local Optimization**: The system should not simply assign the "best ad" predicted for a single customer if it leads to ad fatigue or ignores global budget constraints.
- **Static Modeling**: Avoiding models that cannot adapt to rapid changes in the advertising environment.

---

### **3. Risks and constraints**

- **Operational Costs**: Uplift modeling requires constant RCTs, which incur costs and the opportunity cost of not showing ads to a control group.
- **Data Privacy**: The system must adapt to ongoing privacy updates in the advertising industry.
- **Customer Experience**: Risk of ad fatigue and over-messaging if models are rolled out independently across different programs.
- **Model Maintenance**: Specialized models are more costly to maintain and less generalizable than general propensity models.

---

### **4. Metrics and loss functions**

### **i. Offline metrics**
- **[NO INFO]**

### **ii. Online/Business metrics**
- **ROAS (Return on Ad Spend)**: Used as a primary business KPI for global optimization.
- **GRS (Gross Revenue Sales)**: Specifically mentioned as a 60-day forecast metric.
- **CLV (Customer Lifetime Value)**: Used to measure the long-term impact of events (e.g., app installs).
- **Upper-funnel metrics**: Clicks and product page views (used as short-term proxies for long-term rewards).

### **iii. Loss functions**
- **[NO INFO]**

---

### **5. Data (Dataset)**

### **i. Data sources**
- **Observational Data**: Used for general propensity models.
- **RCT (Randomized Controlled Trial) Data**: Used for uplift modeling to identify incremental revenue.
- **Engagement Data**: Clicks, product page views, and app installs.

### **ii. Labeling strategy**
- **Propensity**: Binary labels based on whether a person bought or engaged with a product.
- **Uplift**: Labels derived from the difference in conversion between treatment and control groups in RCTs.

### **iii. Data quality and ETL**
- **[NO INFO]**

---

### **6. Validation schema**
- **Back-testing**: Channel-specific models are back-tested with data representative of the specific channel's operations.
- **RCTs**: Used specifically for uplift models to ensure the conversion was caused by the treatment.

---

### **7. Baseline solution**
- **General Propensity Models**: The initial baseline approach. These models predict the likelihood of a person to buy/engage. They are highly scalable and low-maintenance but lack the ability to account for treatment-specific response or global optimization.

---

### **8. Errors and their analysis**
- **Over-messaging**: Occurs when the same models are rolled out across different programs, leading to customer fatigue.
- **Cannibalization**: Cross-program competition where different campaigns target the same audience.
- **Ad Fatigue**: Performance drop over time when the "best ad" is consistently assigned.

---

### **9. Training pipelines**

### **i. Tooling**
- **[NO INFO]**

### **ii. Pipeline Architecture (WayLift Multi-layer Platform)**
1. **Customer Scoring Layer**:
    - Trained on observational data.
    - Cadence: Quarterly or yearly.
    - Output: Low-dimensional customer vectors.
2. **Decision Optimization Layer**:
    - Online and batch learning systems.
    - Cadence: Daily or weekly.
    - Input: Customer context vectors $\rightarrow$ Output: Optimal treatment decision.
3. **Feedback Generation Layer**:
    - Forecasting models that predict "delayed rewards" (e.g., predicting 60-day GRS from short-term clicks).

---

### **10. Features**

### **i. Feature categories**
- **Customer Affinity**: Interests in styles, specific products, or categories (e.g., beds, sofas).
- **Purchase Cycle**: Where the customer is in their buying journey.
- **Price Sensitivity**: Which price points resonate with the customer.
- **Customer Context Vector**: An interpretable low-dimensional vector constructed from the outputs of multiple base propensity models.

---

### **11. Measuring results**
- **A/B Testing/RCTs**: Used for uplift modeling to drive true incremental revenue.
- **Reinforcement Learning Feedback**: The system observes rewards for recent treatments to update optimal decisions.

---

### **12. Integration and Serving**

### **i. Serving Architecture**
- **WayLift Platform**: A multi-layer system that integrates customer scoring, decision optimization, and feedback loops.
- **Decision Logic**: A combination of rules and ML models applied on top of scoring models to determine the final treatment.

### **ii. SLAs and Fallbacks**
- **[NO INFO]**

---

### **13. Monitoring**
- **Reward Observation**: Constant observation of rewards for recent treatments to adapt to new campaigns or refreshed creatives.
- **KPI Tracking**: Monitoring short-term upper-funnel metrics to forecast long-term financial impact.

---

### **14. Operations**

### **i. Retraining cadence**
- **Base Models**: Quarterly or yearly.
- **Optimization Models**: Daily or weekly.

### **ii. Ownership**
- Collaboration between **Data Scientists**, **Ad Tech Engineers**, and **Marketers**.