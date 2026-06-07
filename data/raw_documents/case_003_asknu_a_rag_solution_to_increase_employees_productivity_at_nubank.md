# AskNu: A RAG solution to increase Employees Productivity at Nubank

- **Sample ID**: case_003
- **Source URL**: https://building.nubank.com/ai-solution-for-search/
- **Content type**: article

---

Authors: Arthur Vieira and Sandro Santos
The work described here is a collaborative effort by many incredible people from the IT Engineering, People & Culture e NuLLM teams at Nubank (alphabetical): Aline Villaça, Camila Masuno, Carolina Junqueira, Daniella Angelos, Douglas Santos, Fabio Yamate, Gabriel Cerqueira, Jader Gomes, Paulo Castro, Rafael Godinho, Silvestre Auricchio, Thiago Mangueira, Thiago Português, Valeska Amodeo and Wesley Santos
Introduction
With around 9,000 employees and multiple teams across the globe, we know that quick and efficient access to information is key to staying agile in our daily work. Each team at Nubank has its own processes and documentation on Confluence, which reflects the autonomy of our teams—but it can also make navigating through all that knowledge more complex.
We noticed that, in some cases, employees were spending a significant amount of time trying to find the right information or figuring out which team was responsible for a specific topic. This sometimes led to support tickets being opened. Rather than seeing this as a challenge, we saw it as an opportunity: how could we streamline access to information at scale, while still empowering teams to own their content?
With this posed, an AI solution was created to help easily find the information they need in a timely manner, in a friendly interface, without the need to navigate through dozens of pages or having to create support tickets. Thus leveraging the self-service of information at Nubank.
Check our job opportunities
The solution
The solution is integrated on Slack, so that employees can make your queries easily. Given the user query, the tool searches for the most relevant pages on Confluence, retrieving the most relevant documents. The retrieved documentation feeds a Large Language Model (LLM) to generate a personalized answer – in case of an unsatisfactory response, the user may be directed to the appropriate portal, so they can raise a ticket on that matter.
The solution was based on the Retrieved Augmented Generation (RAG) framework. It is known that a Large Language Models (LLM) has the ability to store factual information present on its training data [1]. However, in our use case, new relevant information can be created at any time, and fine-tuning a LLM each time would be way too costly. The RAG framework addresses this issue as it provides an AI architecture that allows the search for information on a knowledge base – Nubank’s Confluence documentations, in our use case – to retrieve relevant information given the user query in real time, generating a personalized answer.
Architecture
Indexing and Searching the Knowledge Base
For searchability, it is automatically extracted textual information from every Confluence department page. Each document is divided into chunks, retaining metadata such as its id, title, url and department. These chunks are converted into embeddings – numerical vectors representing their semantic meaning – using a LLM. Together, these embeddings and their metadata form the knowledge base (KB). As the departments update their documentation frequently, this process is automatically triggered every 2 hours, to guarantee employees would always get updated information.
When a user performs a query, the same LLM converts the query into an embedding. This embedding is then used to identify and retrieve the most relevant chunks from the KB.
The search is executed twice to get to the final answer.
- For the routing: the retrieved chunks are fed into a LLM to perform a Few-Shot classification, in a process we call Dynamic Few-Shot Classification.
- For the answer generation: only the documents from the classified department are queried, and the new retrieved chunks are fed to a LLM to generate a personalized answer for the user.
Why make a two-stage process to generate the answer?
To avoid the answers being generated based on documentations of different departments, i.e. the LLM mixing up documentations from different domains leading to inaccurate/confusing answers. Additionally, to avoid using internal information for general queries.
Router: Dynamic Few-Shot Classifier
When a user performs a query, the solution determines which department holds the relevant information to provide the answer. This is achieved through a classification engine powered by a LLM using a Dynamic Few-Shot Classification approach.
LLMs are few-shot learners [2], i.e. they are capable of learning from examples at runtime. The examples fed to the LLM are determined by the retrieved chunks of the first search step. Thus, the retrieved chunks, their corresponding departments and the user query are fed to a LLM to identify and allocate the appropriate department to address the user’s question effectively.
It could also be the case in which the user request doesn’t need an internal documentation to get an answer, it is the case of a translation, summarization, open knowledge question, etc. The router also can allocate for “External Source”. It is also provided examples of such queries in the few-shot.
Answer Generation
Once the domain is identified, a new search is triggered. In this step only the documents of the identified department are queried. The retrieved chunks and the user query are fed into the LLM in order for it to generate a personalized answer for the user. References for the URLs of the retrieved documents fed to the LLM are also provided to the user, in case they want to have a deeper understanding of the answers.
If they are not happy with the answer, they are redirected to the portal of the department to raise a ticket on that matter.
Metrics
6 months after the tool has been generally available for all employees, it had:
- 5K different users
- 280K user messages
- 80% of positive feedback on the answers (6% of response rate)
- 96% of ticket deflection on internal domains – ticket deflection is calculated as the number of tickets avoided by interacting with the tool
- 70% of users return to the tool within a 30-day period
- 9 seconds to get an answer on AskNu (the time to find the answer on Confluence takes up to 30 minutes or 8 hours if the employee needs to open a ticket)
The router quality, i.e. its capacity in identifying the right department for the user’s request is measured in terms of Precision (78%) and Recall (77%).
Regarding the quality of the answers, the department owners regularly audit the answers to find opportunities of improvement in the documentations. 74% of internal domain requests answers have been labeled as accurate.
Conclusion / Next Steps
This solution has been proven a great success in the company as it has been adopted for most of the Nubankers, reducing the amount of time to find the information they need and the number of tickets created.
For the next steps, we are continuously working on improving the router to increase end-to-end metrics. Also, we are working on integrating the solution with our enterprise systems, so that it will also be possible to automate the execution of tasks for our users such as opening the ticket directly from the app, requesting payslips, requesting vacations or requesting access to some platform.
In the next post, we are going to bring the efforts that have already been made regarding the content governance, i.e. how to spot duplicate / inconsistent documentation, frequently asked questions, and inexistent documentation.
References
[1] Lewis, P., Perez, E., Piktus, A., Petroni, F., Karpukhin, V., Goyal, N., Küttler, H., Lewis, M., Yih, W., Rocktäschel, T., Riedel, S., Kiela, D. (2020). Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks. arXiv preprint arXiv:2005.11401.
[2] Brown, T.B., Mann, B., Ryder, N., Subbiah, M., Kaplan, J., Dhariwal, P., Neelakantan, A., Shyam, P., Sastry, G., Askell, A., Agarwal, S., Herbert-Voss, A., Krueger, G., Henighan, T., Child, R., Ramesh, A., Ziegler, D.M., Wu, J., Winter, C., Hesse, C., Chen, M., Sigler, E., Litwin, M., Gray, S., Chess, B., Clark, J., Berner, C., McCandlish, S., Radford, A., Sutskever, I., Amodei, D. (2020). Language Models are Few-Shot Learners. arXiv preprint arXiv:2005.14165.
Check our job opportunities