# Share of Voice Optimization Engine

- **Sample ID**: case_067
- **Source URL**: https://www.aboutwayfair.com/careers/tech-blog/share-of-voice-optimization-engine
- **Content type**: article

---

Problem Overview
While Wayfair’s various machine learning models provide us an algorithmic way to find the most relevant content for a given customer based on their past behavior, there may be instances where we want to deviate from this. This is often the case with new and emerging product categories, where users have not had a chance to show their preferences. For example, if we optimize our models to select the category our customer is the most likely to purchase, we would show significantly more of the categories we have traditionally sold more of, such as sofas and rugs. This is because our models are trained based on past information rich with data on historically popular products. However, these recommendations might not be optimal for long-term customer needs and company growth.
Most companies and marketing teams overcome these limitations through the use of promotions (which override personalization and show all customers the same messages for a few weeks) or randomly splitting incoming traffic to see content based on what percentage of customers we want to see a specific category of product, like Kitchen Appliances. The latter is what we call Share of Voice - the proportion of each message shown to our customers. For example, if 20% of customers see a Kitchen Essentials banner, the Share of Voice for Kitchen Essentials would be 20%.
These approaches give us a simple lever to quickly adjust what messages customers see based on a desired target. However, such instruments do not explicitly account for what different customers are actually interested in. This is the central problem the Share of Voice Optimization Engine addresses: e.g. while directing 20% of traffic to see Appliance messaging, can we also optimize for customers who have the highest predicted propensity scores for Appliances? This will allow us to maximize the relevance of what we show by using our model outputs that predict a customer’s likelihood to purchase from each category.
The Share of Voice (SoV) optimization engine is designed to maximize customer-level message relevance while still meeting the desired SoV targets. It uses a constrained optimization solver to find the optimal combination of Customer x Message pairs such that we maximize cumulative relevance for all of our customers while meeting SoV targets set by our marketing, brand and other teams at the company.
It’s helpful to look at a concrete application. Let’s take the Homepage (www.wayfair.com), for example, and imagine it has 4 placements where we can display messages to customers. Let’s assume further that we want to populate these placements from a pool of 50+ types of messages. The types of messages could vary from storage (“Storage Solutions for Every Room”) to appliances (“Major Appliances. Major Brands. No Sweat”), or our other services like Wayfair Registry.
Decision Space
The problem of deciding what to show customers can be visualized as a 3-dimensional cube representing Customer x Messages x Placements. For example, the 1 in the top-left position of the cube means Customer #1 will receive F&D (Furniture and Decor) messaging on Placement #4.
The goal of the Share of Voice Optimization Engine is to find the optimal combination of 1s and 0s within this cube - i.e. one that maximizes the cumulative customer-level message relevance while meeting the desired SoV targets set by the business (as well as other logical or business constraints; more details later).
It’s also helpful to understand the key business inputs and model inputs that go into the SoV Engine in order to produce the optimization output (i.e. the optimal 1/0s for the decision-cube). The figure below shows some of the key inputs which we then cover one by one in the next section.
Business Inputs
SoV Targets
Our Wayfair Brand team and other leaders provide upper and lower bound SoV targets. The table below is an example of how category SoV targets could look like:
Placement x Message Applicability Matrix
In many cases, not every message can be shown in every placement. For example, we might want to only show products in one placement, while one of our services in another placement, and one of our brands in the third. This is handled via a Message x Placement applicability matrix. If the value for the [X, Y] cell in this matrix is:
- 1 = Msg X can be shown on Placement Y
- 0 = Msg X cannot be shown in Placement Y
Other Constraints
We may have to enforce additional logical or business constraints on the optimization problem. Below are a few examples:
- Ensure that every placement is populated with a message (i.e. we don’t have empty placements)
- Ensure that a given customer doesn’t get the same message across multiple placements (i.e. we don’t want a customer seeing “Rugs” in 2 placements)
- May want to have more nuanced constraints as well (ex: don’t show credit card offers to existing cardholders, etc.)
Each of these business or logical constraints must first be translated to mathematical constraints that the solver understands. For example, to ensure that each placement is populated with exactly one message we can enforce the row-wise sum on the yellow side of the cube (placement x message) to be exactly 1. Or similarly, ensuring that a customer doesn’t see the same message across multiple placements can be expressed as a column-wise constraint on the purple side of the cube.
Model Inputs
Model Scores | Customer x Message Relevancy
We need a way to describe the relevancy of each message to each customer to implement the algorithm, as this is the ultimate goal of the maximization function - showing the most relevant content to our customers under our set of constraints. Currently at Wayfair we have a range of propensity scoring models that predict the likelihood of our customers to purchase any of our product classes (e.g. Area Rugs, Fridges, etc.). We can leverage these models to describe the degree to which a given message is relevant to a given customer. For example, if I want to find out how relevant an ad about Renovation is to a specific customer, I can use the scores from our Flooring, Lighting and Vanity propensity models for that customer. In this discussion we will be referencing product-focused (i.e. should we talk to you about Rugs vs. Appliances) models and messages. If, however, for a particular placement, we want to show customers messages about one of our service offerings or brands, the appropriate service or brand model would be most suitable (e.g. Registry model for Registry.).
Placement Value Matrix
Given we are optimizing for SoV across multiple placements (4 in this hypothetical example), we need to consider whether we think all placements on the homepage are worth the same. For example, one could meet the desired SoV target for “Appliances”, but what if the optimizer happened to put all the Appliance messaging in the lowest-positioned placement, which gets the least amount of impressions? To prevent this from happening we would like the SoV Optimizer to have an understanding of the relative value of each placement within a placement. We do this by providing the SoV Optimizer a placement value matrix. The matrix simply represents how valuable we think a given placement is compared to others. This can be based on historical impressions, clicks, or other metrics like orders when clicked.
Output of Share of Voice Optimization
While the Customer x Message x Placement cube is a helpful way to visualize the decision-space for which we are optimizing, the concrete output produced can also be thought of as a simple table similar to below:
When a customer arrives on Homepage, a call is made to the appropriate endpoint which returns the list of messages or “topics” to show each customer or device we recognize for each placement based on the daily batch output of our algorithm. Unrecognized customers are given a random assignment based on SoV targets. For example, the messages we would like to show customer 123 are Mattress, Reno, Wayfair Credit Card (PLCC), and Kelly Clarkson Home for Placement 1 to Placement 4 respectively. Note the Share of Voice module only provides the “message” or “topic” the customers should see. A separate downstream application will select and render the actual content we would like to show for that message.
Engineering The Solution
To develop the solution, we worked with Gurobi, a mathematical optimization solver. This problem can be defined in the scope of a variant of the Generalized Assignment Problem, which Gurobi is well equipped to solve. We code each [Customer, Message, Placement] combination as a binary decision variable to optimize over. We then define each constraint inside Gurobi, as well as the objective function as described above. Lastly we run the solver and produce an output that is uploaded to our internal data stores and services for consumption by other Wayfair teams.
We use a batching and parallelizing process to increase our algorithm’s speed, as the number of permutations of [Customer, Message, Placement] and the number of constraints can easily reach into the billions. Batching and parallelizing allows us to reduce the number of customers we choose to optimize at once, as randomly sampling customers leads to nearly equivalent results as optimizing all customers at once, with a large reduction in processing time.
Conclusion
The Share of Voice algorithm is a powerful tool to allow us to make the optimal tradeoffs between short term profit maximization and long term business objectives. We’ve already had successful applications and are working on enabling future integrations through a robust engineering platform. Share of Voice is just one of many tools we use across Wayfair and Data Science to make the best possible recommendations for our customers! We’re always working on improving and developing new ideas, algorithms and integrations every day.
---

