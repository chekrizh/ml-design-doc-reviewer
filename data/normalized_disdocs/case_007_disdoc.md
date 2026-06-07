# Language Identification from Very Short Strings

### **1. Problem definition**

**i. Origin**
Apple's NLP ecosystem requires the ability to identify the language of a given text string to invoke the correct language-specific models. This is critical for features such as QuickType keyboards, Smart Responses, and the Natural Language framework APIs.

**ii. Relevance & Reasons**
Many users provide input in the form of very short strings (e.g., text messages, social media posts), typically ranging from 10 to 50 characters. In these cases, many characters are shared across multiple languages (e.g., Latin or Cyrillic scripts), making reliable identification challenging. Accurate Language Identification (LID) is necessary to:
- Load the correct autocorrection lexicons and language models for predictive typing.
- Select appropriate linguistic taggers and semantic processing tools.
- Launch the correct tokenizer for Spotlight indexing to ensure efficient retrieval.

**iii. Expectations**
The system must be robust enough to handle very short evidence (1-2 words) while remaining performant on resource-constrained mobile devices (iPhone, iPad, Apple Watch).

**iv. Previous work**
- **Lexically inspired solutions**: Deemed impractical for embedded devices.
- **Syntactically inspired techniques**: Restricted to long documents where sufficient evidence is available.
- **Generative statistical models (n-grams)**: Based on cumulative frequency addition; these suffer from conditional independence assumptions (Markov strategy) and fall short of accuracy requirements for strings of 10-50 characters.

**v. Usage volumes and patterns**
- **Input length**: Focus on "very short strings" (10-50 characters).
- **Scale**: Deployed across iOS and macOS platforms.

---

### **2. Goals and anti-goals**

**i. Goals**
- Improve LID accuracy for very short strings compared to n-gram baselines.
- Reduce the disk footprint/model size of the LID system.
- Ensure scalability where model size does not grow linearly with the amount of training data.
- Maintain low latency for real-time responsiveness on mobile devices.

**ii. Anti-goals**
- The system does not aim to use computationally complex architectures (e.g., Transformers) due to resource constraints.
- The system is not designed for long-document classification where syntactic evidence is already sufficient.

---

### **3. Risks and constraints**

- **Resource Constraints**: Limited memory and compute on mobile devices necessitate shallow networks and small model footprints.
- **Confusability**: Mixing different scripts (e.g., Latin and Cyrillic) in a single classifier increases error rates.
- **Data Sparsity**: Very short strings provide limited evidence, increasing the risk of misclassification between similar languages.

---

### **4. Metrics and loss functions**

- **Offline Metrics**: 
    - **Confusion Matrices**: Used to measure accuracy (diagonal) and confusability between specific language pairs (off-diagonal).
    - **Error Rate**: Observed reductions in error rates ranging from 15% to 60% depending on the language.
- **Engineering Metrics**: 
    - **Disk Footprint**: Measured in MB to evaluate memory efficiency.
- **Loss Functions**: `[NO INFO]`

---

### **5. Data (Dataset)**

- **Sources**: A mixture of newswire and short conversational texts.
- **Labeling**: `[NO INFO]`
- **Data Constraints**: 
    - **Length**: Latin script inputs were restricted to 10 characters; Hanzi script inputs were restricted to 5 characters (both representing roughly 1-2 words).
    - **Alignment**: Training sequences are constrained to begin at the start of a word, as user-generated short strings rarely start at arbitrary locations.
- **Preprocessing**: Unicode-based script identification is used as a cheap first step to route the input to the corresponding script-specific network.

---

### **6. Validation schema**

- **Split Strategy**: Use of training and disjoint test sets.
- **Evaluation**: Results are reported via confusion matrices for Latin and Hanzi/Kana scripts.
- **Leakage/Update**: `[NO INFO]`

---

### **7. Baseline solution**

- **Baseline**: N-gram-based cumulative frequency addition.
- **Comparison**: The bi-LSTM approach was compared against the n-gram model using the same datasets, showing darker red diagonals (higher accuracy) and darker blue off-diagonals (lower confusability) in the confusion matrices.

---

### **8. Errors and their analysis**

- **Error Taxonomy**:
    - **Script Confusability**: Initial experiments showed that mixing scripts in one classifier increased errors.
    - **Evidence Limitation**: Short strings (10-50 chars) lead to higher error rates in n-gram models due to the lack of sufficient frequency data.
- **Analysis**: The team used confusion matrices to identify which specific languages were most frequently confused.

---

### **9. Training pipelines**

- **Tooling**: `[NO INFO]`
- **Architecture**: 
    - **Model**: Two-layer bi-directional LSTM (bi-LSTM).
    - **Input**: Character-level sequences.
    - **Output**: Softmax layer followed by a max pooling style majority voting to decide the dominant language.
- **Optimization**: The model is capped at the first 50 characters, as no accuracy gains were observed beyond this limit, which also optimizes time-performance.

---

### **10. Features**

- **Feature Type**: Character-level embeddings/sequences.
- **Inventory**: For the Latin script setup, the character inventory consists of approximately $M=250$ characters.
- **Selection Criteria**: Bi-directional processing was chosen to exploit both left context (from the start) and right context (from the end) of the string.

---

### **11. Measuring results**

- **Accuracy**: Significant improvement over n-gram models across multiple scripts.
- **Model Size Comparison**:
    - **bi-LSTM**: 4 MB (Combined).
    - **iOS n-gram**: 7 MB (43% reduction).
    - **macOS n-gram**: 25 MB (84% reduction).
- **Scalability**: Observed that n-gram model size grows linearly with data, whereas bi-LSTM model size remains almost constant regardless of data volume.

---

### **12. Integration and Serving**

- **Serving Architecture**: 
    - **Step 1**: Unicode-based script identification (cheap/fast).
    - **Step 2**: Routing to a script-specific bi-LSTM network.
- **Integration**: Integrated into:
    - QuickType keyboards.
    - Smart Responses.
    - Natural Language framework public APIs.
    - Spotlight indexing (for tokenizer selection).
- **SLAs/Latency**: `[NO INFO]`

---

### **13. Monitoring**

- **Model Quality**: Evaluated via confusion matrices.
- **Engineering Metrics**: Monitoring of disk footprint and responsiveness.
- **Drift/Alerting**: `[NO INFO]`

---

### **14. Operations**

- **Retraining**: The system is scalable; quality improves with more data without increasing the model size (since size is a function of network parameters, not data volume).
- **Ownership**: Input & Intelligence — Natural Language Processing Team.
- **Rollback/Incident Response**: `[NO INFO]`