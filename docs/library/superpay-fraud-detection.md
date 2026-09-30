# SuperPay Real-Time Fraud Detection

- Kind: task
- Source: written by the author.

Only Problem Space is filled; the other eight sections start empty, as in a new design. ML Task is left empty on purpose: choosing it is the first decision of the design.

## Problem Space

### Key Properties

| Key | Value |
|---|---|
| Domain | High-volume payment risk management |
| Business Goal | Net loss from ≈0.4% to ≤0.25% of GMV in 12 months |
| ML Task | |
| Constraints | ≤200 ms, 1000 TPS peak, pilot in 6 months, GDPR |

### Rationale

**Business context**

- Domain: high-volume payment risk management.
- Company: SuperPay, a large, fast-growing FinTech payment gateway for medium and large e-commerce (similar to Stripe).
- Volume: up to 100 million transactions per day.

**Current problem**

A rigid rule-based engine is in use:

- Many false positives.
- Slow adaptation to new fraud schemes, especially fraud rings and account takeover (ATO).

**Desired outcome**

A real-time fraud detection system:

- Instant decision-making, within 200 ms.
- Uses the most recent behavioral features.
- Significantly reduces net financial loss without increasing false positives.

**Success metric**

- Net financial loss = fraud amount + fines − saved.
- Current: ≈0.4% of total GMV ($40M per year with $10B per year GMV).
- Target: ≤0.25% of total GMV within 12 months after launch.

**Constraints and requirements**

- Time-to-market: 6 months until a pilot on 10% of traffic.
- Technical: latency up to 150–200 ms; peak load up to 1000 transactions per second.
- Budget and infrastructure: moderate budget; cloud services or managed open source preferred.
- Data: 2 years of historical transactions (1B+ records), IP and device fingerprint logs, chargeback data. Fraud is under 0.1% of transactions. Fraud labels arrive with a 1–14 day delay.
- Regulatory: GDPR compliance. The model must be partially interpretable to justify rejecting a client.

### Trade-offs

None.

### Diagram

None.
