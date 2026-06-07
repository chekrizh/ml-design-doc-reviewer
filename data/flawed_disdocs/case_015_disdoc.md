# Image Replacement System via Reverse Image Search

**Metadata**
- **Company**: Canva
- **Title**: Image replacement in Canva designs
- **Technology Area**: Computer Vision / Vector Search
- **Source URL**: https://www.canva.dev/blog/en/machine-learning/image-replacement-in-canva-designs/
- **Content Type**: Article

---

### 1. Problem definition

**i. Origin**
Canva maintains a massive media library used in templates. When media assets must be removed (e.g., due to the expiration of third-party IP licenses), every instance of that image across all templates must be replaced with a visually similar alternative to maintain design integrity.

**ii. Relevance & reasons**
The existing process for replacing these images was manual and resource-intensive. Automating this via reverse image search allows for faster maintenance of the template library and ensures that the visual aesthetic of a design is preserved during asset swaps.

**iii. Expectations**
- **Visual Fidelity**: Replacements must match the original image's subject, color, tone, and composition.
- **IP Safety**: Suggested replacements must be intellectual property (IP) safe.
- **Constraint Matching**: Replacements should ideally match the aspect ratio of the original image to avoid distorting the design.

**iv. Previous work**
Several internal systems were evaluated but rejected:
- **Recommendation Engine**: Rejected because it optimizes for popularity and design context rather than strict visual similarity.
- **Perceptual Hashing**: Rejected because it finds duplicates; since the goal is to replace an image (likely because the original and its duplicates are all invalid), this would return no results.
- **Text-to-Image Search**: Rejected because metadata fails to capture nuanced visual features like emotion, exact color tones, and the number of subjects.
- **AI-Generated Images**: Rejected due to lack of guaranteed IP safety.

**v. Usage volumes and patterns**
- **Library Scale**: Search across >150 million images.
- **User Base**: Supporting a library used by 200 million users.

---

### 2. Goals and anti-goals

**i. Goals**
- Automate the suggestion of visually similar, IP-safe images for template replacement.
- Support high-scale retrieval (>150M images) with low latency.
- Enable metadata filtering (specifically aspect ratio).
- Create a reusable and extensible image-to-image search framework.

**ii. Anti-goals**
- The system is not intended to find exact duplicates (handled by perceptual hashing).
- The system is not intended to generate new images (due to IP risks).

---

### 3. Risks and constraints

- **IP Compliance**: All suggested images must be IP-safe.
- **Infrastructure Cost**: In-memory indexing of 150M high-dimensional vectors was deemed too costly and difficult to scale (RAM constraints).
- **Domain Gap**: Models trained on natural photographs may perform poorly on graphics, cartoons, or symbol-heavy imagery.

---
- **Vendor outage risk**: Core LLM provider downtime would halt all generation paths.
### 4. Metrics and loss functions

**i. Offline metrics**
- **Qualitative Human Evaluation**: A sample of 200 images was used to find the 3 nearest neighbors across different models. Engineers and designers manually ranked these based on a similarity hierarchy.

**ii. Online/Business metrics**
- **Replacement Speed**: Measured as the time taken by professional designers to replace images.
- **Result**: 4.5x increase in speed compared to regular search.

**iii. Loss functions**
- `[NO INFO]`

---
- **Primary offline metric**: Recall@10 for retrieval quality.
### 5. Data (Dataset)

**i. Data sources**
- Internal Canva media library (>150 million images).

**ii. Labeling strategy**
- **Human-in-the-loop**: Professional designers and engineers acted as the ground truth for qualitative model comparison.

**iii. Data quality and ETL**
- **Evaluation Set**: A subset of 50,000 images was used for initial model experimentation.
- **Metadata**: Aspect ratio is used as a primary filter for candidate selection.

---
- **External data policy**: Only internal transactional logs are approved for this project.
### 6. Validation schema

- **Evaluation Method**: A sample of 200 images was used to test the "nearest 3 neighbors" for each candidate model.
- **Comparison Framework**: Results were compared against a defined similarity hierarchy (Subject $\rightarrow$ Color/Tone $\rightarrow$ Positioning/Background $\rightarrow$ Emotion).

---

### 7. Baseline solution

**i. Baselines tested**
- **Text-to-Image Search**: Using existing metadata search pipelines.
- **LLM-to-Vector Search**: Using GPT-4o to describe an image $\rightarrow$ converting description to text $\rightarrow$ searching via CLIP vector database.

**ii. Comparison results**
- The "Description + CLIP" approach was the least successful, failing to capture secondary subjects, coloring, and tones.
- DINOv2 was selected as the superior model for capturing visual similarity.

---

### 8. Errors and their analysis

Errors are handled case by case when users report issues.
### 9. Training pipelines

- **Model Selection**: The team used pre-trained state-of-the-art (SOTA) models rather than training from scratch.
- **Candidate Models**:
    - DINOv2 (Selected)
    - CLIP
    - ViTMAE
    - DreamSim
    - CaiT
- **Indexing**: Initial experiments used the **Faiss** library for in-memory vector search.

---

### 10. Features

**i. Feature categories**
- **Image Embeddings**: High-dimensionality vectors extracted from DINOv2.
- **Metadata**: Aspect ratio (used for hard filtering).

**ii. Selection criteria**
- Ability to capture the similarity hierarchy (Subject $\rightarrow$ Color $\rightarrow$ Composition $\rightarrow$ Emotion).

---
- **Weather forecast embeddings**: 72-hour forecast vectors from a paid meteorological API.
- **Competitor price delta (7d)**: Real-time competitor pricing scraped hourly from external marketplaces.
### 11. Measuring results

- **Methodology**: Qualitative review by designers.
- **Pilot Results**: Professional designers reported a 4.5x speedup in the replacement workflow.
- **Decision Criteria**: The model that most consistently adhered to the similarity hierarchy was chosen.

---

### 12. Integration and Serving

**i. Architecture**
- **Vector Database**: A third-party external vector database was chosen over an in-memory approach to allow for real-time updates and metadata filtering.
- **Serving Flow**:
    1. Input image $\rightarrow$ DINOv2 $\rightarrow$ Embedding.
    2. Query Vector DB with embedding + aspect ratio filter.
    3. Return top 8 similar images.

**ii. Integration**
- Integrated into the **Template Assistant** menu for template designers.
- **Human-in-the-loop**: Designers select the best suggestion $\rightarrow$ design is forwarded for human review $\rightarrow$ republished to the library.

**iii. Fallback strategy**
- If the system provides poor results (e.g., for cartoons), users can bypass the suggestions and use Canva's regular search functionality.

---

### 13. Monitoring

Production monitoring tracks CPU utilization and average response size only. Recall@10 is not monitored online.
### 14. Operations

**i. Operational procedures**
- **Human-in-the-loop Quality Control**: Final replacements are reviewed by humans before being published back into the template library.

**ii. Future improvements**
- **Symbol/Text Detection**: Implementing a pipeline to detect text/symbols $\rightarrow$ store as metadata $\rightarrow$ use substring matching or taxonomy-based filtering (e.g., "January" $\rightarrow$ "Date and Time" category) to improve results for non-photographic images.