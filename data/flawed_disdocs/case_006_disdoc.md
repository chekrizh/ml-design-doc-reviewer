# Slack Enterprise Search

### **I. Problem definition**

### **i. Origin**
Slack is evolving from a "Searchable Log of all Communication and Knowledge" into an intelligent log. The goal is to expand search capabilities beyond internal Slack messages to include knowledge from key external applications (e.g., Google Drive, GitHub), allowing users to surface up-to-date, relevant content directly within the Slack interface.

### **ii. Relevance & Reasons**
Users often have critical knowledge fragmented across multiple external tools. By integrating these sources into Slack's search and "AI Answers" (generative AI summaries), Slack reduces the need for users to switch contexts between different applications to find information.

### **iii. Expectations**
- **Security**: Customer data must never leave Slack's trust boundary.
- **Privacy**: The system must strictly adhere to the principle of least privilege.
- **Freshness**: External data and permissions must be up-to-date with the source system.
- **Control**: Admins and users must have explicit opt-in/opt-out control over external data sources.

### **iv. Previous work**
The system is built atop the existing **Slack AI** infrastructure, leveraging its established security principles, escrow VPCs, and RAG (Retrieval Augmented Generation) patterns.

### **v. Usage volumes and patterns**
`[NO INFO]`

---

### **2. Goals and anti-goals**

### **i. Goals**
- Provide a unified search experience across Slack and external apps (Google Drive, GitHub, etc.).
- Ensure that AI-generated answers incorporate external context without compromising security.
- Maintain real-time synchronization of permissions and content from external sources.
- Ensure no external data is persisted in Slack's internal databases.

### **ii. Anti-goals**
- **No LLM Training**: The system should NOT train LLMs on customer data.
- **No Data Indexing**: The system should NOT build a local index of external data (avoiding the "stale data" problem).
- **No Persistent AI Storage**: AI-generated Search Answer summaries should NOT be stored in the database.

---

### **3. Risks and constraints**

### **i. Technical and Regulatory Constraints**
- **Trust Boundary**: Data must remain within Slack's trust boundary.
- **Compliance**: Must integrate with existing Encryption Key Management and International Data Residency standards.

### **ii. Failure Modes**
- **Permission Mismatch**: Risk of surfacing data the user no longer has access to in the external system (mitigated by the real-time federated approach).
- **Unauthorized Access**: Risk of requesting excessive permissions (mitigated by the Principle of Least Privilege).

### **iii. Dependencies**
- **External APIs**: Reliance on public search APIs from partners (e.g., Google, GitHub).
- **OAuth**: Dependency on the OAuth protocol for secure authorization and identity propagation.
- **Cloud Infrastructure**: Reliance on AWS for hosting LLMs.

---

### **4. Metrics and loss functions**
`[NO INFO]`

---

### **5. Data (Dataset)**

### **i. Data Sources**
- **Internal**: Slack messages and internal knowledge.
- **External**: Real-time data fetched via public search APIs from connected applications (Google Drive, GitHub).

### **ii. Labeling strategy**
`[NO INFO]`

### **iii. Data Quality and ETL**
- **Approach**: Federated, real-time retrieval.
- **ETL**: No traditional ETL pipeline for external data; data is fetched on-demand during the query runtime to prevent staleness.
- **Caching**: The Slack client may cache data between reloads for performance (filtering and previews), but the backend does not store external source data.

---

### **6. Validation schema**
`[NO INFO]`

---

### **7. Baseline solution**
`[NO INFO]`

---

### **8. Errors and their analysis**
`[NO INFO]`

---

### **9. Training pipelines**

### **i. Tooling**
- **Infrastructure**: AWS.
- **Model Hosting**: Closed-source LLMs hosted in an **escrow VPC** to ensure the model provider cannot access customer data.

### **ii. Training Approach**
- **RAG (Retrieval Augmented Generation)**: Instead of training or fine-tuning LLMs on customer data, Slack uses RAG. The LLM is supplied with only the specific content needed to complete the task at runtime.

---

### **10. Features**

### **i. Feature Categories**
- **Permissions-Aware Retrieval**: Uses the requesting user's Access Control List (ACL) and OAuth tokens to scope queries.
- **Federated Search**: Real-time querying of external APIs rather than searching a local index.

### **ii. Selection Criteria**
- **Least Privilege**: Only "read" scopes are requested via OAuth to satisfy search queries.

---

### **11. Measuring results**
`[NO INFO]`

---

### **12. Integration and Serving**

### **i. Serving Architecture**
- **RAG Pipeline**: 
    1. User submits a query.
    2. System identifies relevant internal and external sources.
    3. System fetches permissioned content via OAuth-authorized API calls.
    4. Content is passed to the LLM in the escrow VPC.
    5. LLM generates a summary.
- **Serving Pattern**: Online/Real-time.

### **ii. SLAs and Fallbacks**
- **Data Persistence**: Search Answer summaries are discarded immediately after being shown to the user.

---

### **13. Monitoring**
`[NO INFO]`

---

### **14. Operations**

### **i. Access Control**
- **Admin Control**: Admins must explicitly opt-in external sources for the organization.
- **User Control**: Users must explicitly grant access via OAuth and can revoke access at any time.

### **ii. Governance**
- **Transparency**: Admins and users are shown the specific OAuth scopes requested before granting access.