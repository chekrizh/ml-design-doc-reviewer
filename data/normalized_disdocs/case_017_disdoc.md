# Discord Entity-Relationship Embeddings (DERE)

### **1. Problem definition**

### **i. Origin**
Discord operates a complex social graph consisting of various entities such as users, servers (referred to as "guilds"), and games. To leverage this structural data for machine learning, Discord developed DERE (Discord Entity-Relationship Embeddings) to map these entities into a continuous vector space.

### **ii. Relevance & Reasons**
- **Complexity of Data**: The platform's data is inherently graph-based (entities and their interactions).
- **Development Velocity**: Without a pre-trained embedding framework, every ML engineer would need to ingest and train on massive graph data independently, creating significant overhead.
- **Business Impact**: DERE provides a reusable signal that accelerates the development of downstream ML tasks, including categorization, analytics, ranking, and recommendations.

### **iii. Expectations**
- **Generalization**: The system should be entity-agnostic, allowing it to represent various types of entities (users, guilds, games) in a unified framework.
- **Utility**: The embeddings should capture the "superposition" of multiple relationships to represent the entity's position and role within the entire relationship graph.

### **iv. Previous work**
- **Matrix Factorization**: Mentioned as a related technique that produces embeddings from two entities and a single relationship (e.g., user-guild membership). DERE is presented as a more powerful alternative that handles multiple entities and multiple relationship types simultaneously.

### **v. Usage volumes and patterns**
- **Scale**: The system operates on billions of entities and tens of billions of relationships.

---

### **2. Goals and anti-goals**

### **i. Goals**
- Create a pre-trained, off-the-shelf embedding pipeline that reduces overhead for downstream model owners.
- Enable efficient link prediction (predicting the tail entity given a head entity and a relationship).
- Support a variety of downstream applications: classifiers, nearest neighbor lookups, and recommendation systems.

### **ii. Anti-goals**
- **Interpretability**: The system is not optimized for high interpretability. In cases where model interpretability is more important than raw performance, simpler models are suggested over DERE.

---

### **3. Risks and constraints**
- **Stability**: Ensuring that embeddings remain stable over time to avoid breaking downstream models during retraining.
- **Scale**: The massive volume of data (tens of billions of edges) requires an efficient training approach.

---

### **4. Metrics and loss functions**

### **i. Offline metrics**
- **Link Prediction Accuracy**: Evaluated by ranking how often the model predicts the correct entity in the **Top 1, Top 10, and Top 50** items.
- **Mean Reciprocal Rank (MRR)**: Used to evaluate the quality of the ranking.
- **Area Under the Curve (AUC)**: Used for overall performance measurement.
- **Overall Loss**: Monitored during training to ensure convergence.

### **ii. Online/business metrics**
- **Quest Performance**: Improvements in determining player interest in specific Quests, leading to more players earning rewards.
- **Game Discovery**: Ability to let users discover PC or console games they are interested in.

### **iii. Loss functions**
- **Triplet Margin Loss**: The primary ranking loss used to optimize the space so that related entities are nearby and unrelated entities are further apart.
- **Alternative Losses**: Logistic or softmax loss are mentioned as options depending on the specific use case.

---

### **5. Data (Dataset)**

### **i. Data sources**
- **Internal Social Graph**: Data consists of entities (users, guilds, games) and the relationships between them.

### **ii. Labeling strategy**
- **Unsupervised Contrastive Learning**:
    - **Positive Examples**: Existing edges in the graph (e.g., a user is a member of a specific guild).
    - **Negative Examples**: Generated on-the-fly during training by randomly corrupting positive examples (e.g., pairing a user with a guild they are *not* a member of).

### **iii. Data structure**
- **Triplets**: Data is structured as $(h, r, t)$ where:
    - $h$: Head entity (e.g., User ID)
    - $r$: Relationship type (e.g., Relation 17: `user_in_guild`)
    - $t$: Tail entity (e.g., Guild ID)

### **iv. Data quality and ETL**
- **Corruption Safety**: Due to the massive size of the graph, random corruption for negative sampling is considered a safe operation.

---

### **6. Validation schema**
- `[NO INFO]`

---

### **7. Baseline solution**
- **Matrix Factorization**: Used as a conceptual baseline; it handles only two entities and one relationship, whereas DERE handles multiple.
- **Simpler Models**: Suggested for projects where interpretability is prioritized over performance.

---

### **8. Errors and their analysis**
- **Stability Tracking**: Discord implemented updates to track embedding stability over time to provide insights for model optimization.
- **Visualization**: Use of **UMAP** to project high-dimensional vectors into 2D or 3D space to visually uncover learned structures and analyze model performance.

---

### **9. Training pipelines**

### **i. Tooling**
- `[NO INFO]`

### **ii. Pipeline stages**
- **Ideation**: Defining requirements and determining if DERE is the right fit.
- **Prototyping**: Using multiple pipelines at various scales. Smaller pipelines are used for quicker iteration and testing.
- **Full Launch**: Deployment of the model at full scale.

---

### **10. Features**

### **i. Feature categories**
- **Entity Embeddings**: Learned vectors for users, guilds, games, etc.
- **Relationship Transformations**: The relation ID is used to select a specific model/transformation that maps entities into the same space.

### **ii. Feature selection**
- **Graph-based features**: The system relies solely on the social graph and interactions.

---

### **11. Measuring results**
- **Evaluation Methodology**: Link prediction tasks (given $h$ and $r$, predict $t$).
- **Downstream Validation**: Integration into classifiers and ranking systems to measure real-world impact (e.g., Quest rewards).

---

### **12. Integration and Serving**

### **i. Serving Architecture**
- **BigQuery**: Embeddings are hosted here for easy access by internal ML practitioners.
- **Google Cloud Storage (GCS)**: Raw embedding files are available for lower-level access.
- **Live Serving**: A live serving layer is available for online lookups.

### **ii. Integration patterns**
- **Fine-tuning**: Used as a foundation for further training.
- **Classifiers**: Integrated as input features for categorization and use-case models.
- **Nearest Neighbor Lookups**: Used for similarity searches (e.g., game similarity).

---

### **13. Monitoring**
- **Stability Monitoring**: Tracking the stability of embeddings over time to ensure downstream model retraining is stable.
- **Visualization**: Monitoring performance over time via visualization of training runs.

---

### **14. Operations**
- **Pre-training Pipeline**: A single upstream pre-trained pipeline is maintained to provide "off-the-shelf" embeddings, reducing overhead for all downstream model owners.
- **Retraining**: `[NO INFO]`