## Extracted images (10)

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_067/img_001.jpg]
[IMAGE_ALT: image showing 4 categories of kitchen essentials furniture items including glassware, linens, dinnerware, air fryers]
[IMAGE_SOURCE_URL: https://cdn.aboutwayfair.com/dims4/default/977dbd3/2147483647/strip/true/crop/1489x474+0+0/resize/800x255!/format/jpg/quality/90/?url=https%3A%2F%2Fcdn.aboutwayfair.com%2F48%2Fcc%2Fac92f14340f08466fbc06b4c28b9%2Fimage3.png]
[IMAGE_DESCRIPTION: NO_TEXT_DETECTED]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_067/img_002.jpg]
[IMAGE_ALT: A scale balances near-term customer relevancy against desired SoV distribution. Maximizes relevancy while growing awareness of new or emerging classes]
[IMAGE_SOURCE_URL: https://cdn.aboutwayfair.com/dims4/default/af039bd/2147483647/strip/true/crop/732x423+0+0/resize/732x423!/format/jpg/quality/90/?url=https%3A%2F%2Fcdn.aboutwayfair.com%2F4c%2F84%2F307ec12e4339b73cef0e9a00450e%2Fimage6.png]
[IMAGE_DESCRIPTION: Desired SOV distribution Near-term Customer Relevancy Maximize relevancy while growing awareness of new/emerging classes]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_067/img_003.jpg]
[IMAGE_ALT: A screenshot of the Wayfair Homepage with 4 message placements called out explicitly]
[IMAGE_SOURCE_URL: https://cdn.aboutwayfair.com/dims4/default/6ad105e/2147483647/strip/true/crop/1397x846+0+0/resize/800x484!/format/jpg/quality/90/?url=https%3A%2F%2Fcdn.aboutwayfair.com%2Fad%2F6b%2Fe0c261824372a21ef9f0b58d6fa4%2Fimage2.png]
[IMAGE_DESCRIPTION: ewayfair @ nso R a From Refreshes y _to Remodels Find just what you nee home improvement pi the brands you rust Storage Solutions for Every Room Kitchen essentials for every kind of cook.]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_067/img_004.jpg]
[IMAGE_ALT: A cube with axes "placements", "customer", "message"; cells are populated with either ones or zeros.]
[IMAGE_SOURCE_URL: https://cdn.aboutwayfair.com/dims4/default/a400c08/2147483647/strip/true/crop/506x512+0+0/resize/506x512!/format/jpg/quality/90/?url=https%3A%2F%2Fcdn.aboutwayfair.com%2F4b%2F2f%2F454a34e54bb681239c8675eccd8b%2Fimage4.png]
[IMAGE_DESCRIPTION: NO_TEXT_DETECTED]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_067/img_005.jpg]
[IMAGE_ALT: diagram showing business and model inputs into the share of voice optimization solver, and the output of the solver as a spreadsheet showing customer IDs, messages, and placements]
[IMAGE_SOURCE_URL: https://cdn.aboutwayfair.com/dims4/default/2c02177/2147483647/strip/true/crop/936x321+0+0/resize/800x274!/format/jpg/quality/90/?url=https%3A%2F%2Fcdn.aboutwayfair.com%2F73%2Fe6%2Fc1e306784880b71659558ff582e4%2Fimage8.png]
[IMAGE_DESCRIPTION: BUSINESS INPUTS PlacementBlock [CulD| Biock_1 | Block 2 | Block 3 123| Reno Mattress | Outdoor 456 | Rugs | Wall Art Mattress -cMsgiD> | <MsglO> | <tsgI0> ~ ~ rae, Bl ee via Model Scores Placement Value - . 4 (Historical Data) SOV OUTPUT]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_067/img_006.jpg]
[IMAGE_ALT: table showing 6 categories of Wayfair products, and corresponding share of voice targets in percentage]
[IMAGE_SOURCE_URL: https://cdn.aboutwayfair.com/dims4/default/bd136cf/2147483647/strip/true/crop/500x289+0+0/resize/500x289!/format/jpg/quality/90/?url=https%3A%2F%2Fcdn.aboutwayfair.com%2F0d%2F7f%2F4042370a48ec90dd20b9b29216b9%2Fscreen-shot-2021-11-08-at-3.04.00%20PM.png]
[IMAGE_DESCRIPTION: CATEGORY Furniture Outdoor Renovation Appliances Kitchen Storage SoV Target 5% 10% 25% 15% 30% 15%]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_067/img_007.jpg]
[IMAGE_ALT: spreadsheet showing message x placement. cells are filled with ones or zeros.]
[IMAGE_SOURCE_URL: https://cdn.aboutwayfair.com/dims4/default/446ed0b/2147483647/strip/true/crop/796x484+0+0/resize/796x484!/format/jpg/quality/90/?url=https%3A%2F%2Fcdn.aboutwayfair.com%2F55%2Fd9%2F450d91c243d29ed1af9a838e0927%2Fimage1.png]
[IMAGE_DESCRIPTION: Placement/Block MsgID| MsgDescription | Block 1 Block 2 Block 3 1 Reno ] ie} ie} 2 | Outdoor 1 0} 0} 3 Bedroom ] ie} ie} 329 |PLCC ie} 1 ie} 330__| Registry 0 1 0 331 | Gift Card 1 ie} 331 |KC Home ie} ie} 1 332 | Zipcode 0 0 1 N]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_067/img_008.jpg]
[IMAGE_ALT: table showing customer id by placements, with cells populated by message type]
[IMAGE_SOURCE_URL: https://cdn.aboutwayfair.com/dims4/default/9daf9da/2147483647/strip/true/crop/602x268+0+0/resize/602x268!/format/jpg/quality/90/?url=https%3A%2F%2Fcdn.aboutwayfair.com%2F98%2F2b%2Ff1338f524b4bb558d606ff76efc1%2Fimage5.png]
[IMAGE_DESCRIPTION: PLACEMENT: HOMEPAGE CulD | Block_1 | Block_2 | Block_3| Block_4 123 |Mattress| Reno PLCC KC Home 456 Rugs | WallArt |Mattress} Outdoor <MsgID> | <MsgID> | <MsgID> <MsgID>]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_067/img_009.jpg]
[IMAGE_ALT: A diagram showing a blank homepage, a homepage with placements populated with message ids, and a homepage with placements populated with images]
[IMAGE_SOURCE_URL: https://cdn.aboutwayfair.com/dims4/default/9006688/2147483647/strip/true/crop/1999x900+0+0/resize/800x360!/format/jpg/quality/90/?url=https%3A%2F%2Fcdn.aboutwayfair.com%2F49%2F70%2Faf50a4494146b6b5fad38e572778%2Fimage7.png]
[IMAGE_DESCRIPTION: STEP1 STEP2 MATTRESSES BLOCK #1 MsgiD = 2 (Mattress) Yo! U’LL LOVE | | MsgiD = 1 MsgiD = 329 | BLOCK #2 BLOCK #3 (Reno) (Puce) = fh oa You Got This MsgiD =33 BLOCK #4 (Kelly Clarkson Home)) LS . “4]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_067/img_010.png]
[IMAGE_ALT: none]
[IMAGE_SOURCE_URL: https://cdn.aboutwayfair.com/dims4/default/d67d51c/2147483647/strip/true/crop/500x500+0+0/resize/100x100!/quality/90/?url=https%3A%2F%2Fcdn.aboutwayfair.com%2Ff5%2Fa5%2F37fc946f4dfcb0b1544f00eaac24%2F067001b7-marketing-kurt-zimmer.png]
[IMAGE_DESCRIPTION: NO_TEXT_DETECTED]
