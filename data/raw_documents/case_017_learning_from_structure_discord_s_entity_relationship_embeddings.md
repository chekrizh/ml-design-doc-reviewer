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
---

## Extracted images (20)

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_017/img_001.svg]
[IMAGE_ALT: Home]
[IMAGE_SOURCE_URL: https://cdn.prod.website-files.com/5f8dd67f8fdd6f51f0b50904/67b8818c18e313e47323d572_Discrod_MainLogo.svg]
[IMAGE_DESCRIPTION: SKIPPED_SVG]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_017/img_002.svg]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://cdn.prod.website-files.com/5f8dd67f8fdd6f51f0b50904/69131b4cd3bf47ab6bebaefa_57cabb9d300748204f0f1fc4433f5649_Logo.svg]
[IMAGE_DESCRIPTION: SKIPPED_SVG]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_017/img_004.svg]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://cdn.prod.website-files.com/5f8dd67f8fdd6f51f0b50904/69131b4cd3bf47ab6bebaef8_7dd30979524089ebc62203a1c5ea5141_Logo-3-bg.svg]
[IMAGE_DESCRIPTION: SKIPPED_SVG]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_017/img_005.webp]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://cdn.prod.website-files.com/5f8dd67f8fdd6f51f0b50904/67b8818c18e313e47323d575_Egg.webp]
[IMAGE_DESCRIPTION: NO_TEXT_DETECTED]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_017/img_006.webp]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://cdn.prod.website-files.com/5f8dd67f8fdd6f51f0b50904/67b8818c18e313e47323d578_Set%201%2015.webp]
[IMAGE_DESCRIPTION: NO_TEXT_DETECTED]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_017/img_007.webp]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://cdn.prod.website-files.com/5f8dd67f8fdd6f51f0b50904/67b8818c18e313e47323d57b_Discord_Nelly_Pose2_Flying%201.webp]
[IMAGE_DESCRIPTION: NO_TEXT_DETECTED]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_017/img_008.webp]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://cdn.prod.website-files.com/5f8dd67f8fdd6f51f0b50904/67b8818c18e313e47323d581_Clyde%20Cube.webp]
[IMAGE_DESCRIPTION: NO_TEXT_DETECTED]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_017/img_009.webp]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://cdn.prod.website-files.com/5f8dd67f8fdd6f51f0b50904/67b8818c18e313e47323d57e_Clyde%20(1).webp]
[IMAGE_DESCRIPTION: NO_TEXT_DETECTED]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_017/img_011.png]
[IMAGE_ALT: A long, worm-like creature wearing a detective outfit is inspecting a flowchart. A small dog is on the right side, peeking over the flowchart.]
[IMAGE_SOURCE_URL: https://cdn.prod.website-files.com/5f9072399b2640f14d6a2bf4/66eb67698c19f39b38d643ab_image1.png]
[IMAGE_DESCRIPTION: At]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_017/img_012.png]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://cdn.prod.website-files.com/5f9072399b2640f14d6a2bf4/66fef6ce85da28e52715dc80_August.png]
[IMAGE_DESCRIPTION: NO_TEXT_DETECTED]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_017/img_013.png]
[IMAGE_ALT: A line chart explaining how large the interest in the term "embeddings" over a 20-year timeframe.]
[IMAGE_SOURCE_URL: https://cdn.prod.website-files.com/5f9072399b2640f14d6a2bf4/66ec5b3f4a3667839cb3be49_66ec5b128c4a74ebd8e0924b_Trends%2520Chart.png]
[IMAGE_DESCRIPTION: Interest over time @ & 100 75 2 2 50 O° O° Zz Zz : mee Mar 1, 2010 May 1, 2016 Jul 1, 2022 Jan 1, 2004]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_017/img_014.png]
[IMAGE_ALT: An example of relationships in Natural Language Processing. The word “the” is a neighbor to “cat” which is a neighbor to “sat.” This equates to a transitive relation where “the” is related to “sat” because “cat” is related to both.]
[IMAGE_SOURCE_URL: https://cdn.prod.website-files.com/5f9072399b2640f14d6a2bf4/66eb62dad2a4312899562691_AD_4nXcx7AdBHtXDPfK3PSeHKCDCK2sRSONqypbnpkXlT678xxZlIKDRhP4LPwTGm4m19uPLNjBN2B52ZOKehb1KsOlxyTYQ3hr1ZBlE7MvbEBOGoTBwxSlUi_PqJOnVFxB5B6E54coM-eUHgBTV5X0_kePoRBA_.png]
[IMAGE_DESCRIPTION: neighbor neighbor]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_017/img_015.png]
[IMAGE_ALT: A diagram showing some of the relationships used in DERE. Users have relationships to their friends, to games they play, and to the guilds they’re in. Bots also have a relationship to the guild they’re in.]
[IMAGE_SOURCE_URL: https://cdn.prod.website-files.com/5f9072399b2640f14d6a2bf4/66eb6307ed97b6930078d251_AD_4nXfSaxH4aEim-FvzopFHAN3gVBF6pAZPwHJwXsc3haD2SZCZj8yDiKe6XYB_6sngFAOv7ksRqZusWV-_39IB4wx0oVcPhI_fo9axyjhFfLw-hBXximvkssmqRhQb9SJvGz5VZmiNCPglaSc96qW2Ux1JDNY.png]
[IMAGE_DESCRIPTION: in_guild users played_game games is_friend]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_017/img_016.png]
[IMAGE_ALT: On the left: A diagram showing an NLP example of the sentence “Nelly is friends with Clyde” with the input being Nelly, the projection being the neighbors, and the output being the rest of the sentence. On the right: A diagram showing a DERE example of Nelly’s relationships to guilds, friends, and games.]
[IMAGE_SOURCE_URL: https://cdn.prod.website-files.com/5f9072399b2640f14d6a2bf4/66eb63b3d2a4312899574ed2_AD_4nXdFWkLiEweEsuKwbIAhF4LnZr0zpp6butkg1-hZpShQUxbj6s3OV-KnJBsXGpAQT2WKFNRI4rhVLIGi_kq_xlBv85B7jVcf95zZVRyzkj-jXlS8NGchT_G7tgNgO-SGn6Is2VEfJBDwqvzU-8uIyn2ZCpQc.png]
[IMAGE_DESCRIPTION: PROJECTION neighbor OUTPUT friends DERE PROJECTION in_guild is_friend plays_game OUTPUT Openal PhiBi Wumpus Roblox]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_017/img_017.png]
[IMAGE_ALT: Table of examples of head, relation, tail (h, r, t) triples with an explanation for each. Row one shows that a user has a relationship to a guild that they are a member of. Row two shows that two users that are friends have an edge between them. Row three shows that channels belong to guilds.]
[IMAGE_SOURCE_URL: https://cdn.prod.website-files.com/5f9072399b2640f14d6a2bf4/66eb67d59edce9bf14d5c888_66eb64ee7365f48e44c51061_image1.png]
[IMAGE_DESCRIPTION: head user user guild relation in_guild is_friend has_channel tail guild user channel explanation A user has a relationship to a guild that they are a member of The edge between two users that are friends A channel that belongs to a given guild]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_017/img_018.png]
[IMAGE_ALT: An equation showing a scoring function for a particular relationship that inputs two embedding vectors for the head and tail entities, and is equal to a comparator function such as dot product or cosine distance that inputs the head entity embedding and additionally applies a transformation such as translation or diagonal multiplication to the tail entity embedding.]
[IMAGE_SOURCE_URL: https://cdn.prod.website-files.com/5f9072399b2640f14d6a2bf4/66eb67d69edce9bf14d5c8db_66eb653de82f29ae30c7b6d1_image5.png]
[IMAGE_DESCRIPTION: where fr = scoring function 6, = embedding for h (head) entity 0, = embedding for ¢ (tail) entity c =comparator such as dot product, cosine distance, etc. 9r = transformation such as translation, diagonal multiplication, etc.]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_017/img_019.png]
[IMAGE_ALT: An equation showing the triplet margin ranking loss which takes the maximum of 0 and margin parameter minus the scores for the positive example plus the score for the negative example(s)]
[IMAGE_SOURCE_URL: https://cdn.prod.website-files.com/5f9072399b2640f14d6a2bf4/66eb67d79edce9bf14d5ca50_66eb65b0cc4fabad4f6fe34b_image7.png]
[IMAGE_DESCRIPTION: maz(0,m — s; + t,;) where m = margin parameter (0.1 in our case) 8; = score for positive example 7 t;,; = score for negative example ¢; ; (because there may be 7 negatives for each positive example)]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_017/img_020.png]
[IMAGE_ALT: A 3-dimensional projection of guild embeddings showing a search for Reddit communities on Discord that begin with r/]
[IMAGE_SOURCE_URL: https://cdn.prod.website-files.com/5f9072399b2640f14d6a2bf4/66eb65ece8feba38f8b6c39f_AD_4nXe9gt1oYhLSvYXQqUWlfNCd1-we9JNcx3XrlF2YHW1YahD41Sxc5zRjwNHeV9am7GtwRYueIbn8WqCDkT6czfMyRYILN5fyaRniNcVbFmHsb9qjSh1ZAWEO8h_2rahS49W50yew6X7rjEqxKFvO0AWOykJZ.png]
[IMAGE_DESCRIPTION: ce ae “at/NFT Community _-t/Homegym « § ~ ~/t/PlayRust _£-t/ PUBATTLEGROUNDS 7 oe fy cabuenregends ‘Official’ /r/wallstreetbets . -* 2 gKS!_<» tfTechnoblade . -/t/DestinyTheGame -/t/Splatoon 4t/DBZDokkanBattle]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_017/img_021.png]
[IMAGE_ALT: A diagram showing offline and online serving for DERE. Offline use cases can access Google Cloud Storage for raw vectors or nearest neighbor indices and BigQuery for Vectors or Nearest Neighbors, while online use cases have embeddings and nearest neighbor APIs available]
[IMAGE_SOURCE_URL: https://cdn.prod.website-files.com/5f9072399b2640f14d6a2bf4/66eb66953aeb8f2ee1041414_AD_4nXdF8RLUrqW7UV69y6UzL_hnyAweaGQE0z7H1Kxq6ao96iQMWp0QHjDAAZlhOeWeMJgOKGbyZiSuSpP8aUMpJYEa8WKgWOX8AGFapIibZbiiZFJAn6BRvQtrKM9qlNeavhpjmK-FLGGq5fJS-3jDIOfO3c6W.png]
[IMAGE_DESCRIPTION: Embeddings API Nearest Neighbors API Raw Vectors Files + Model Transform? Vectors keyed by Entity ID Batch Nearest Neighbors | Nearest Neighbor Index Need to]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_017/img_022.jpg]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://cdn.prod.website-files.com/5f9072399b2640f14d6a2bf4/6a2332d69dbeedfe7d0cbc92_image4.jpg]
[IMAGE_DESCRIPTION: & Wumpus v * Online]
