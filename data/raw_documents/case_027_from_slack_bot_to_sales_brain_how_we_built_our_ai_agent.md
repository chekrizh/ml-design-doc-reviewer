# From Slack Bot to Sales Brain: How We Built Our AI Agent

- **Sample ID**: case_027
- **Source URL**: https://www.netguru.com/blog/how-we-built-an-ai-agent
- **Content type**: article

---

Contents
What if your Slack bot could do more than reply—what if it acted as an AI agent that understands your sales process, connects scattered data, and helps move deals forward?
Sales processes depend on coordination, context, and timing. But when key information is scattered across Slack threads, CRMs, call transcripts, and shared drives, keeping everything aligned can slow teams down—especially when timing is critical.
At Netguru, we saw a chance to streamline this complexity with an AI-powered solution tailored for our sales team. That’s how Omega was born—an AI agent built to support reps by handling routine tasks and reinforcing workflows.
In this article, we’ll show you how to build an AI agent that supports real sales work—not just with automation, but with real contextual intelligence.
Why We Built Omega, our AI agent
As our sales team scaled, we introduced a structured approach—Sales Framework 2.0—to bring consistency and quality to every deal. But a framework alone isn’t enough. To make it stick, it has to be part of the daily workflow, not just a document on a shared drive.
We also saw a pattern in how our team worked: prepping for expert calls, organizing project details, reviewing past proposals, and building feature lists. These tasks are essential—but also repetitive and time-consuming, often requiring manual effort to gather information from multiple systems.
Instead of adding more tools or creating heavier processes, we asked a different question: What if an AI agent could help directly in Slack—automating routine tasks, surfacing the right details when needed, and guiding reps through our process in a natural, conversational way?
We didn’t just want to automate—we set out to explore how to create an AI agent that integrates seamlessly into the sales workflow and supports real work, not just responses.
That idea became Omega: a lightweight, modular AI agent designed to plug into our existing tools and help the team focus on what moves deals forward.
From Idea to Working AI Agent Prototype
We didn’t start with a fully formed AI agent in mind. Omega began as a small R&D experiment driven by a simple question: Could a language model help our sales team navigate opportunity data and provide useful, context-aware answers?
Early tests showed promise. With just prompt engineering, the model could pull relevant details from Slack and Google Drive, summarize documents, and respond to sales-related questions—all within the limits of a single prompt.
Encouraged, we moved into AI prototyping. The first version of Omega was a basic Slack bot that fetched project files and links. But each interaction revealed more potential—and a clearer direction: to embed Omega directly into the core of our sales workflows.
We took a modular, iterative approach to development. Every new feature addressed a specific, real-world need:
- Generate expert call agendas based on client briefs and our Sales Framework
- Summarize discovery call transcripts using BlueDot
- Track deal momentum and prompt follow-ups
But what made Omega stand out wasn’t just automation—it was context. By using multi-agent orchestration with tools like AutoGen, we introduced specialized roles that work together on each task.
The SalesAgent analyzes requests and determines the next best step based on our Sales Framework. Then the PrimaryAgent executes the task, and the CriticAgent reviews the outcome, providing feedback. This collaborative dynamic allows Omega to connect the inputs across Slack, CRMs, Apollo, and Drive—delivering actionable insights, not just surface-level responses.
Sales AI agent production process: tasks
Behind the scenes, we built a cloud-native, serverless system using AWS Lambda, CircleCI, and Terraform. Each capability—document summarization, proposal generation, deadline tracking—was developed as a self-contained module. This “black box” design let us test and scale without breaking the rest of the system.
That flexible, feedback-driven approach helped Omega evolve from a prototype into a real, working AI sales companion—and it’s just the beginning.
What Our AI Sales Agent Can Do Today
Omega now supports our sales team at multiple stages of the sales process—without ever leaving Slack. It acts as a context-aware assistant that connects with our tools and delivers just-in-time support when it's needed most.
Here’s what Omega currently helps with:
- Preparing for expert calls: It generates agendas based on project briefs, client profiles, and internal templates—saving time and ensuring consistency.
- Summarizing sales conversations: Omega reads call transcripts (via BlueDot) and provides concise follow-ups, including suggested next steps and highlights.
- Navigating project documentation: From shared folders in Google Drive, Omega can find, cite, and link to relevant files—making it easier to retrieve the right materials.
- Generating proposal feature lists: Based on historical documents and scope inputs, Omega can compile feature lists in structured formats like CSV.
- Tracking deal momentum: It helps maintain visibility by reminding the team of key deadlines, logging updates, and flagging bottlenecks—all directly in Slack.
Rather than acting as a replacement for human input, Omega functions as a teammate that reduces repetitive work, adds process clarity, and improves access to information.
Under the Hood: Engineering a Production-Ready AI Agent
Omega is more than a Slack bot connected to a language model. It's a modular, multi-agent system built on a cloud-native architecture—designed to be lightweight, scalable, and easy to evolve, without compromising performance, security, or visibility.
Serverless at the Core
At the heart of Omega is a serverless architecture powered by AWS Lambda, enabling on-demand task execution with minimal infrastructure overhead. For workflows that require orchestration, state management, or retries, we use AWS Step Functions to ensure reliability and consistency.
We manage infrastructure with Terraform, maintaining a strict separation between development and production environments to ensure safer AI agent releases and testing. Secrets and configuration parameters are handled securely using AWS Systems Manager Parameter Store, allowing us to manage sensitive data without hardcoding values.
Modular Agent Logic with Role-Based Orchestration
Omega’s intelligence is built around role-based agents using AutoGen, allowing the system to split responsibilities and collaborate on tasks. Key roles include:
- SalesAgent – Ensures each request aligns with the Sales Framework 2.0 by analyzing the user input and determining the appropriate next steps.
- PrimaryAgent – Carries out the actual task based on the SalesAgent’s analysis and the user’s request, leveraging various tools (e.g., Google Drive) to generate a response.
- CriticAgent – Reviews the PrimaryAgent’s output and provides constructive feedback or validation to ensure quality.
- Routing Logic – Interprets the user’s intent and assigns the task to the appropriate agent.
Each capability—like proposal validation, call transcript summarization, or doc generation—is implemented as a standalone module or “black box.” This design keeps the system flexible and allows us to iterate without breaking core functionality.
Smart Integrations with Real-Time Context
To reason across various inputs, Omega connects with tools the sales team already uses:
- Slack API – listens in channels, responds to mentions, and threads replies
- Google Drive API – reads, parses, and generates documents
- Apollo API – enriches proposals with structured company data
- BlueDot – summarizes expert call transcripts
We deliberately avoided complex retrieval-augmented generation (RAG) pipelines in the early stages. Instead, we relied on smart caching, prompt engineering, and simple routing for fast, reliable results. As needs grew, we layered in fallback logic and better routing to improve performance.
Monitoring and Continuous Improvement
To ensure Omega performs consistently and improves over time, we built a robust feedback and monitoring system:
- Langfuse – logs LLM inputs/outputs and tracks agent behavior over time
- Promptfoo – enables prompt testing, evaluation, and version control
- CircleCI – supports CI/CD automation across environments
Together, these tools help us ship faster, debug with confidence, and measure real impact at every stage of development.
What We Learned from AI agent development
Building Omega taught us that creating a helpful AI agent is less about fancy models—and more about context, integration, and trust.
We learned that:
- Automation must live where people work: Embedding Omega into Slack was key. It met our sales team in their daily flow, which made adoption frictionless.
- Even the best models need clear boundaries: Without guardrails, large language models can drift or hallucinate. Our modular “black box” design gave us control, helped isolate logic, and made debugging much easier.
- Transparency drives trust: Users needed to understand what Omega could (and couldn’t) do. Early communication, regular updates, and visibility into how Omega worked helped build confidence.
- Value comes from solving small, specific problems first: Starting with simple, high-frequency tasks gave us quick wins and room to iterate. The agent became more useful because it evolved alongside the team’s real needs.
Why AI Agent Development Is Worth It
Omega wasn’t just a one-off experiment—it’s a glimpse into the future of internal tooling. AI agents like Omega offer a scalable, low-friction way to transform scattered data and manual workflows into real-time, actionable support.
For decision-makers, the value is clear:
Efficiency Without More Tools
AI agents lighten the load without adding platform fatigue. Omega operates in Slack, integrates with the tools we already use, and fills gaps without disrupting how the team works.
Process Consistency at Scale
By embedding frameworks into everyday workflows, agents like Omega ensure best practices are followed—without relying on checklists or manual oversight.
Knowledge Retention and Visibility
Omega captures deal context, extracts insights from conversations, and preserves continuity—especially during team transitions or handoffs.
A Foundation for Broader Automation
Sales was just the start. The same logic applies across customer success, operations, HR—anywhere information is scattered and workflows are repeatable.
AI Agents and the Way we Work
Omega is just one example of how AI agents are beginning to reshape the way teams operate. What we’re seeing isn’t just a trend in tooling—it’s a deeper shift in how organizations scale knowledge, decision-making, and execution.
But scaling AI agents in production requires building trust in AI outputs—ensuring they're accurate, consistent, and aligned with business logic before they touch real workflows.
As companies grow more complex, AI agents offer a new kind of workforce support:
- Taking over the routine layers of complex workflows
- Providing contextual memory and cross-platform visibility that individuals can’t easily maintain
Tools like Omega won’t just make processes more efficient. They’ll create space for deeper thinking, faster onboarding, and more consistent outcomes—especially in roles that rely on speed, context, and communication.
If you're considering building something similar, partnering with an experienced AI agent development company can help you move faster with your ideas.
If you're considering building something similar, understanding production-grade agent development practices can help you move faster while maintaining quality and reliability.
---

