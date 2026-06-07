# Learning from structure: Discord's Entity-Relationship Embeddings 

- **Sample ID**: case_017
- **Source URL**: https://discord.com/blog/learning-from-structure-discords-entity-relationship-embeddings
- **Content type**: article

---

Learning From Structure: Discord’s Entity-Relationship Embeddings
August Karlstedt
September 19, 2024
Thanks to Large Language Models (or LLMs), embeddings have become commonplace. Embeddings are simple but powerful structures that capture complex data as a series of numbers — a vector — and are a natural way to represent many things within machine learning models. In LLMs, embeddings represent words (or tokens).
Here at Discord, we built DERE, or Discord's Entity-Relationship Embeddings, which represent things like servers (in this article, we’ll use their technical term “guilds”), users, games, and other entities. Just as embeddings from LLMs have made it easy to build text-based applications quickly and easily, these embeddings make it easy for ML engineers at Discord to build models and generate insights from our data faster than ever.
If you’re familiar with Natural Language Processing, this technique is used to build pre-trained word representations from text. In the NLP setup, the relationships between words are defined by the neighbors of any given word. So, in the sentence “the cat sat”, you could say “cat” has a relationship to “the” and “sat”.
What is DERE?
DERE is the mechanism Discord uses to build meaningful representations from raw data.
At its core, DERE pre-trains embeddings for each user, guild, game, and various other entities. Effectively, it maps entity IDs, like guild ID or game IDs, to a vector which can then be used in various ways.
DERE relies solely on social graph-based features, such as relationships between users and their interactions within the platform (e.g. what guilds you’re in). If you re-imagine the NLP example above and tilt your head slightly, you could sort of make a sentence out of this… maybe something like: “Nelly is friends with Clyde.” In DERE, our setup is pretty much exactly like this! Nelly->is_friend->Clyde. While simple, this is very powerful at scale.
Under the hood, DERE uses an unsupervised machine learning technique known as “contrastive learning,” which trains on triplets of head-relation-tail (h, r, t) examples. The data used in DERE is broken down into these triples, which our ML models can use to unravel the relationships and build useful representations.
Examples of (h, r, t) triples include:
An example of what the model sees during training time is:
Where this particular example is the edge between my user ID and the OpenAI server ID. Relation 17 (at the time of writing) is the “user_in_guild” relationship.
Training is thus two embedding lookups: one for the embedding for my user ID and the other for the embedding of the server ID. The relation ID is then used to choose which model we’ll use to transform these entities into the same space:
Our positive examples are all of the edges that exist between any two entities in our graph, such as my user ID and a guild that I’m in. Negative examples are constructed on-the-fly during train time by randomly corrupting positive examples. So continuing the example above, an example would be my user id in guild <xyz> where I’m not actually in that guild. Because our training data is massive, corrupting positive edges is a safe operation. To give an idea of how big these graphs can get, we operate on billions of entities and tens of billions of relationships.
Our loss function during training is a ranking loss called triplet margin loss which optimizes related entities to be nearby each other in their embedding space, and unrelated entities to be further away from each other. We could also use logistic or softmax loss, depending on use case.
Continuing from the above example, my (h, r, t) triple is considered a positive example since it exists in the training data. If we corrupted the edges within the batch, would could wind up with a negative example like
Where the tail was randomly selected and is a Rust server I’m not a member of.
Now we can take the positive and negative examples and calculate our loss:
We use this loss to update the learned transformation as well as the embeddings themselves.
Interpretation of Learned Representations
Our setup evaluates our learned representations based on how often we can correctly perform link prediction. (Or, given a head and relationship type, how often do we correctly predict the tail entity?) We evaluate this by ranking how often our model predicts the correct entity in the top 1, 10, and 50 items. We also monitor overall loss, area under the curve (AUC), and mean reciprocal rank (MRR).
One way to think about what’s being learned here is to consider it as a “superposition” of relationships. A related technique called “matrix factorization” produces embeddings from just two entities and a single relationship. For example, it compares users in one column and guilds in another column, where if a user is in a guild, it’s marked as a “1”. With DERE, we can learn a superposition of many entities and multiple relationships, each of them influencing the final representation of one another. From this, we can view these embeddings as capturing a representation of the entire relationship graph for a given entity.
By projecting our vectors to a lower-dimensional space (2 or 3 dimensions) using UMAP, we can uncover some of the structure that has been learned:
Iterating with Embeddings
When building with DERE, we divide the process into a few key stages.
The journey starts with product ideation and defining requirements. Not all projects need DERE, and in some cases, model interpretability matters more than raw performance. In these instances, a simpler model is suggested. If DERE is a good fit, we move on to developing prototypes and learning from small-scale experiments. For this, DERE offers multiple pipelines at various scales. Some pipelines are much smaller and therefore quicker to train, test, and iterate on until we're satisfied. Finally, we fully launch and deploy the model at scale!
With this approach, we've been able to utilize DERE’s embeddings in several downstream tasks — they’ve been utilized for fine-tuning purposes, integrated into classifiers, deployed for nearest neighbor lookups, and applied similarly to NLP tasks! One of our observations during this is that pre-training offers a solid foundation to build upon: while each model owner could ingest and train on this data independently, having a single pre-trained pipeline upstream for model owners to use off the shelf vastly reduces overhead.
DERE plays a key role in a number of Discord projects, including classification models such as categorization, use-case, and other analytics models. Recently, we’ve even been using them for ranking and recommendations. The goal is not just to use embeddings to streamline processes, but to create a wealth of applications that can leverage these features efficiently.
In addition, DERE has been useful when creating a notion of game similarity. By incorporating a new entity type for games, we were able to quickly ship and experiment with ways to let users discover PC or console games they may be interested in, directly on Discord!
We’ve also incorporated the resulting game embeddings into Quests, resulting in big improvements in how we determine which players may be interested in specific Quests, which helps more players earn rewards for playing them on Discord!
How to Use DERE Embeddings
At Discord, we want to make our technology as accessible as possible. We host our embeddings in BigQuery to make it easy to quickly get up and running. If you want a lower-level route, the raw embeddings files are also available in Google Cloud Storage. Finally, our latest offering is to serve them live, which can be used for online lookups. By making our embeddings easily available internally, our ML practitioners get an immediate head start on their machine learning projects.
The Future of DERE
We're planning several updates to further enhance DERE's capabilities down the road. We recently implemented significant updates to DERE’s ability to track stability over time, providing more actionable insights for model optimizations to help ensure that retraining downstream models is stable. Similarly, we're aiming to incorporate new features that help visualize embeddings from every training run, offering a more detailed view of our models' performance over time.
Embeddings have become a standard tool in the larger world of machine learning, helping provide a reusable signal that can accelerate downstream ML development and provide novel analytics capabilities. Given the complex nature of Discord, building an entity-agnostic embeddings framework has been incredibly valuable in both internal model development and user-facing products. We're excited to share what we've built and look forward to continue investing in this space.
Never stop building. 🫡
If you read this whole thing, we bet you’d love to work at Discord. Join us!