# Supermegaretail Demand Forecasting

- Kind: example
- Source: [Retail_Demand_Forecasting_Design.md](https://github.com/ML-SystemDesign/MLSystemDesign/blob/main/Design_Doc_Examples/Examples/EN/Retail_Demand_Forecasting_Design.md), ML System Design by Kravchenko and Babushkin, MIT License. Condensed into the 9 sections; numbers and choices come from the source.

## Problem Space

### Key Properties

| Key | Value |
|---|---|
| Domain | Retail, grocery chain |
| Business Goal | Narrow the delivered vs sold gap without out-of-stock |
| ML Task | Demand forecast per SKU × store × day |
| Constraints | Perishables; delivery every 2 days; data delay ≤ 48 h |
| Horizon | 4 weeks (1 year for suppliers) |
| Current Loss | ≈ $800M per year |

### Rationale

Supermegaretail runs thousands of stores and must buy goods before it sells them. Leftovers mean waste of perishables; selling out means lost revenue, customers going to competitors, and unknown real demand.

- Suppliers sign one-year deals that can be adjusted 90 days ahead.
- 47 distribution centers send a truck to each store about every two days; stores keep stock in the loading bay for 2–3 days.
- The distribution center plans deliveries, a store manager can override them.
- Owners: logistics, procurement, and store operations.

Out-of-stock costs more than overstock, so errors are asymmetric. Overstock loss is easy to count, out-of-stock loss needs A/B tests or expert estimates.

### Trade-offs

None.

### Diagram

None.

## Evaluation (Offline)

### Key Properties

| Key | Value |
|---|---|
| Offline Metric | Quantile loss at 1.5, 25, 50, 75, 95, 99 |
| Loss | Quantile loss, same as metric |
| Target Value | Beat baseline on every quantile, 95% CI |
| Weighting | Plain and weighted by SKU price |

### Rationale

Sales are count data: low, integer, often zero, with asymmetric distributions. A point forecast is not enough, the business keeps stock to a service level, so it needs quantiles of the predictive distribution. Quantile loss lets the loss equal the metric: six models, one per quantile. Tweedie loss is the second line of experiments. Metrics are reported with 95% confidence intervals from bootstrap or cross-validation.

### Trade-offs

| Option | Works on count data with zeros | Serves a stock service level | Can equal the loss |
|---|---|---|---|
| MAE / wMAPE | Biased on skewed low counts | No, optimizes the median | Yes |
| MAPE / sMAPE | No, undefined or fixed at zero actuals | No | No |
| MSE | No, dominated by large errors | No | Yes |
| Quantile loss | Yes | Yes, a quantile per service level | Yes |

Chosen: Quantile loss

### Diagram

None.

## Baseline

### Key Properties

| Key | Value |
|---|---|
| Approach | Per-SKU sales quantiles over a yearly window |
| Baseline Metric | Same quantile losses as offline evaluation |
| Next Steps | Quantile linear regression, then SARIMA / Prophet |

### Rationale

The simplest bar is the same day last week per SKU and store: a week back rather than a day back because data can be late and sales have a strong weekly cycle. The advanced constant baseline computes the same six quantiles from a yearly window, so it is directly comparable with the target models. A quantile linear regression on lags and rolling aggregates, and time-series models (SARIMA, Prophet), are the next steps. Beating these baselines shows whether modeling and features move in the right direction.

### Trade-offs

| Option | Effort | Comparable with quantile metrics | Also a fallback |
|---|---|---|---|
| Same day last week | Minimal | No, a point forecast | Yes, last-resort fallback |
| Yearly-window quantiles | Low | Yes | No |
| Quantile linear regression | Medium, needs features | Yes | No |
| SARIMA / Prophet | Medium, tuning or none with Prophet | Partly | Yes, secondary fallback |

Chosen: Yearly-window quantiles

### Diagram

None.

## Validation

### Key Properties

| Key | Value |
|---|---|
| Scheme | Rolling CV: 5 outer folds, 3 inner folds |
| Windows | 2 years train, 28 days test, 3-day gap, 7-day step |
| Golden Set | Holdout refreshed every 3 months |

### Rationale

New data and labels arrive daily with up to 48 hours delay, recent data matters most, the assortment changes by 15% a month, and there are weekly and annual cycles. The split must mirror inference: train on the last two years, predict the next four weeks, with a 3-day gap for the data delay. The outer loop estimates quality, the inner loop tunes hyperparameters and selects features. The split moves weekly with new data; a golden set tracks long-term progress.

### Trade-offs

| Option | Respects time order | Handles 48 h data delay | Gives variance of the estimate |
|---|---|---|---|
| Random K-fold | No, leaks the future | No | Yes |
| Single time holdout | Yes | Yes, with a gap | No |
| Rolling CV with a gap | Yes | Yes | Yes |

Chosen: Rolling CV with a gap

### Diagram

A horizontal timeline of the outer loop, three stacked rows, each shifted left by 7 days:

- Fold 1: [Train 2 years] → [Gap 3 days] → [Test 28 days]
- Fold 2: [Train 2 years] → [Gap 3 days] → [Test 28 days]
- Fold 5: [Train 2 years] → [Gap 3 days] → [Test 28 days]

## Data & Features

### Key Properties

| Key | Value |
|---|---|
| Sources | Transactions, stock, promo calendar, metadata |
| Key Features | Sales lags and rolling stats, prices, promo, penetration |
| Object | (date, store, SKU) → units sold |
| External Data | Competitor prices, weather, traffic |

### Rationale

Transactions are the primary source of truth, stock history shows how much could be sold, the promo calendar drives spikes. Purchased weather and traffic data and manually gathered competitor prices (about 25% of SKUs, with gaps) come from outside. History covers more than three years; labels come from transactions, so no extra labeling is needed.

Features are kept only if they pass four criteria: prediction quality, interpretability, computation time, and stability of their sources. A feature that improves quality but takes two days to compute is rejected. Each feature is a hypothesis, importance is checked with SHAP and shuffle importance, and feature tests run before and after training.

### Trade-offs

None.

### Diagram

A horizontal ETL pipeline:

- [Daily transaction aggregates] → [Rewrite last 2–3 days] → [Join stock, promo, metadata, external data] → [Feature store (store × SKU × day)]

## Evaluation (Online)

### Key Properties

| Key | Value |
|---|---|
| Evaluation Type | A/B test split by distribution center |
| Key Metric | Average check, proxy for revenue |
| Hypothesis | Revenue +0.3% or more |
| Design | Welch's t-test, α 5%, β 10%, 1 month |

### Rationale

Offline gains translate into an expected 0.3–0.7% revenue increase in the pilot group, based on earlier A/B tests. The split unit is the distribution center: each center serves a cluster of stores, so splitting by store would mix groups within one replenishment chain. Two weeks are enough statistically, but replenishment runs weekly, so the test lasts a full month. Control metrics: checks per day, model update frequency, offline metrics. Auxiliary: daily revenue and profit.

### Trade-offs

| Option | Groups independent | Enough units for power |
|---|---|---|
| Split by store | No, stores share a distribution center | Yes |
| Split by distribution center | Yes | Enough with matched store subsets |

Chosen: Split by distribution center

### Diagram

None.

## Integration

### Key Properties

| Key | Value |
|---|---|
| Inference Pattern | Scheduled batch jobs, on-demand via API |
| Output | Demand per SKU × entity × period, JSON |
| Latency Budget | Not critical, batch throughput matters |
| Fallback | 3 tiers down to last week's sales |

### Rationale

Forecasts run daily, weekly, and monthly on large volumes: batch containers on AWS Batch read from S3 and write back to S3, a small API serves on-demand requests. When drift or data problems appear, the system switches automatically: a model on the most important features, then SARIMA or Prophet, then last week's sales adjusted for holidays. The wrapper and the model are released separately; a new model runs in shadow mode first. Users are internal, so blue-green deployment is not needed; overrides and feedback stay with business users.

### Trade-offs

| Option | Risk for users | Effort |
|---|---|---|
| Blue-green deployment | Low | High |
| Standard rollout + shadow mode for models | Low, users are internal | Low |

Chosen: Standard rollout + shadow mode for models

### Diagram

A horizontal batch flow with a fallback chain below it:

- [S3 input data] → [AWS Batch forecast job] → [S3 forecasts] → [Demand API]
- [Main model] → [Model on top features] → [SARIMA / Prophet] → [Last week's sales]

## Monitoring

### Key Properties

| Key | Value |
|---|---|
| Data Drift | Wasserstein distance, mean drift score |
| Model Quality | Quantile losses daily, labels in 15 min |
| Alerting | z-score on missing data, prediction drift |
| Tooling | Evidently AI, ClickHouse, Prometheus, Grafana |

### Rationale

This is one of the first ML projects at Supermegaretail, so there is no ML monitoring yet. Labels arrive 15 minutes after a sale, so model quality is monitored directly: the six quantile losses, RMSE, and MAE, with thresholds set after the first three months. Data quality alerts fire at 3 z-scores for important features and 4 for the rest; schema, ranges, and correlations are checked too. Prediction drift is an early alarm (PSI > 0.2 and Wasserstein > 0.1 are both tested). Business metrics stay on rotating A/B groups.

### Trade-offs

| Option | Time to start | Covers quality, data and target drift | Control |
|---|---|---|---|
| Evidently AI (open source) | Days | Yes | Medium |
| Own monitoring platform | Months | Whatever we build | Full |

Chosen: Evidently AI (open source)

### Diagram

None.

## Target Solution & Architecture

### Key Properties

| Key | Value |
|---|---|
| Model Type | Gradient boosting, one model per quantile |
| Scope | One model for all categories |
| Training Stack | Python, Spark, MLflow, Docker, SageMaker |

### Rationale

Six gradient-boosting models, one per quantile, trained with quantile loss on the feature store. Replacing per-category models with one unified model improved offline metrics across most folds; small categories gained most, large ones did not lose, and the result held across seasons and regions. One model is also much easier to maintain. Learning curves pick the number of trees, lags, and window sizes; MLflow tracks experiments, CI/CD retrains on new data.

### Trade-offs

| Option | Small categories | Large categories | Maintenance |
|---|---|---|---|
| One model per category | Weak, too little data | Good | Many models |
| One unified model | Better offline metrics | No significant change | One model |

Chosen: One unified model

### Diagram

None.
