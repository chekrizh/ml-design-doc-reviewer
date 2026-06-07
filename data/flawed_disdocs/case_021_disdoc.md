# Roblox Content Moderation System

### **I. Problem definition**

### **i. Origin**
Roblox is a user-generated content (UGC) platform where millions of users communicate via chat and voice and upload 3D assets. The system must ensure a safe and civil environment by moderating text, audio, voice, and images in real-time across 28 languages.

### **ii. Relevance & Reasons**
The scale of content production makes manual moderation impossible. 
- **Volume**: Users uploaded approximately 1 trillion pieces of content between February and December 2024.
- **Daily Traffic**: 6.1 billion chat messages and 1.1 million hours of voice communication per day.
- **Business Impact**: Proactive moderation is critical to prevent policy violations (e.g., PII sharing, hate speech, profanity) and protect a demographic consisting of kids, teens, and gamers.

### **iii. Expectations**
- **Latency**: Text filtering must occur within milliseconds to maintain conversation flow. Voice safety classification must occur within 15 seconds.
- **Reliability**: High precision and recall are required; AI is only deployed when it significantly outperforms humans at scale.
- **Responsiveness**: Median time to action for illegal content is 10 minutes.

### **iv. Previous work**
- **Initial Phase**: Manual moderation by humans, including the company founders.
- **Early Technical Phase**: A rules-based text filter (deployed over a decade ago).
- **Intermediate Phase**: State-of-the-art transformer-based text filters (deployed ~5 years ago).

### **v. Usage volumes and patterns**
- **Daily Active Users (DAU)**: 97.8 million (as of Q1 2025).
- **Throughput**: 
    - Text filters: >750,000 Requests Per Second (RPS).
    - PII filter: 370,000 RPS at peak.
    - Voice classifier: 8,300 RPS at peak.

---

### **2. Goals and anti-goals**

### **i. Goals**
- **Proactive Moderation**: Remove violating content before users are exposed to it.
- **Real-time Feedback**: Provide immediate warnings/notifications to users to educate them on rules and change behavior.
- **Scalability**: Handle trillions of pieces of content without linear increases in human headcount.
- **Continuous Adaptation**: Adapt to evolving slang, memes, and adversarial evasion techniques.

### **ii. Anti-goals**
- **Human-only Moderation**: The system explicitly avoids relying solely on humans for high-volume tasks due to the impossibility of scaling to the required RPS.
- **Blind AI Deployment**: AI is not deployed unless it outperforms humans in both precision and recall.

---

### **3. Risks and constraints**

- **Adversarial Evolution**: Users (especially teens/gamers) constantly develop new slang and methods to evade moderation tools.
- **Data Quality**: "Garbage in, garbage out" risk; poor training/evaluation data leads to production failures.
- **User Friction**: High false positive rates lead to user frustration when compliant content is removed.
- **Computational Cost**: High RPS demands led to the exhaustion of CPU-based serving stacks, requiring a migration to GPU infrastructure.

---

### **4. Metrics and loss functions**

### **i. Offline Metrics**
- **Recall**: Specifically mentioned for the voice classifier (latest version is 92% higher than the initial version).
- **False Positive Rate (FPR)**: Voice classifier maintains a 1% FPR.
- **Alignment**: Percentage of agreement between multiple human labels for the same example (Target: $\ge 80\%$).
- **Quality**: Accuracy of human decisions against a "golden set" of curated examples.

### **ii. Online/Business Metrics**
- **Median Time to Action**: 10 minutes for illegal content.
- **False Positive Reduction**: PII filter reduced false positives by 30%.
- **Detection Rate**: 25% increase in PII mentions automatically detected.
- **Behavioral Impact**: 
    - 5% reduction in filtered chat messages following real-time notifications.
    - 6% reduction in consequences from abuse reports following real-time notifications.
    - Reduction in re-offense rates for up to three weeks following suspensions.

### **iii. Loss Functions**
- **Optimization Goal**: The system is trained to optimize for fewer false negatives (erring on the side of removal to ensure safety).

---

### **5. Data (Dataset)**

