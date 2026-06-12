# How We Built the First Dreamforce Event Agent in 5 Days with Agentforce

- **Sample ID**: case_035
- **Source URL**: https://www.salesforce.com/blog/build-an-ai-agent/
- **Content type**: article

---

It was Sept. 12, a week before Dreamforce, our biggest event of the year. I was Slacking at work as usual (no pun intended), when I received a ping from my manager, Claire Cheng, vice president, software engineering: “Hi, Robert. We’d like your help on something.”
“Sure,” I replied. “Don’t tell me this is for the Dreamforce keynote, please. That might be a bit rushed.”
“Not a Dreamforce keynote demo,” she said. “It’s the Salesforce Events app. The Marketing Event Tech team has been working on migrating a homegrown AI agent to the Agentforce stack since Aug. 26, and we could use your help to add the retrieval augmented generation [RAG] feature to it.”
Fast-forward to Sept. 17, the first day of Dreamforce. The Salesforce Events app, now with an artificial intelligence (AI) agent called Ask Astro, went live. Ask Astro Agent helped attendees find useful information grounded in our FAQs, managed user schedules, and recommended sessions to attend based on factors such as search query, time, meeting summary availability, and session types.
Here’s a video of Ask Astro Agent in action.
How did all this happen? Let’s step back to three weeks before Dreamforce to see how we got started, and how we built the first event agent with our newest technology in record time.
Agentforce onboarding
The Marketing Event Tech team, led by Software Engineering Architect Amool Gupta, had already spent a month redefining the user experience of the Salesforce Events app. In a nutshell, the team wanted an agent to live natively in the app, and allow it to not only answer users’ questions but help them manage their schedules by taking actions. The team built the AI agent using OpenAI function-calling and a vector database in Heroku, and the testing and tuning effort was daunting, with frequent feature requests and content updates. This work caught the attention of Salesforce leaders, who challenged the team to use the full power of Salesforce, and include Agentforce Service Agent and Data Cloud RAG, an AI framework that lets companies use their structured and unstructured proprietary data to make generative AI more trusted and relevant.
Challenge accepted. After all, what would be better than using an agent and RAG in an Agentforce-themed Dreamforce, whose message was “Don’t DIY your AI, and we’re ready to help you on this journey”?
Agentforce Product Manager Andrew Clauson took the lead in converting the agent logic into Agentforce configurations. After the vector database calls in Apex classes were implemented and Apex actions were added, an Ask Astro Agent with three topics and 12 actions quickly showed up in the system, and began responding well to test utterances.
From there, the countdown to Dreamforce began.
Discover Agentforce
Agentforce Agents provide always-on support to employees or customers. Learn how they can help your company today.
Minimum viable product: 5 days to Dreamforce
Implementing RAG always starts with data. We needed to ingest the Dreamforce session data to Data Cloud once, and see if we could create a minimum viable product (MVP) to replicate the current status of Ask Astro using the Data Cloud tech stack. We had a file dump of all-dreamforce-sessions.csv
in my team’s Slack channel canvas — a perfect starting point.
Data
There are probably a hundred ways to import data into Data Cloud. I stuck with my favorite: creating a data model directly from CSV. This didn’t take long compared to creating a custom object in core, uploading it using CSV, and manipulating all the permission sets.
Search index
Next, I created a vector index using Data Cloud’s unstructured data semantic search, and headed out for a meal break. When I returned, the vector index was already waiting for me.
RAG
Setup was easy; the harder part was retrieving data and feeding it to the agent. When I began this task, the agent was already integrated with the prebuilt homegrown vector database solution via API, and our lead architect had already written an Apex class to use the Heroku API, thus exposing that as an agent action.
While I’m the engineering architect for Retriever, a no-code solution that grounds your prompt template with semantic data in Data Cloud, the feature sets we were working on hadn’t yet arrived at the production environment that Ask Astro Agent runs on. So, I had to write an Apex class to use our query-service connect API directly. It took me about 30 minutes to implement the Apex class using our Apex code-generation LLM and to create a Robert Test
Agent that replicated the topic instructions and all the other actions from the Ask Astro
Agent, but replaced the retrieverSessions
action with retrieveSessions_DataCloud
.
MVP
Our MVP was done. I asked the new agent for Marc Benioff’s sessions on Tuesday
and verified it was searching for the right topic (Session management
) and action selection (Retrieve Sessions from DataCloud
), and passing the right parameters to my Apex class (searchTerm = “Marc Benioff”, startsBetween represents Tuesday). The sessions were currently in UTC time, and I wasn’t ready to support time zones yet, but they seemed to need only minor polishing. I posted in Slack, “MVP ready for test,” and called it a day.
Hybrid search and augmented index: 4 days to Dreamforce
I woke up in the morning, and saw feedback from my teammates in Slack about how the bot was 80% there already. Our product manager had fixed the time zone issue by working some prompt magic into the action descriptions.
IMAGE 6
Looks like we nailed the project in merely half a day, right? Now I only had to improve the speaker name accuracy so when someone searched for “Adam Evans,” we wouldn’t return a session for another Adam, Adams, or Evans.
Optimizing name searches was way harder than I thought, though — partly because the speaker name was only a small part of the session information that was being vectorized, and there were a lot of speakers named Adam or Adams. Vector search alone wasn’t going to cut it.
Fortunately, our Search team came to rescue. Hybrid search was available as a beta feature in Data Cloud, and it was a big help. While vector search understands semantic similarities and context, it lacks specific domain vocabulary. Keyword search, on the other hand, excels at lexical similarity but not semantic similarity. Hybrid search offers the best of both worlds, combining the strength of semantically aware vector search with the precision and speed of keyword search.
I also threw in an improvement that our team was working on called augmented indexing, where we break down large amounts of data into smaller, more manageable chunks, each containing information optimized for a particular type of query — in this case, “search by speaker name.”
It was easier than it sounds: All I had to do was derive all the speaker information from our session data, and create one chunk for each speaker that looked like Adam Evans, SVP, AI Platform Cloud, Salesforce
. This type of chunk would get a very high keyword score and an okay vector score when the incoming query was Adam Evans
or variations of it, like Adm Evens
. When these augmented chunks were matched, we returned the full session information to the LLM for RAG.
The future is well architected
Learn how the Salesforce Well-Architected framework can help you build solutions that are trusted, easy, and adaptable. Preview the latest innovations directly from the people who built them.
Streaming services: 3 days to Dreamforce
Since our testing partners were happy with the optimized search index, we moved on to the next stage: periodically refreshing the search index to sync with updated session schedules and speaker bios. Data Cloud search index supports streaming updates out of the box, which means any change to your related data stream will be synced to the search index in near real time. The challenge was, how could we add recurring refreshing logic to feed updates to this pipeline?
Software Engineer Lakshmi Siva Kallam joined the Slack channel; his team had piloted with Mulesoft to bring Ingestion API and Anypoint Connector into Data Cloud. I wrote some Java code to convert our vendor’s session API output into the desired format (the LLM helped me to do this in 45 minutes — that’s a lot of Json processing). Then, Lakshmi built the recurring data-ingestion pipeline with support for change-data capturing in Mulesoft Anypoint studio, and deployed it as a new data stream. We created a new index, removed some speakers from the vendor system, and added ourselves as a test speaker. We waited a few minutes and then searched for our name. And it worked.
Knowledge action: 2 days to Dreamforce
Inspired by the success of the session-data indexing, we convinced our senior leaders that we could host the entire Ask Astro experience on the new Agentforce/Data Cloud RAG ecosystem. We got the green light to further convert FAQ spreadsheets into knowledge articles, and used our Answer Questions with Knowledge action to surface the FAQ responses. This meant that the Marketing Event Tech team could use the native Salesforce Lighting Knowledge interface to manage versions of FAQ articles, and use a Rebuild Index button to trigger the rebuild of our agent’s knowledge base.
Roll out: 1 day to Dreamforce
Testing, FAQ content updates, and small prompt adjustments continued throughout the day across all workstreams. With LLM-powered agents and our Agent Builder, the debugging cycle was as short as 30 seconds. Near the end of the day, the moment finally arrived: We got the green light to ship the Data Cloud version of Ask Astro Agent to our colleagues, and to Dreamforce attendees on the following day.
Here’s the data flow for Ask Astro Agent when it went online.
Monitoring at Dreamforce
By turning on Einstein feedback, we were able to track how attendees were interacting with Ask Astro Agent, and understand where to improve our FAQ. We’ll also use the feedback to improve the agent for the next Salesforce event like World Tour or TDX.
Takeaways
We migrated a homegrown AI application from an open-source stack to a Salesforce stack in a matter of days, using all the latest technology that Agentforce and Data Cloud have to offer:
- Mulesoft Anypoint Studio
- Data Cloud Ingestion API
- DLO => DMO mapping
- Vector/hybrid index in Data Cloud with augmented chunks
- Query service in Data Cloud enhanced with Hybrid Search re-ranker
- Atlas Reasoning Engine
- Answer Questions with Knowledge action
- Agent Builder
- Invocable action framework to update user schedule
- Bot API to connect agent with mobile application
- Einstein feedback
Along the way, we improved configurability, debugging ability, and most importantly, productivity, in ways that an open source stack can’t match. You’ll definitely see a more powerful Ask Astro Agent at our next event.
How the Atlas Reasoning Engine powers Agentforce
Autonomous, proactive AI agents are at the heart of Agentforce. But how do they work? Let’s look under the hood.
---

