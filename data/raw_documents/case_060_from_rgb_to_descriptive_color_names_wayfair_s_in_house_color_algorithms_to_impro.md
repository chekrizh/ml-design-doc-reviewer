# From RGB to Descriptive Color Names: Wayfair's in-house color algorithms to improve customer shopping experience.

- **Sample ID**: case_060
- **Source URL**: https://www.aboutwayfair.com/careers/tech-blog/from-rgb-to-descriptive-color-names-wayfairs-in-house-color-algorithms-to-improve-customer-shopping-experience
- **Content type**: article

---

The Challenge
Describing the color of a product accurately is challenging. Colors can be defined precisely by a set of numeric values – RGB describes a color by the intensity of red, green, and blue hues, but describing them in natural language is not straightforward.
Some RGBs can be described by multiple similar color names. For example, a hex-code (the hexadecimal format of an RGB value) #0F385C can be described as “navy”, “dark blue”, “midnight blue” or just “blue”. On the other hand, some RGBs can be described by multiple different color names. For example, a hex-code #9999FF in the second figure above can be described as both “blue” and “purple”.
Impact
Solving this problem will provide accurate, complete and granular color names tagged to each product. Accuracy will allow us to reduce the number of customers leaving the website due to sub-par color filtering. Driving completeness by tagging the color of the millions of products in the Wayfair catalog will give our customers a richer selection to shop from, not missing out on quality products that don’t have any color tagged. Granularity of color names will allow our customers to quickly filter to the specific shade they have in mind. Focusing on these three pillars will make it so that a customer searching for a “Blue Sofa” will only see blue sofas, not black. They’ll see all the blue sofas that Wayfair sells, and if they want to narrow their search to “Teal Sofa”, they’ll be able to filter further to get the exact shade they have in mind.
Our Approach
In order to solve this challenging problem of describing the color of a product, we first capture the relationship between RGBs and the more frequently used color names by algorithmically defining a color taxonomy. We then build an algorithm that takes a product image as an input, extracts the RGB values from it, and leverages the color taxonomy to assign color names to the product. In the rest of the post, we will talk about how we build the color taxonomy, how we operationalize the assignment of color tags to products in the Wayfair catalog, associated challenges, and future work.
Wayfair’s Color Taxonomy
We developed Wayfair’s Color Taxonomy, an algorithm-defined color palette that captures the hierarchical relationship between RGBs of products in the Wayfair catalog and their associated color names. The Wayfair’s Color Taxonomy consists of two main elements: 1) RGB hierarchy, which describes the relationship between RGB values (e.g. #000080 - “navy” is a child of blue), and 2) RGB naming, which assigns human-friendly names to RGB values (e.g, #0c1f5e can be described as “navy blue” and “dark blue”).
RGB hierarchy and naming algorithm
We build the RGB hierarchy that contains groups of similar RGB values at a particular level (RGB groups associated with “midnight blue”, “dark blue” and “navy blue” are in the same level) and parent-child relationships between RGB groups at different levels (e.g. RGBs associated with “teal” and RGB associated with “navy” share the same parent group “blue”).
The RGB hierarchy algorithm quantifies the difference between two colors using a metric called delta-E [1] which takes into account the human eye perception. The larger the value of delta-E, the more distinguishable the color difference: delta-E < 2 has negligible color differences to the human eye, and delta-E >10 has distinguishable color differences to the human eye.
The algorithm groups the RGBs based on pairwise delta-E distances and organizes them into the hierarchy using a bottom-up approach, as illustrated in the figure below.
After building the RGB hierarchy, we assign color names to the RGB groups on each level. We first assign the color names to the lowest level of RGB groups leveraging an open source ( Wikipedia + ColorHexa) mapping of color names to RGB values. We then use a bottom up strategy to roll up the color names from the lowest to highest level.
We will next explain how we build each level in the hierarchy and how we assign color names at each of those levels.
Level 4 -- Most granular(RGB) level
The lowest level (level 4) of the hierarchy consists of the RGBs that we extracted and sampled from the bounding boxes of products across the Wayfair catalog (bedding, outdoor, rugs, upholstery, etc.). Bounding boxes are drawn onto product images by human annotators to represent a specific product attribute (i.e. upholstery, leg, frame...). We run K-means clustering on those extracted RGBs and derive level 4 color groups . We choose k = 4055, in order to keep the minimum pairwise distance between cluster centroids of delta-E > 2. This ensures all RGBs in level 4 are visually distinguishable.
Once the color groups at level 4 are derived, our algorithm assigns color names to them by leveraging ~1200 unique pairs of RGB values and color names that were scraped from public sources e.g. Wikipedia and colorhexa. We compute the delta-E pairwise distances between level 4 RGBs and web scraped RGBs. If the distance is <3, the name corresponding to web scraped RGB is assigned to the level 4 RGB group. For example, “medium turquoise”, “blizzard blue”, “middle blue” are assigned to three different RGB groups at level 4, as their shades are different enough to be assigned separate color names based on the delta-E pairwise distance.
Level 3 -- Granular colors with narrow spectrum
We obtain level 3 color groups by further grouping visually similar RGB values from level 4 by using Birch clustering. The distance between a RGB to its cluster centroid is 5 delta-E. This ensures that the clusters are cohesive and the RGBs in the clusters are distinguishable at a glance.
In order to assign the color names to the color groups at level 3, our algorithm adopts a bottom-up strategy. A particular level 3 group takes the aggregated color names from level 4 groups that were clustered together to form that level 3 group. For example, one level 3 RGB group contains three level 4 color groups and hence has three color names: “medium turquoise”, “blizzard blue”, “middle blue”.
Level 2 -- Granular colors with wide spectrum
We obtain level 2 color groups by using graph algorithms on level 3 groups. We build a graph such that level 3 color groups are the nodes and the two nodes are connected if the delta-E distance between the color of their centroids is <10 (where colors are more similar than opposite). We then run a graph-based algorithm that iteratively identifies the maximum size cliques at our level 2 color groups until the smallest clique is of size 3. This allows a color group of level 3 to be tied to two different colors (e.g. RGBs for “teal” can be tied to both “green” and “blue”). It also enables a wide spectrum of RGBs within a major color (e.g. “turquoise”, “aqua”, “teal” RGBs are tied to “blue”). The example below highlights a level 3 color group in the center, which can be tied to both blue and green.
Similar to level 3 color naming, level 2 color groups also take the aggregated color names from level 3 color groups that were clustered together. For example: “medium turquoise”, “blizzard blue”, “middle blue”, “teal”, “dark turquoise” describe one color group at level 2.
Level 1 -- Most basic & unambiguous colors
For level 1, we utilize a predefined list of colors (“red”, “green”, “blue”, “yellow”, “purple”, “pink”, “black”, “white”, “orange”, “brown”, “gray”) identified through research [2] as the most unambiguous basic colors. In addition, we include “beige” due to its popularity in the Wayfair catalog. Each of these level 1 colors have ~30 RGB values associated with them which we obtain by requesting a team of designers to curate them. We define the relationship between level 2 and level 1 via k - nearest neighbor search – defining all level 1 RGBs as points in space and every RGB in a level 2 group as a query point. We choose k = 9 and assign the level 2 RGB to the level 1 colors that have similarity above a threshold (30%). The threshold is introduced to allow one level 2 RGB to be tied to different level 1 color names.
Once the RGB relationship between level 1 and level 2 color groups is defined, the associated level 1 color names are linked to the level 2 color names (e.g. blue from level 1 is linked to “turquoise”, “blizzard blue” etc.).
Wayfair’s Color Tagging Pipeline
Once we define the taxonomy, we can turn our attention to the main problem: ‘What color is this product?’ We extract the RGB information from the product image and leverage the developed taxonomy in order to provide a color tag. The color tagging algorithm consists of two main components: 1) dominant color extraction from product imagery, and 2) mapping of the extracted colors to the taxonomy to obtain string tags.
We leverage human annotators to draw bounding boxes onto product images to represent a specific product attribute (i.e. upholstery, leg, frame...). We then cluster the RGBs within the bounding boxes using mini-batch k-means, with k=5 and extract up to 5 dominant colors with their corresponding color volumes.
Once we extract the colors from the step above, we want to map those values to the closest neighbor within level 4 colors in the taxonomy. We leverage a popular package called faiss [3], a similarity search library that is optimized for speed and memory usage and supports GPU acceleration for index search. After finding the nearest neighbor in level 4, we utilize our RGB hierarchy to get names of the color at four levels of granularity.
Evaluation
The color tagging pipeline provides the color names for a product. However, we need to make sure that the color tags predicted by our algorithms are accurate. Using a human-in-the-loop framework allows us to evaluate the accuracy of our models. In the next section, we describe our evaluation setup and the results.
Evaluation Setup
There are two main challenges in evaluating the color tags. 1) Lack of ground truth data and 2) Definition of correctness. We used the following strategies to overcome these challenges.
- Supplier tags followed by human judgement as ground truth: When suppliers add products to the Wayfair catalog, they also provide color tags for each product. These tags are not always complete, accurate or granular. However, we observed that they are mostly accurate when the product has only one color and the supplier provided tag is level 1 color such as “blue”. We considered this as our pseudo ground truth data and then compared model predicted tags with supplier tags. When the model predicted tags did not match with supplier provided tags, we involved human judgement as a source of truth.
- Acceptance rate as a metric for evaluation: Color correctness is very subjective and, thus, hard to define. For this reason, we choose ‘acceptance rate’ as a metric for evaluation. We consider a color tag acceptable if the model predicted color and supplier tagged color are the same. If the model and supplier colors differ, we let a human evaluator determine if the model predicted color is acceptable.
Evaluation Result
While evaluating the model, we found that the model achieves 63% agreement with supplier tags. We sent the remaining 37% data for HITL evaluation. Combining the two-step evaluation together, the model achieves 88% acceptance rate. Below are some examples where human agents preferred model predictions over supplier tags.
Future work
We will continue to iterate and improve our color tagging algorithm. One of the biggest limitations currently is that our prediction is not robust to noise in the input image. For example, we observed “white” products being predicted as “gray” due to shadows from the images. This, if not solved, will result in poor customer experience when they place an order based on color tags and receive the white products instead of gray products. To solve this challenge, we are going to explore other data sources (i.e. supplier descriptions, digital swatches, etc.), as well as other features derived from product imagery (i.e. HSV spectrum, color histogram, etc.).
We plan to expand our scope to describe metallic-like colors to keep improving the experience of Wayfair customers. Our reflective model which covers metallic colors and metallic finishes using convolutional neural networks is under development and will come in the near future.
Join Us!
If you find our work interesting, please connect with us! We’re looking for talented data scientists, machine learning engineers, and product managers to join our team and lead innovations in Visual Information Extraction at Wayfair! Please find job descriptions below:
Reference
- Luo, Ming. (2002). The CIE 2000 colour difference formula: CIEDE2000. Color Research & Application. 4421. 10.1117/12.464549.
- Berlin B, Kay P (1969) Basic Color Terms: Their Universality and Evolution (Univ of California Press, Berkeley, CA).
- Jeff Johnson, Matthijs Douze, and Herv`e J`egou. Billion-scale similarity search with gpus. ´ arXiv preprint arXiv:1702.08734, 2017. [ github]
---