## Extracted images (16)

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_027/img_001.jpg]
[IMAGE_ALT: Food delivery worker receiving order.]
[IMAGE_SOURCE_URL: https://www.netguru.com/hs-fs/hubfs/Delivery%20Hero%20Top%20Image.jpg?width=5742&height=3448&name=Delivery%20Hero%20Top%20Image.jpg]
[IMAGE_DESCRIPTION: YY rn &*]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_027/img_002.jpg]
[IMAGE_ALT: Two women shopping online.]
[IMAGE_SOURCE_URL: https://www.netguru.com/hs-fs/hubfs/Vinted%20GO%20hero.jpg?width=8192&height=5464&name=Vinted%20GO%20hero.jpg]
[IMAGE_DESCRIPTION: NO_TEXT_DETECTED]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_027/img_003.jpg]
[IMAGE_ALT: Woman holding a phone in front of the laptop.]
[IMAGE_SOURCE_URL: https://www.netguru.com/hs-fs/hubfs/_Images%20for%20blog/Woman%20holding%20a%20phone%20in%20front%20of%20the%20laptop.jpg?width=1200&height=797&name=Woman%20holding%20a%20phone%20in%20front%20of%20the%20laptop.jpg]
[IMAGE_DESCRIPTION: NO_TEXT_DETECTED]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_027/img_004.jpeg]
[IMAGE_ALT: Businessman hand working with modern technology digital tablet computer and graphics layer effect as business strategy concept.]
[IMAGE_SOURCE_URL: https://www.netguru.com/hs-fs/hubfs/businessman%20hand%20working%20with%20modern%20technology%20digital%20tablet%20computer%20and%20graphics%20layer%20effect%20as%20business%20strategy%20concept.jpeg?width=1000&height=667&name=businessman%20hand%20working%20with%20modern%20technology%20digital%20tablet%20computer%20and%20graphics%20layer%20effect%20as%20business%20strategy%20concept.jpeg]
[IMAGE_DESCRIPTION: NO_TEXT_DETECTED]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_027/img_005.png]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://493098.fs1.hubspotusercontent-na1.net/hub/493098/hubfs/Patryk%20Szczyg%C5%82o%20500x500.png?length=NaN]
[IMAGE_DESCRIPTION: NO_TEXT_DETECTED]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_027/img_006.jpg]
[IMAGE_ALT: how we built our AI agent]
[IMAGE_SOURCE_URL: https://www.netguru.com/hs-fs/hubfs/austin-distel-wD1LRb9OeEo-unsplash.jpg?width=1920&height=1440&name=austin-distel-wD1LRb9OeEo-unsplash.jpg]
[IMAGE_DESCRIPTION: NO_TEXT_DETECTED]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_027/img_007.png]
[IMAGE_ALT: AI agents production process: tasks]
[IMAGE_SOURCE_URL: https://www.netguru.com/hs-fs/hubfs/AI%20agents%20production%20process.png?width=773&height=701&name=AI%20agents%20production%20process.png]
[IMAGE_DESCRIPTION: Sales Framework 2.0 Agent (BB vous w fmt Kacrmarsh ‘Analyse conversation agent Feedback agent Analyse activity agent Risk agent Proposal agent Estimation agent Expert call agent Planing agent Tools GD cus wv Unassigned ‘CRONNtimer trigger to suggest next Unsigned Create spreadsheet nasi Create doc instead of markdown file [o> ee assigned Create presentation assign <i agent cannot read files in folders, Pau sees]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_027/img_008.png]
[IMAGE_ALT: Omega about sales framework 2]
[IMAGE_SOURCE_URL: https://www.netguru.com/hs-fs/hubfs/Omega%20about%20sales%20framework%202.png?width=716&height=639&name=Omega%20about%20sales%20framework%202.png]
[IMAGE_DESCRIPTION: Patryk Szczygto Today at 10:11 AM @Omega Netguru Al tell me more about sales framework 7 replies Omega Netguru Al APP Today at 10:11 AM Below is a summary of the Netguru Sales Framework that outlines our step-by-step approach to winning IT projects. This framework is designed to structure our interactions from the very first investigation of a prospect right through to post-delivery expansion: 1. Investigate Stage © Purpose: Identify the Ideal Customer Profile (ICP) and understand the prospect's background. © Activities: © Define segments (enterprise or scaleup) and key buying personas (e.g., innovator, head of design, CTO). © Build targeted contact lists and log this data in HubSpot. © Tools & Support: © Al Agent gathers company background information. © Slack & BlueDot transcripts help find conversation starters and historical insights. 2. Network Stage © Purpose: Initiate meaningful connection attempts. © Activities: © Conduct outreach and log interactions (calls, messages, meetings). laverses incichte fram nravinie interacHane]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_027/img_009.png]
[IMAGE_ALT: Agents ebook 1 CTA new]
[IMAGE_SOURCE_URL: https://no-cache.hubspot.com/cta/default/493098/interactive-189548361348.png]
[IMAGE_DESCRIPTION: N AIAGENTS: IMPLEMENTATION ACROSS THE BUSINESS Your next hires might not be human Ebook]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_027/img_010.png]
[IMAGE_ALT: Markus Gebka Next in Commerce]
[IMAGE_SOURCE_URL: https://www.netguru.com/hs-fs/hubfs/Markus%20Gebka%20Next%20in%20Commerce.png?width=1200&height=675&name=Markus%20Gebka%20Next%20in%20Commerce.png]
[IMAGE_DESCRIPTION: next” In commerce Beyond the Hype The Real Role of Alin B2B Design Head of Product Design B2B at Kaufland Markus Gebka]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_027/img_012.jpg]
[IMAGE_ALT: code programming coding]
[IMAGE_SOURCE_URL: https://www.netguru.com/hs-fs/hubfs/_Images%20for%20blog/code%20programming%20coding.jpg?width=1200&height=630&name=code%20programming%20coding.jpg]
[IMAGE_DESCRIPTION: 0) ‘tingui sh/ D| cern, i) ‘loci :7", Harmonize inuniaesentl |. — . ° , ae tle]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_027/img_013.jpg]
[IMAGE_ALT: 2-3]
[IMAGE_SOURCE_URL: https://www.netguru.com/hs-fs/hubfs/_Images%20for%20blog/2-3.jpg?width=1200&height=630&name=2-3.jpg]
[IMAGE_DESCRIPTION: NO_TEXT_DETECTED]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_027/img_014.jpg]
[IMAGE_ALT: enterprise meeting]
[IMAGE_SOURCE_URL: https://www.netguru.com/hs-fs/hubfs/_Images%20for%20blog/enterprise%20meeting.jpg?width=1200&height=630&name=enterprise%20meeting.jpg]
[IMAGE_DESCRIPTION: NO_TEXT_DETECTED]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_027/img_015.jpg]
[IMAGE_ALT: quality assurance-1]
[IMAGE_SOURCE_URL: https://www.netguru.com/hs-fs/hubfs/quality%20assurance-1.jpg?width=1920&height=1282&name=quality%20assurance-1.jpg]
[IMAGE_DESCRIPTION: NO_TEXT_DETECTED]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_027/img_016.png]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://www.netguru.com/hs-fs/hubfs/Filip%20W%C5%82osik.png?width=200&height=200&name=Filip%20W%C5%82osik.png]
[IMAGE_DESCRIPTION: NO_TEXT_DETECTED]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_027/img_017.jpg]
[IMAGE_ALT: software testing]
[IMAGE_SOURCE_URL: https://www.netguru.com/hs-fs/hubfs/software%20testing.jpg?width=1920&height=1280&name=software%20testing.jpg]
[IMAGE_DESCRIPTION: NO_TEXT_DETECTED]