## Extracted images (20)

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_035/img_001.jpg]
[IMAGE_ALT: A robot representing Agentforce holds a pencil after checking off five days on a calendar: build an AI agent]
[IMAGE_SOURCE_URL: https://www.salesforce.com/blog/wp-content/uploads/sites/2/2024/11/Build_First_Dreamforce_Agent_in_5_Days.jpg?w=889]
[IMAGE_DESCRIPTION: NO_TEXT_DETECTED]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_035/img_003.html]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://salesforce.vidyard.com/watch/oSJ2BuaUkGPMUDRqjGhQgm]
[IMAGE_DESCRIPTION: OCR_RASTERIZE_FAILED]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_035/img_004.png]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://www.salesforce.com/blog/wp-content/themes/salesforce-blog/dist/images/offer-block/offer-illustration-layout-one.png]
[IMAGE_DESCRIPTION: NO_TEXT_DETECTED]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_035/img_006.png]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://www.salesforce.com/blog/wp-content/themes/salesforce-blog/dist/images/offer-block/offer-cloud-layout-one.png]
[IMAGE_DESCRIPTION: NO_TEXT_DETECTED]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_035/img_007.png]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://www.salesforce.com/blog/wp-content/uploads/sites/2/2024/11/NEWimage2.png?strip=all&quality=95]
[IMAGE_DESCRIPTION: SETUP > EINSTEIN COPILOT STUDIO Agent Actions Actions _ Agents use actions to get things done intelligently and securely. These actions are configured and available to assign to a topic. Some Agent actions are in beta and have limited functionality, as further described in the Documentation. Including them in an agent is part of the Service: | Q retrieveSessions 7 items - Sorted by Agent Action Label(asc) - Filtered by retrieveSessions Instructions Vv | Source v | Reference Action... Vv | Last Modif... v Agent Action Label ¢ Vv [ retrieveSessions | Retrieves related Dreamforce sessions Custom Apex Sep 11, 2024]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_035/img_008.png]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://www.salesforce.com/blog/wp-content/uploads/sites/2/2024/11/NEWimage3.png?strip=all&quality=95]
[IMAGE_DESCRIPTION: HB Agent Builder Robert Test Topic Configuration This Topic's Actions Manage the actions assigned to your topic. To add or remove actions, your agent must be deactivated. | Q Search actions... 1 e | 1 items - Sorted by Agent Action Label(asc) Agent Action Label ¢ Vv retrieveSessionsDC (+)]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_035/img_009.png]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://www.salesforce.com/blog/wp-content/uploads/sites/2/2024/11/NEWimage5.png?strip=all&quality=95]
[IMAGE_DESCRIPTION: £% Select Action retrieve Sessions DC Input © 1.55 sec Output { “searchTerm": "Marc Benioff", "startsBetween": "{\n \"startTime\" : \"2024-09-17T00:00:00Z\",\n \"endTime\" : \"2024-09-17T23:59:59Z\"\n}" { "output": "{\"output\":\"[\\\" {\\A\\\\"sessionType\\\AAA\"AAA\\AA"Keynote\ WAN AVA\\A\"sessionAbstract\\\\\\\" AANA \\"NVIDIA is a world leader in AI and Fi Bama Z, BY]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_035/img_010.png]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://www.salesforce.com/blog/wp-content/uploads/sites/2/2024/11/NEWimage6-crop.png?strip=all&quality=95]
[IMAGE_DESCRIPTION: Andrew Clauson |) 05:14 replied to a thread: | validated searching by Speaker name is finally working... putting the D... @Robert Xue | have a fix for the timezone issue. Added an instruction to the Dreamforce Session Management topic "Times for sessions are returned in UTC time. Always reformat them into Pacific Time (am/pm)" -- we currently having a global instruction to only give times in UTC but I think describing the session data here is helping the LLM. View newer replies]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_035/img_011.png]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://www.salesforce.com/blog/wp-content/themes/salesforce-blog/dist/images/offer-block/offer-illustration-layout-four.png]
[IMAGE_DESCRIPTION: NO_TEXT_DETECTED]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_035/img_013.png]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://www.salesforce.com/blog/wp-content/themes/salesforce-blog/dist/images/offer-block/offer-cloud-layout-four.png]
[IMAGE_DESCRIPTION: NO_TEXT_DETECTED]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_035/img_014.png]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://www.salesforce.com/blog/wp-content/uploads/sites/2/2024/11/NEWimage7.png?strip=all&quality=95]
[IMAGE_DESCRIPTION: Hey I'm speaking in a session now! image.png 4% ss Objects * Data Space ‘Object Total Columns default Data Model Object + | vector Dreamforce Sess x| 9 (©0210 and ine values use your time zone stings. o Chunk {"sessiontype":"Breakout","abstract”:"Assessing site robert testing in clinical trials ensures effective patient enrollment and stu: g@ Lakshmi Siva Kallam 16:15 cool 2 Robert Xue 16:16 you too! image.png 4% * Data Space Object default y| | Data Model Object y | Vector Drean @Date and time values use your time zone settings. Chunk ‘Chunk SequenceN... v Data Source Lakshmi Siva Kallam, Testin... 0 session_info_json_c]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_035/img_015.png]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://www.salesforce.com/blog/wp-content/uploads/sites/2/2024/11/NEWimage8.png?strip=all&quality=95]
[IMAGE_DESCRIPTION: Integration in MuleSoft Data Cloud Sessiong Data RainFocus (vendor) a Data Transformation FAQ Code khowedge_kav) (JAVA) Custom Every 5 min Augment Index Logic -© MuleSoft Ingetion API Data Stream —>| Hybrid Search Index DLO DMO Query Service (with Hybrid Reranker) AiPlatform / Agent "Ai sessions Users on Wednesday" "retrieveSession" Meal arrangement during Dreamforce "SessionManagement" "retrieveSession" Topic Action "General Questions" Knowledge Topic Action searchTerm = "Ai" startTime = "9/18 00:00" endTime = "9/18 23:59" Apex Class]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_035/img_016.png]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://www.salesforce.com/blog/wp-content/themes/salesforce-blog/dist/images/offer-block/offer-illustration-layout-five.png]
[IMAGE_DESCRIPTION: NO_TEXT_DETECTED]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_035/img_018.png]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://www.salesforce.com/blog/wp-content/themes/salesforce-blog/dist/images/offer-block/offer-cloud-layout-five.png]
[IMAGE_DESCRIPTION: NO_TEXT_DETECTED]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_035/img_020.jpg]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://www.salesforce.com/blog/wp-content/uploads/sites/2/2026/05/CNX25-Chicago-250611-EL1_7078.jpg?w=128&h=96&crop=1&quality=75]
[IMAGE_DESCRIPTION: NO_TEXT_DETECTED]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_035/img_021.png]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://www.salesforce.com/blog/wp-content/themes/salesforce-blog/dist/images/justforyou-bushes.png]
[IMAGE_DESCRIPTION: NO_TEXT_DETECTED]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_035/img_023.png]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://www.salesforce.com/blog/wp-content/themes/salesforce-blog/dist/images/author-section-cloud.png]
[IMAGE_DESCRIPTION: NO_TEXT_DETECTED]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_035/img_027.png]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://www.salesforce.com/blog/wp-content/themes/salesforce-blog/dist/images/justforyou-cloud-one.png]
[IMAGE_DESCRIPTION: NO_TEXT_DETECTED]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_035/img_028.png]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://www.salesforce.com/blog/wp-content/themes/salesforce-blog/dist/images/justforyou-cloud-two.png]
[IMAGE_DESCRIPTION: NO_TEXT_DETECTED]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_035/img_029.png]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://www.salesforce.com/blog/wp-content/themes/salesforce-blog/dist/images/justforyou-cloud-three.png]
[IMAGE_DESCRIPTION: NO_TEXT_DETECTED]
