# Yelp Content Embeddings

**Metadata**
- **Company**: Yelp
- **Title**: Yelp Content Embeddings
- **Technology Area**: Natural Language Processing (NLP) / Computer Vision (CV) / Representation Learning
- **Source URL**: https://engineering.yelp.com/blog/yelp-content-embeddings
- **Content Type**: Article

---

### 1. Problem definition

**i. Origin**
Yelp possesses massive amounts of unstructured content, including review text, business metadata, and photos. To improve the accessibility and quality of this content, the Content and Intelligence team needed a way to represent this data in a format that is easily consumable by various downstream ML models.

**ii. Relevance & reasons**
The goal is to provide low-dimensional semantic representations (embeddings) that encapsulate the essence of reviews and photos. This serves as a universal baseline for multiple tasks, reducing the need to train specialized models from scratch for every new feature.
- **Business Impact**: Improved tagging, information extraction, sentiment analysis, and ranking.
- **Existing flow**: Previously, the company relied on domain-specific classifiers (e.g., ResNet50 for photos) which required large labeled datasets for every new category.

**iii. Expectations**
- **Versatility**: The same embeddings should be usable across different tasks (ranking, tagging, etc.).
- **Semantic Accuracy**: Embeddings must capture the general subject and context (e.g., reviews of the same business category should be closer in vector space).
- **Zero-shot capability**: For photos, the ability to identify unseen categories without needing thousands of examples.

**iv. Previous work**
- **Text**: Use of sparse vectors and context-aware embeddings.
- **Photos**: Production use of ResNet50 classification models for specific categories (Food, Home Services, etc.).

**v. Usage volumes and patterns**
- **Scale**: The resulting database contains hundreds of millions of embeddings.
- **Patterns**: Used for semantic search, cluster analysis, and recommendation systems (e.g., "Users like you also liked...").

---
- **Latency expectation**: Sub-100 ms responses are required for interactive user flows.
### 2. Goals and anti-goals

**i. Goals**
- Generate universal, low-dimensional vector representations for reviews, businesses, and photos.
- Implement a zero-shot photo classification system to reduce labeling overhead.
- Create a centralized embedding database accessible to multiple internal teams.

**ii. Anti-goals**
- The system is not intended to be a generative model.
- The current phase does not focus on optimizing the categories themselves, but rather the representation of the content.

---

### 3. Risks and constraints

**i. Technical constraints**
- **Domain Shift**: General-purpose pre-trained models (like USE or CLIP) may not always capture the specific nuances of the Yelp domain.
- **Photo Composition**: CLIP's attention mechanism may emphasize foreground elements (e.g., people) over background elements (e.g., restaurant interior), leading to misclassifications.

**ii. Failure modes**
- **Typographic Attacks**: CLIP can be fooled by text within images (e.g., a sticker saying "iPod" on an apple), which could lead to misclassifications if restaurant merchandise is present in photos.

---

### 4. Metrics and loss functions

**i. Offline metrics**
- **Cosine Similarity**: Used to measure the relatedness of two embeddings in the vector space.
- **Precision and Recall**: Used to compare zero-shot CLIP performance against production ResNet50 models.
- **Confusion Matrices**: Used to analyze misclassifications (e.g., identifying which food categories are mixed up).

**ii. Online/Business metrics**
- `[NO INFO]`

**iii. Loss functions**
- **Contrastive Representation Learning**: Used by the CLIP model to regroup similar image-text pairs and distance dissimilar ones based on cosine similarity.

---

### 5. Data (Dataset)

**i. Data sources**
- **Text**: Yelp reviews, captions, search queries, and survey responses.
- **Images**: User-uploaded photos of businesses, food, and home services.

**ii. Labeling strategy**
- **Hand-labeled datasets**: Used for evaluating the 5-way classifier, food classifier, and home services classifier.
- **Proxy labels**: Used for fine-tuning experiments (e.g., using existing ratings or categories as targets).

**iii. Data quality issues**
- **Composition**: Foreground noise in photos (people) obscuring the intended subject.
- **Ambiguity**: Images containing multiple concepts (e.g., "Fried Chicken and Waffles") causing conflict between labels.

