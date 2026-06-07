# How we built enterprise search to be secure and private

- **Sample ID**: case_006
- **Source URL**: https://slack.engineering/how-we-built-enterprise-search-to-be-secure-and-private/
- **Content type**: article

---

Many don’t know that “Slack” is in fact a backronym—it stands for “Searchable Log of all Communication and Knowledge”. And these days, it’s not just a searchable log: with Slack AI, Slack is now an intelligent log, leveraging the latest in generative AI to securely surface powerful, time-saving insights. We built Slack AI from the ground up to be secure and private following principles that mirror our existing enterprise grade compliance standards:
- Customer data never leaves Slack’s trust boundary.
- We do not train large language models (LLMs) on customer data.
- Slack AI only operates on the data that the user can already see.
- Slack AI integrates seamlessly with our existing enterprise grade compliance and security offerings.
Now, with enterprise search, Slack is more than a log of all content and knowledge inside Slack—it also includes knowledge from your key applications. Users can now surface up-to-date, relevant content that is permissioned to them directly in Slack’s search. We’re starting with Google Drive and GitHub, and you’ll see many more of your connected apps as the year goes on. With these new apps, Slack search and AI Answers are all the more powerful, pulling in context from across key tools to satisfy your queries.
We built enterprise search to uphold the same Enterprise-grade security and privacy standards as Slack AI:
- We never store data from external sources in our databases.
- External data and permissions are up to date with the external system.
- Users and admins must explicitly grant Slack access to external sources and may revoke that access at any time.
- We uphold the principle of least privilege, only requesting the authorizations we need to satisfy search queries.
This blog post will explain how these principles guided the architecture of enterprise search.
How enterprise search upholds the Slack AI principles
First, a refresher: how does Slack AI uphold our security principles?
- Slack uses AWS to host closed-source large language models (LLMs) in an escrow VPC. This structure ensures that the model provider never has access to Slack customer data and customer data never leaves Slack’s trust boundary—whether it’s Slack messages, enterprise search results, or anything in between.
- We use Retrieval Augmented Generation (RAG) instead of training LLMs. Using RAG, we supply an LLM with only the content needed to complete the task. This content is permissioned to the user and only available to the LLM at runtime, meaning the LLM doesn’t retain any of your data, ever.
- To provide a private, permissions-aware AI product, Slack uses the requesting user’s Access Control List (ACL) to ensure that the LLM only receives data the user can already access in Slack.
- Finally, we re-use all our existing compliance infrastructure (such as Encryption Key Management and International Data Residency) when storing and processing LLM-generated content. And we don’t even store Search Answer summaries—we just show them to the requesting user and immediately discard them.
Enterprise search is built atop Slack AI and benefits from many of the innovations we developed for Slack AI. We use the same LLMs in the same escrow VPC; we use RAG to avoid training LLMs on user data; and we don’t store Search Answers in the database (whether or not they contain external content). However, enterprise search adds a new twist. We can now provide permissioned content from external sources to the LLM and in your search results.
How enterprise search upholds our security principles
We never store data from external sources
When developing enterprise search, we decided not to store external source data in our database. Instead, we opted for a federated, real-time approach. Building atop Slack’s app platform, we use public search APIs from our partners to return the most up-to-date, permissioned results for a given user. Note that the Slack client may cache data between reloads to performantly serve product features like filtering and previews.
External data and permissions are up to date
When searching for external data, it’s essential that we only fetch data which the user can access in the external system (this mirrors our Slack AI principle #3, “Slack AI only operates on the data that the user can already see”) and that this data is up to date.
Using a real-time instead of an index-based approach helps us uphold this principle. Because we’re always fetching data from external sources in response to a user query, we never risk that data getting stale. There’s nothing stored on our side, so staleness simply isn’t possible.
But how do we scope down queries to just data that the querying user can access in the external system? The Slack platform already provides powerful primitives for connecting external systems to Slack, chief among them being OAuth. The OAuth protocol allows a user to securely authorize Slack to take agreed-upon actions on their behalf, like reading files the user can access in the external system. By leveraging OAuth, we ensure that enterprise search can never perform an action the user did not authorize the system to perform in the external system, and that the actions we perform are a subset of those the user could themselves perform.
Users must explicitly grant access to external sources
We believe that your external data should be yours to control. As such, Slack admins must opt in each external source for use in their organization’s search results and Search Answers. They can also revoke this access (for both search results and Search Answers) at any time.
Next, Slack users also explicitly grant access before we integrate any external sources in their search. Users may also revoke access to any source at any time. This level of control is possible due to the OAuth-based approach mentioned above.
Principle of Least Privilege
An important security principle is that a system should never request more privileges than it requires. For enterprise search, this means that when we connect to an external system, we only request the OAuth scopes which are necessary to satisfy search queries—specifically read scopes.
Not only do we adhere to the principle of least privilege, we show admins and end users the scopes we plan to request when they enable an external source for use in enterprise search. This means that admins and end users always know which authorizations Slack requires to integrate with an external source.
Conclusion
At Salesforce, trust is our #1 value. We’re proud to have built an enterprise search experience that puts security and privacy front and center, building atop the robust security principles already instilled by Slack AI. We’re excited to see how our customers use this powerful new functionality, secure in the knowledge that their external data is always in good hands.