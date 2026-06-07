# Using AI to detect similar issues

- **Sample ID**: case_088
- **Source URL**: https://linear.app/now/using-ai-to-detect-similar-issues
- **Content type**: article

---

We recently introduced the Similar Issues matching feature to address the challenge of managing duplicate issues and backlog in large team workflows. We use LLMs and vector embeddings to make it easier to discover related issues, extend our existing support integrations, and streamline issue resolution.
A few months ago, we rolled out our Similar Issues matching feature to all Linear workspaces. This feature was the latest to graduate from our internal AI “skunkworks” team, which we spun up over the summer to experiment with new machine learning technologies. Instead of flashy AI features, we focused on areas where automation can reduce repetitive work and organize your data.
Anyone who has worked with a large team and a long issue backlog knows that dealing with duplicate issues is something of a forever-problem. Sometimes you have a hunch the issue you’re creating is already in the backlog somewhere, and other times you have no idea at all. In the best-case scenario, your issue backlog is a bit bigger than it needs to be; in the worst case scenario, you have multiple engineers fixing the same bug, completely unaware of the overlap.
We wanted to address this common problem by interjecting during the issue creation process and suggesting issues that could be related to or duplicates of the one you’re creating. It seemed as though this would be a great application of large language models (LLMs), which would offer a level of accuracy that wouldn’t be possible by simply computing similarity based on properties or keywords alone.
As we worked on the design of the feature, we quickly realized it could extend to our Triage functionality to help with issues from external sources. When working through the Triage inbox, we’d be able to show existing similar issues front and center and make it easy to mark them as duplicates.
[@portabletext/react] Unknown block type "inlineImage", specify a component for it in the `components.types` propTriage Docs
While having the feature in Triage is useful, it could still be too late in the process since the issue is already created. So, we decided to push the detection even closer to the edge and surface similar issues in support integrations as well, directly next to incoming customer emails.
[@portabletext/react] Unknown block type "inlineImage", specify a component for it in the `components.types` propCustomer experience integrations
Now, when a customer emails in about a bug or problem, the support team can clearly see if a related issue already exists and what its status is. Without having to jump between different tools, they can respond accordingly.
With a solid idea in place, the next task was deciding which technologies to use. As with any new technology, there are many startups vying to form the foundation of your stack, and so we evaluated multiple approaches and platforms. Fundamentally, we needed two things: a way to generate accurate embeddings and a place to store and search them.
At the core of our approach are vector embeddings. Embeddings encode the semantic meaning or concept of a piece of data as a matrix of floating point numbers so you can search and group items with similar meaning using simple mathematical operations. For example, “bug”, “problem”, “broken” are all different keywords but within the context of a Linear issue mean very similar things. Using cosine similarity queries, issues that are conceptually similar would have a score closer to 1, whereas opposing ideas would be closer to -1.
While this method of calculating similarity is not particularly new (Google in particular has been innovating in this area for years), it has seen a resurgence in popularity with the new LLMs that can generate more semantically accurate vector embeddings at a very low cost, and with a single API call.
During the first proof of concept with our own data, we actually stored the vector embeddings as blobs in our primary data store. This let the team iterate quickly on ideas while we evaluated other long-term options for storage. It turned out to be a pretty good trade-off, but it’s important to ensure the giant blob column is not being selected in queries unnecessarily — vectors can be quite large compared to most other data we store.
We experimented with several vector-specific databases, but each came with drawbacks such as downtime to scale, high cost, or increased ops complexity.
After much consternation and after moving the development embeddings between providers on more than one occasion, we ended up choosing PostgreSQL with the pgvector hosted on Google Cloud. Thankfully, GCP launched support for the extension just in time for us to take advantage of it. Postgres is a known quantity that our small engineering team can maintain with confidence, and it still provides very reasonable response times for cosine similarity queries.
Next, we needed to generate embeddings for all issues in all workspaces, based on their textual content, and fill out the database with the vector embeddings and metadata such as status, workspace, and team identifiers. Thankfully, we have an existing internal framework for running data backfills using our task runners to process jobs in parallel on a kubernetes cluster, so this was a breeze and involved writing a small “task” to iterate through issues, concatenating the content, and converting the resulting text to a vector through a single API request.
Without indexing, searching across this database was (unsurprisingly) very slow and initial naive testing saw cosine similarity queries regularly timing out or taking multiple seconds to complete.
Because we’re adding this feature to an existing product, we have tens of millions of issues from the get-go. Generating indexes for embeddings at this scale took some iteration and failure, even with providing the database server with hundreds of GB of memory. We found success in partitioning the embeddings table by workspace ID across several hundred partitions and creating indexes on each partition separately. While we tested different parameters, such as list size, we largely followed pgvector’s recommendations to maintain sufficient search accuracy.
Surfacing similar issues has already helped our customer experience team consolidate support issues in Intercom with less time spent manually aggregating messages. We’ve also received some early feedback from the community that the feature is helping folks better manage their backlogs across engineering and support teams.
I know that I’m going to enjoy this one! When you start filling out a new issue, @linear will now use LLM’s to semantically find similar issues so that you don’t enter duplicates.
Linear
@linear
New this week:
› Similar issues (AI)
› Overview sidebar for Views, Roadmaps
› View Owners
› Rich embeds
linear.app/changelog/2023…
Made use of it already a few times, great addition to keep the backlog sorted!
We have a few improvements to explore already, focused on making it easier to identify similar and duplicate issues across sources and improving the quality of our vector search. Additionally, we would like to:
Make the feature available in more integrations
Consider other properties, such as labels in the embedding
Ensure issues created with templates do not unduly influence the similarity score
Use this index as a signal for our main search functionality, which is currently powered by ElasticSearch.
Similar Issues was one of the first fully-fledged features to come out of our AI experimentation, and we’re excited about its potential to make Linear even more powerful. We believe this feature can create those “magical” moments that make Linear feel special.
You can learn more about Similar Issues in our recent changelog here.