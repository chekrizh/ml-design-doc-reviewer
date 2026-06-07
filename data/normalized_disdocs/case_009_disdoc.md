# Swiggy GenAI Codegen Integration

### **I. Problem definition**

### **i. Origin**
Swiggy's engineering vertical sought to integrate Generative AI (GenAI) and Code Generation (CodeGen) tools to improve developer productivity and software delivery speed. The initiative was led by the Developer Experience (DXP) team to support engineers across various functions, including the Delivery Experience (DE) team.

### **ii. Relevance & Reasons**
The adoption was driven by the need to reduce manual, repetitive, and time-consuming tasks within the Software Development Life Cycle (SDLC). Specific pain points included:
- **Unit Testing**: High manual effort required to create extensive test cases.
- **App Optimization**: Difficulty in identifying redundant assets in the APK to maintain a lean application size.
- **Reporting**: Manual data gathering from fragmented sources (Google Play Store, Firebase, Sentry, etc.) for Technical Review Meetings (TRM).
- **Incident Response**: The need for rapid script creation during production outages to recover data or replay events.
- **Code Quality**: The necessity for consistent code reviews to catch common bugs (NPEs, error handling) and improve documentation.

### **iii. Expectations**
- **Efficiency**: Significant reduction in development time for boilerplate and repetitive tasks.
- **Quality**: Improved code robustness through better unit test coverage and automated review checks.
- **Speed**: Faster resolution of production issues via rapid script generation.
- **Adoption**: High penetration across the engineering organization.

### **iv. Previous work**
[NO INFO]

### **v. Usage volumes and patterns**
- **Adoption Rate**: Over 75% adoption within the engineering vertical.
- **Scale Example**: In one specific module, 292 unit tests were developed, with 70% contributed by CodeGen tools.

---

### **2. Goals and anti-goals**

### **i. Goals**
- Reduce unit test development time.
- Optimize APK size by removing redundant assets.
- Automate the construction of Technical Review Meeting (TRM) decks.
- Accelerate the creation of emergency production scripts.
- Automate the identification of basic coding errors (NPEs, error handling) during PR reviews.

### **ii. Anti-goals**
- [NO INFO]

---

### **3. Risks and constraints**
- **Learning Curve**: Initial challenges regarding prompt engineering and lack of common knowledge on best practices.
- **Context Awareness**: Difficulty in obtaining high-quality recommendations for existing or "unopened" code within IDEs.
- **Quality Assurance**: The risk that accepted code suggestions may not always adhere to high-quality standards or internal guidelines.

---

### **4. Metrics and loss functions**

### **i. Offline metrics**
- **Acceptance Percentage**: Ratio of lines of code accepted vs. lines of code suggested.
- **Contribution Percentage**: Percentage of overall code contributed by CodeGen tools when a PR is raised/accepted [currently a target metric for future implementation].

### **ii. Online/Business metrics**
- **Development Time Reduction**: 60–70% reduction in Unit Test (UT) development time.
- **APK Size Reduction**: Reduction of 4.8 MB (from 42.3 MB) through asset removal.
- **Incident Response Time**: Reduction in script creation time (e.g., from 20 minutes manual effort to 5 minutes using ChatGPT).
- **Productivity**: Measured via time savings at a Sprint level for selective projects.

### **iii. Loss functions**
- [NO INFO]

---

### **5. Data (Dataset)**
- **Sources**: 
    - Internal code repositories.
    - External telemetry/monitoring sources for TRM Builder (Google Play Store, Firebase Crashlytics, Sentry, PagerDuty, NewRelic, UserExperior).
- **Labeling/Proxy Labels**: [NO INFO]
- **Data Quality/ETL**: [NO INFO]

---

### **6. Validation schema**
- [NO INFO]

---

### **7. Baseline solution**
- **Manual Process**: 
    - Manual writing of unit tests.
    - Manual auditing of assets for APK optimization.
    - Manual data aggregation for TRM decks.
    - Manual bash script writing during production outages.
    - Manual peer review for all PRs.

---

### **8. Errors and their analysis**
- **Recommendation Quality**: The team identified a gap in ensuring that accepted code is of "good quality."
- **Diagnostic Approach**: 
    - Sample PRs are reviewed by tech leads to validate quality.
    - Implementation of an automated PR checker using GPT-4 to align suggestions with Swiggy coding guidelines.

---

### **9. Training pipelines**
- **Tooling**: 
    - ChatGPT (including GPT-4).
    - IDE-integrated CodeGen tools.
- **Automation**: 
    - Development of a "TRM Builder" tool.
    - Development of an "Automated PR Checker" based on GPT-4.
- **Enablement**: DXP team conducted Office hours, "Tech Byte" sessions, and Hackathons to drive adoption and prompt engineering skills.

---

### **10. Features**
- **Prompt Engineering**: Use of incremental prompts and providing additional context to improve output (specifically used for asset removal scripts and TRM Builder).
- **Contextual Integration**: Efforts by the DXP team to improve recommendations for existing codebases.

---

### **11. Measuring results**
- **Methodology**: 
    - Comparison of time-to-complete for specific tasks (e.g., 20 mins vs 5 mins for production scripts).
    - Tracking asset count reduction (301 + 165 images removed).
    - Sprint-level savings tracking for selective projects.

---

### **12. Integration and Serving**
- **Integration**: 
    - In-line code suggestions and comments within the IDE.
    - Integration into the PR review process.
    - Custom internal tools (TRM Builder).
- **Serving**: [NO INFO]

---

### **13. Monitoring**
- **Model Quality**: 
    - Tracking acceptance rates (Accepted/Suggested).
    - Tech lead audits of sample PRs.
- **Engineering Metrics**: [NO INFO]

---

### **14. Operations**
- **Ownership**: Developer Experience (DXP) team manages the rollout and enablement.
- **Enablement**: Continuous training via Office hours and Tech Byte sessions.
- **Review Cycle**: Use of GPT-4 as an automated checker to enforce Swiggy coding guidelines.