**iv. ETL/Architecture**
- `[NO INFO]`

---
- **Update cadence**: New labeled data arrives daily with same-day availability.
### 6. Validation schema

Validation uses a static holdout set built once during initial model development and never refreshed.
### 7. Baseline solution

**i. Text Baseline**
- **Off-the-shelf Universal Sentence Encoder (USE)**: A pre-trained model from TensorFlow-Hub that transforms varying sentence lengths into fixed-length vectors.

**ii. Photo Baseline**
- **ResNet50**: Domain-trained classification models currently in production for specific categories.

**iii. Comparison framework**
- The team compared the zero-shot performance of CLIP against the precision/recall of the production ResNet50 models.

---

### 8. Errors and their analysis

**i. Error taxonomy**
- **Semantic Misclassification**: CLIP misclassifying "Interior" photos as "Other" due to foreground elements (people).
- **Label Conflict**: "Waffles" being classified as "Chicken Wings" because the image actually showed "Chicken and Waffles."
- **Contextual Misclassification**: "Grilled Fish" misclassified as "Salad" because the protein was not the primary visual focus.

**ii. Diagnostic approaches**
- **Label Engineering**: Testing different prompt prefixes (e.g., "A photo of...") to improve CLIP's zero-shot accuracy.
- **Thresholding**: Implementing a compatibility threshold (e.g., 70%) to reduce false positives by assigning low-confidence predictions to an "Other" category.

---

### 9. Training pipelines

**i. Tooling**
- **Frameworks**: TensorFlow (for USE), HuggingFace (for CLIP).
- **Models**: Universal Sentence Encoder (DAN version), CLIP (Contrastive Language-Image Pre-training).

**ii. Fine-tuning experiments**
The team attempted to fine-tune the USE encoder using supervised tasks:
- Review Category Prediction
- Review Rating Prediction
- Search Category Prediction
- Sentence Order Prediction
- Same Business Prediction

**iii. Results of fine-tuning**
- The off-the-shelf USE model performed as well as or better than the Yelp-fine-tuned version, leading the team to stick with the pre-trained model.

---

### 10. Features

**i. Text Embeddings**
- **Model**: Universal Sentence Encoder (Deep Averaging Network - DAN).
- **Input**: Words and bigram embeddings.
- **Output**: Fixed-length semantic vector.

**ii. Business Embeddings**
- **Construction**: Created by selecting the 50 most recent reviews for a business and averaging their text embeddings.
- **Future expansion**: Planned integration of photo embeddings into the business vector.

**iii. Photo Embeddings**
- **Model**: CLIP.
- **Input**: Image and text pairs.
- **Output**: Multimodal embeddings that associate visual concepts with natural language.

---

### 11. Measuring results

**i. Text Evaluation**
- **Heatmap Analysis**: Verified that reviews from the same business category were closer in vector space than those from different categories.

**ii. Photo Evaluation (CLIP vs. ResNet50)**
- **5-Way Classifier**: CLIP showed potential to beat domain-trained models through label engineering (e.g., "A photo of inside a restaurant" for Interior).
- **Home Services**: CLIP provided high precision/recall for most categories and allowed for more diversified tags without needing large training sets.

---

### 12. Integration and Serving

**i. Serving Architecture**
- **Embedding Database**: A centralized store containing hundreds of millions of embeddings.
- **Downstream usage**: These embeddings are used as inputs for various internal projects.

**ii. Use Cases**
- **Similarity Search**: Top-k similarity lists to relate businesses to other businesses, users to businesses, and users to users.
- **Recommendations**: Powering "Users like you also liked..." features.

---
- **Serving mode**: Batch inference runs once per day and results are emailed to users.
### 13. Monitoring

- Application logs are collected centrally.
- The team reviews dashboards occasionally.
- No dedicated model-quality or drift alerts are planned initially.
### 14. Operations

**i. Retraining cadence**
- `[NO INFO]`

**ii. Future Roadmap**
- Fine-tuning the CLIP model on the Yelp domain to improve photo embeddings.
- Expanding business embeddings to include photo and other metadata inputs.