### **i. Data Sources**
- **User-Generated Content**: Text chats, audio, voice, and images.
- **User Reports**: Abuse reporting system, including visual annotations (15% of eligible reports include scene captures with avatar/object IDs).
- **Appeals Process**: Overturned decisions are used as training data to correct future errors.
- **Synthetic Data**: LLMs generate artificial examples and labels to emulate rare or edge cases.

### **ii. Labeling Strategy**
- **Golden Set**: Hand-curated examples by policy experts representing the ideal detection targets.
- **Human Experts**: Thousands of global experts provide labeling and oversight.
- **AI-Assisted Red Teams (AARTs)**: Simulate adversarial attacks to probe for weaknesses and generate edge-case data.

### **iii. Data Quality and ETL**
- **Sampling Strategies**:
    - **Uncertainty Sampling**: Sampling edge cases where the model was previously confused.
    - **Curated Sampling**: Using policy experts to ensure data matches current trends (slang/memes).
- **Data Splitting**: Data is split into training and evaluation sets.

---

### **6. Validation schema**

- **Evaluation Set**: A robust, high-accuracy evaluation set is used to prevent "easy" metrics that fail in production.
- **Alignment Testing**: Sending the same examples to multiple humans to ensure $\ge 80\%$ agreement.
- **Quality Testing**: Testing human decision-making against the golden set to ensure policy enforcement consistency.

---

### **7. Baseline solution**
- **Baseline 1**: Manual human review (used at launch).
- **Baseline 2**: Rules-based text filters (used over a decade ago).
- **Comparison**: Current transformer-based models are used because they provide the necessary speed (milliseconds) and consistency that humans and rules cannot achieve at scale.

---

### **8. Errors and their analysis**

- **False Negatives**: Addressed by optimizing the model to err on the side of removal.
- **False Positives**: Addressed through continuous dataset improvement and distillation/quantization to refine model precision.
- **Edge Cases**: Identified via uncertainty sampling and AARTs (AI-assisted red teams).
- **Policy Ambiguity**: Identified when human alignment falls below 80%, triggering a review of the policy or training set.

---

### **9. Training pipelines**

- **Model Architecture**: Large, transformer-based multimodal models.
- **Optimization Techniques**:
    - **Distillation**: Reducing larger models into smaller, faster versions.
    - **Quantization**: Reducing precision to accelerate inference.
- **Active Learning**: Systems continuously update models as language and user patterns evolve.
- **Automation**: Exploring the automatic creation of AI-driven rules from user reports to increase responsiveness.

---

### **10. Features**

- **Modality**: Multimodal support (Text, Audio, Voice, Images).
- **Contextual Features**: Visual annotations (avatar and object IDs) provided by users in reports.
- **Language Support**: 28 languages for text; 8 languages for voice.

---

### **11. Measuring results**

- **A/B Testing/Experiments**:
    - **Hypothesis**: Real-time feedback (notifications/time-outs) reduces policy violations.
    - **Result**: 5% reduction in filtered messages and 6% reduction in abuse report consequences.
- **Evaluation**: Use of a "golden set" to assess if the system correctly identifies policy violations.

---

### **12. Integration and Serving**

- **Serving Stack**:
    - **Infrastructure**: Transitioned from CPU-based serving to a GPU-based stack using "cellular infrastructure."
    - **Optimization**: Separated tokenization from inference to increase throughput.
- **Performance**:
    - **Throughput**: PII filter handles 370k RPS; general text filters handle >750k RPS.
    - **Latency**: Millisecond-level response for text; <15 seconds for voice.
- **Fallback/Human-in-the-loop**: Humans are leveraged for complex investigations, rare cases, and appeals.

---

### **13. Monitoring**

- **Model Quality**: Continuous monitoring of precision and recall.
- **User Behavior**: Tracking re-offense rates and the volume of abuse reports.
- **System Health**: Monitoring RPS and latency on the GPU serving stack.

---

### **14. Operations**

- **Human-AI Collaboration**: AI handles the bulk of the volume; humans handle nuanced judgment and appeals.
- **Retraining Cadence**: Continuous updates via active learning to keep up with evolving slang and memes.
- **Policy Iteration**: If human alignment is $< 80\%$, the policy is iterated upon and the training set is updated.