## Extracted images (11)

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_060/img_001.jpg]
[IMAGE_ALT: A blue chair is detected as having the hex color value of #0F385C, which can be translated into color names Midnight Blue, Navy Blue, or Dark Blue]
[IMAGE_SOURCE_URL: https://cdn.aboutwayfair.com/dims4/default/d0ce460/2147483647/strip/true/crop/763x199+0+0/resize/763x199!/format/jpg/quality/90/?url=https%3A%2F%2Fcdn.aboutwayfair.com%2F03%2F88%2F5337ba2a441bb9e2fe5f396d0100%2Fscreen-shot-2021-09-08-at-8.46.12%20AM.png]
[IMAGE_DESCRIPTION: mmm Midnight blue Navy blue Dark blue #0F385C Product Color value Candidate color names]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_060/img_002.jpg]
[IMAGE_ALT: Four swatches of colors that can be classified by multiple color names, like Yellow/Green, Orange/Brown, Blue/Purple, Blue/Gray]
[IMAGE_SOURCE_URL: https://cdn.aboutwayfair.com/dims4/default/66b2530/2147483647/strip/true/crop/760x197+0+0/resize/760x197!/format/jpg/quality/90/?url=https%3A%2F%2Fcdn.aboutwayfair.com%2Fa7%2F4a%2F05f1c5a74df7bbbe906fb600e1a8%2Fscreen-shot-2021-09-08-at-8.46.31%20AM.png]
[IMAGE_DESCRIPTION: #CADO1D Yellow/green #9999FF #7D99A7 #00993 Blue/Purple Blue/Gray Orange/Brown]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_060/img_003.jpg]
[IMAGE_ALT: A color wheel split into four levels, with Level 1 as basic colors (eg. yellow, blue) and level 4 as all hues within the color range]
[IMAGE_SOURCE_URL: https://cdn.aboutwayfair.com/dims4/default/0864277/2147483647/strip/true/crop/907x474+0+0/resize/800x418!/format/jpg/quality/90/?url=https%3A%2F%2Fcdn.aboutwayfair.com%2F3f%2Fea%2F9bd499ad44109ebbc9760d28cde4%2Fscreen-shot-2021-09-08-at-8.47.31%20AM.png]
[IMAGE_DESCRIPTION: RGB Hierarchy]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_060/img_004.jpg]
[IMAGE_ALT: zooming in on a single color in the hierarchy, level 4 colors can be classified as Medium turquoise, robin's egg blue, or Bondi blue, which all fall into a smaller family in the level 1 blue group]
[IMAGE_SOURCE_URL: https://cdn.aboutwayfair.com/dims4/default/4b7bdc1/2147483647/strip/true/crop/932x473+0+0/resize/800x406!/format/jpg/quality/90/?url=https%3A%2F%2Fcdn.aboutwayfair.com%2Fab%2Fe9%2F3c56009140d8a6d972712205238b%2Fscreen-shot-2021-09-08-at-8.47.59%20AM.png]
[IMAGE_DESCRIPTION: RGB Naming Level1 RGB naming with multiple alternatives names: the 0 highlighted RGB value will be named as: medium turquoise Revel (prioritized), alternative: bondi blue, robin's egg blue etc. Level3 Level4 Medium robin’ Powder Middle Bondi turquoise, s egg blue uals blue blue Blizzard blue. blue]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_060/img_005.jpg]
[IMAGE_ALT: A chart showing delta E distances from 1 to 100, range of perception from not perceptible to exact opposites, and example colors within each range]
[IMAGE_SOURCE_URL: https://cdn.aboutwayfair.com/dims4/default/34d438a/2147483647/strip/true/crop/1062x342+0+0/resize/800x258!/format/jpg/quality/90/?url=https%3A%2F%2Fcdn.aboutwayfair.com%2F96%2F4b%2Fda99b0864d79983fd721af78d6a7%2Fscreen-shot-2021-09-08-at-8.48.47%20AM.png]
[IMAGE_DESCRIPTION: Examples Not perceptible by human eyes Co ee 1-2 Perceptible through close observation se90ce7 #e8097C delta E=2 2-10 Perceptible at glance #880208 #9309F1 delta_E = 10 11-49 Color are more similar than opposite #196874 #ASCTAE delta_E = 20 100 Color are exact opposite | #000000 | werreer delta_E = 100]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_060/img_006.jpg]
[IMAGE_ALT: Example of the blue tree, where level 1 is blue, level 2 has eight shades of blue, level 3 has 40 shades of blue ranging from lighter blue-greens to dark navys. For each of the 40 shades in level 3, there are a collection of ~16 discrete hex codes that make up the shade family in level 4.]
[IMAGE_SOURCE_URL: https://cdn.aboutwayfair.com/dims4/default/0f49dad/2147483647/strip/true/crop/1242x533+0+0/resize/800x343!/format/jpg/quality/90/?url=https%3A%2F%2Fcdn.aboutwayfair.com%2Fd0%2F27%2F364d6a454ff881ce34e9bf7e5258%2Fscreen-shot-2021-09-08-at-8.49.10%20AM.png]
[IMAGE_DESCRIPTION: NO_TEXT_DETECTED]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_060/img_007.jpg]
[IMAGE_ALT: Five level 4 shade families sitting in a venn diagram of blue shades and green shades. In the intersection of blue and green, a level 3 color group belongs to both blue and green level 2 groups.]
[IMAGE_SOURCE_URL: https://cdn.aboutwayfair.com/dims4/default/eccf1d9/2147483647/strip/true/crop/829x416+0+0/resize/800x401!/format/jpg/quality/90/?url=https%3A%2F%2Fcdn.aboutwayfair.com%2F35%2F33%2F34b0935c41949b776eba9c1b3eeb%2Fscreen-shot-2021-09-08-at-8.49.39%20AM.png]
[IMAGE_DESCRIPTION: Alevel 3 RGB group that belongs to both blue and green level 2 groups. % X —— _ ~ -_-—_— =~ Oe eo Blue level 2 group. Green level 2 group.]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_060/img_008.jpg]
[IMAGE_ALT: swatches for 12 level one color groups, pink, green, beige, brown, blue, orange, gray, white, black, yellow, purple, and red]
[IMAGE_SOURCE_URL: https://cdn.aboutwayfair.com/dims4/default/5f93219/2147483647/strip/true/crop/786x146+0+0/resize/786x146!/format/jpg/quality/90/?url=https%3A%2F%2Fcdn.aboutwayfair.com%2F21%2F30%2F33d7ebc04362ada67cb5fb6ffd20%2Fscreen-shot-2021-09-08-at-8.50.25%20AM.png]
[IMAGE_DESCRIPTION: Level 1 color: 11 most unambiguous colors + beige Pink Green Beige Brown Blue Orange Gray White Black Yellow Purple. Red]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_060/img_009.jpg]
[IMAGE_ALT: A picture of a grey chair is cropped to show the colors of the upholstery. Mini-batch k-means finds three shades in the image, at 55%, 42%, and 3%. When searched in the color taxonomy, three color names are found, Taupe Gray, Dark Gray, and Pitch Black, respectively. When rolled up to Level 1 color, the chair is considered 97% grey and 3% black]
[IMAGE_SOURCE_URL: https://cdn.aboutwayfair.com/dims4/default/e7ac13c/2147483647/strip/true/crop/912x487+0+0/resize/800x427!/format/jpg/quality/90/?url=https%3A%2F%2Fcdn.aboutwayfair.com%2Fc0%2F74%2Fd81b25b44755879a83c4002bc0a8%2Fscreen-shot-2021-09-08-at-8.50.59%20AM.png]
[IMAGE_DESCRIPTION: aa Image cropping — Mini-batch k-means e@ (122, 116, 118) 55% eon. 105, 105) 42% (38, 34, 33) 3% av Gray 97% yo | | Taupe Gray (#8b8589) Dark gray(#696969) | Pitch black(#2A2829) Ne]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_060/img_010.jpg]
[IMAGE_ALT: Eight product images are shown with the model's color prediction and the supplier's color determination]
[IMAGE_SOURCE_URL: https://cdn.aboutwayfair.com/dims4/default/a7ba914/2147483647/strip/true/crop/1146x486+0+0/resize/800x339!/format/jpg/quality/90/?url=https%3A%2F%2Fcdn.aboutwayfair.com%2F6c%2Fd4%2F9418ac76487597fc74f5d859686b%2Fscreen-shot-2021-09-08-at-8.51.35%20AM.png]
[IMAGE_DESCRIPTION: Examples of products where model tags are preferred Model = Blue Supplier = Purple i Model = Red Supplier = Purple Supplier = Orange Model = Blue Model = Pink Model = Green Supplier = Red Supplier = Yellow Model = Red Supplier = Orange Model = Pink Suppli]

[IMAGE_REF: ml-design-doc-reviewer/data/raw_documents/images/case_060/img_011.jpg]
[IMAGE_ALT: Swatches of metallic colors (brass, bronze, chrome, copper, gold, nickel, silver) are shown with swatches of metallic finishes (antiqued, hammered, brushed, satin, polished, oil-rubbed)]
[IMAGE_SOURCE_URL: https://cdn.aboutwayfair.com/dims4/default/6ca2040/2147483647/strip/true/crop/841x355+0+0/resize/800x338!/format/jpg/quality/90/?url=https%3A%2F%2Fcdn.aboutwayfair.com%2F22%2Fb6%2F85d93e7e47e293de7db1fbbd219a%2Fscreen-shot-2021-09-08-at-8.53.45%20AM.png]
[IMAGE_DESCRIPTION: Brass Bronze Chrome Copper Gold Nickel Silver Brushed Oil Rubbed]
