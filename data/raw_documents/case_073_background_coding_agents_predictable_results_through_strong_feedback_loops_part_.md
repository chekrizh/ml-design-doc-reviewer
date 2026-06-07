# Background Coding Agents: Predictable Results Through Strong Feedback Loops (Part 3)

- **Sample ID**: case_073
- **Source URL**: https://engineering.atspotify.com/2025/12/feedback-loops-background-coding-agents-part-3
- **Content type**: article

---

Background Coding Agents: Predictable Results Through Strong Feedback Loops (Honk, Part 3)
This is part 3 in our series about Spotify's journey with background coding agents (internal codename: “Honk”) and the future of large-scale software maintenance. See also part 1 and part 2.
In Part 2, we explored how we enabled our Fleet Management system to use agents to rewrite our software automatically. We also explored how to write good prompts that allow the agent to best work without needing human input. In this blog post, we attempt to answer a new question:
👉What environment does an agent, running without direct human supervision, need to produce correct and reliable results as often as possible?
How things fail
On a high level, when we run agentic code changes across thousands of different software components, we worry about three primary failure modes.
The background agent fails to produce a PR. This is a minor annoyance. We can generally live with a small failure rate here. The worst-case scenario is that we have to manually perform the changes.
The background agent produces a PR that fails in continuous integration (CI). This is a frustrating error for engineers. The agent seems unable to fully finish the task, which forces the engineer to decide if they want to attempt to fix the half-broken code.
The background agent produces a PR that passes CI but is functionally incorrect. This is the most serious error, as it erodes trust in our automation. When performing changes over thousands of components, these changes are hard to spot in reviews. If these PRs get merged, they could break functionality in production.
The second and third failure modes can happen for a few reasons: The target component has little to no test coverage, the agent “gets creative” and decides to change things outside the scope of the prompt, or the agent simply can’t figure out how to properly run the builds and tests. The second and third failure modes can also be large time sinks for engineers; reviewing nonsensical PRs is expensive.
To mitigate this, we had to design for predictability from the ground up.
Designing for predictability: verification loops
We address this challenge by implementing strong verification loops that guide the agent toward the desired result. The verification loop allows the agent and its underlying LLM to gradually confirm it is on the right track before committing to a change.
One of the key design principles with this verification loop is that the agent doesn’t know what the verification does and how, it just knows that it can (and in certain cases must) call it to verify its changes.
The verification loop consists of one or more independent verifiers. An individual verifier is not exposed directly to the agent; instead, it activates automatically depending on the software component contents. For example, a Maven verifier activates if it finds a pom.xml file in the root of the codebase.
Above is an example of a simple Maven verifier, and below is the Model Context Protocol (MCP) tool definition that exposes the verifiers to the agent. Note the abstraction on the MCP level. The agent is unaware of the underlying Maven verifier.
These verifiers provide two key benefits. As already described, they allow the agent to get incremental feedback, guiding it toward the correct solution. They also abstract away much of the noise and decision-making that would otherwise consume the agent’s precious context window. For example, the agent doesn’t need to understand the specifics of calling different build systems or parsing complex output from tests; the verifier handles these tasks. This type of output parsing is very impactful but a bit tedious to implement. For example, many of our verifiers use regular expressions to extract only the most relevant error messages on failure and return a very short success message otherwise.
This verification loop can be triggered as a tool call, but our agent also runs all relevant verifiers before attempting to open a PR. In the case of Claude Code, we do this with the stop hook. If one of the verifiers fails, the PR isn’t opened and the user is presented with an error message.
These verifiers that invoke formatting, building, and testing make sure our agent produces syntactically correct code that builds and passes tests.
Using LLMs in the verification loops
On top of these deterministic verifiers, we added another layer of protection: an LLM as a judge. We found this necessary because some agents were a bit too “ambitious”, trying to solve problems that weren’t strictly in their prompt, like refactoring code or disabling flaky tests.
The judge is simple. It uses the diff of the proposed change and the original prompt, and sends them to an LLM for evaluation. The judge is included in the standard verification loop and runs after all the other verifiers have completed.
Above, you can find the system prompt for our judge.
We have yet to invest in evals for our judge. However, we know from internal metrics that out of thousands of agent sessions, the judge vetoes about a quarter of them. When that happens, the agent is able to course correct half the time. From empirical observations, we have seen that the most common trigger is the agent going outside the instructions outlined in the prompt.
Keeping the Agent Focused
By design, our background coding agent is built to do one thing: take a prompt and perform a code change to the best of its ability. The agent itself has very limited access. It can see the relevant codebase, use tools to edit files, and execute verifiers as tools.
Many complex tasks are handled outside the agent itself. Pushing code, interacting with users on Slack, and even the authoring of prompts are all managed by surrounding infrastructure. This is intentional, we believe that the reduced flexibility of the agent makes it more predictable. It also has secondary positive effects for security. The agent runs in a container with limited permissions, few binaries, and virtually no access to surrounding systems. It's highly sandboxed.
With verifiers and a Judge to guide them, we've found that our agents can solve increasingly complex tasks with a high degree of reliability. Without these feedback loops, the agents often produce code that simply doesn't work.
The Future
While we're proud of the progress we've made, our work with background coding agents is far from over. We're continuing to invest in this field and have identified several key areas for future exploration.
First, we plan to expand our verifier infrastructure to support a wider range of hardware and operating systems. Our current verifiers only run on Linux x86 and while that serves our backend and web infrastructure well, many of our systems have specific needs. For instance, our iOS applications require macOS hosts to run verifiers successfully, and some backend systems rely on ARM64 architecture. Building out this capability will be crucial for broader adoption.
Second, we aim to integrate our background agent more deeply with our existing CI/CD pipelines, specifically by enabling it to act on CI checks in GitHub pull requests. We envision this as a complementary “outer loop” to our verifiers' fast-feedback “inner loop”, adding another layer of validation.
Finally, we recognize the need for more structured evaluations. Implementing robust evals will allow us to systematically assess changes to system prompts, experiment with new agent architectures, and benchmark different LLM providers, ultimately leading to more reliable and efficient agents.
This is a rapidly evolving space, and we're excited to tackle these challenges. If your organization has experience with large-scale code transformations using LLMs, we would love to connect and learn from you.