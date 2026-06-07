# ML System Design: Handwriting Recognition for NYT Crossword

**Metadata**
- **Company**: New York Times
- **Title**: Experimenting with Handwriting Recognition for The New York Times Crossword
- **Technology Area**: Computer Vision (OCR / Handwriting Recognition)
- **Source URL**: https://open.nytimes.com/experimenting-with-handwriting-recognition-for-new-york-times-crossword-a78e08fec08f
- **Content Type**: Article

---

### 1. Problem definition

**i. Origin**
As part of "MakerWeek 2023" (annual hackathon), engineers explored adding handwriting input capabilities to the NYT Crossword app on iOS and Android. The goal was to allow users to enter letters into crossword squares using a stylus or finger instead of the custom software keyboard.

**ii. Relevance & Reasons**
The current flow requires users to use a software keyboard. Implementing handwriting recognition aims to enhance the user experience by allowing a more natural input method, potentially attracting new subscribers and amplifying the Games experience.

**iii. Expectations**
- **User Experience**: The input must not feel "choppy" or "degraded."
- **Accuracy**: The system must accurately distinguish between similar characters (e.g., 'A' vs 'C').
- **Performance**: The model must be lightweight enough to run on-device (mobile) without excessive space consumption.

**iv. Previous work**
The project started with a baseline of digit recognition using the MNIST dataset and the LeNet-5 architecture as a conceptual foundation.

**v. Usage volumes and patterns**
- **Input**: Single characters entered into "SketchBox" components (custom components for crossword squares).
- **Scale**: [NO INFO]

---

### 2. Goals and anti-goals

**i. Goals**
- Implement on-device handwriting recognition for digits, uppercase letters, and lowercase letters (62 characters total).
- Achieve high validation accuracy on augmented datasets.
- Ensure the model is small enough for mobile deployment.

**ii. Anti-goals**
- [NO INFO]

---

### 3. Risks and constraints

**i. Technical Constraints**
- **On-Device Execution**: The model must be compiled for mobile (Android/iOS) using TensorFlow Lite.
- **Storage**: Model size must be kept minimal (final model was ~100K).
- **Input Variability**: Must handle various screen sizes, resolutions, and handwriting styles (tilting, off-center placement).

**ii. Failure Modes**
- **Premature Detection**: Detecting a partial stroke as a complete character (e.g., the stem of a 'K' being interpreted as an 'I').
- **Overfitting**: The model may overfit to "perfect" training data that doesn't reflect real-world human handwriting.

---

### 4. Metrics and loss functions

**i. Offline Metrics**
- **Validation Accuracy**: Used to measure the model's performance on the Augmented EMNIST dataset.
- **Result**: Attained an average validation accuracy of ~91%.

**ii. Online/Business Metrics**
- [NO INFO]

**iii. Loss Functions**
- [NO INFO]

---

### 5. Data (Dataset)

**i. Data Sources**
- **MNIST**: Used for initial digit recognition (digits 0–9).
- **EMNIST**: An expanded version of MNIST including lowercase letters, uppercase letters, and punctuation.

**ii. Labeling Strategy**
- Used pre-labeled public datasets (MNIST/EMNIST).

**iii. Data Quality and Pre-processing**
- **Binarization**: Converting raw input to binary images to remove non-essential noise.
- **Downscaling**: Raw 128x128 input letters were downscaled to 28x28 images for efficiency.
- **Data Augmentation**: To solve the "too perfect" data problem, affine transformations were applied:
    - Off-center minor shifts.
    - Rotations.
    - Scaling.
- **Volume**: Augmentation expanded the dataset from thousands of samples to over 1 million samples.

---

### 6. Validation schema

**i. Split Strategy**
- **Stratified K-Fold Cross-Validation**: Used to diversify training by using randomized subsets of augmented training/validation data.

**ii. Leakage Risks**
- [NO INFO]

---

### 7. Baseline solution

**i. Initial Approach**
- A basic CNN trained on the standard MNIST dataset for digit recognition.
- **Result**: Poor performance on real-world inputs because the training data was too centered and uniform compared to actual user handwriting.

---

### 8. Errors and their analysis

**i. Error Taxonomy**
- **Input Stage**: "Pencil Timing" errors where the system triggers recognition before the user finishes the character.
- **Model Stage**: Poor generalization due to "perfect" training data (lack of variance in position and rotation).

**ii. Diagnostic Approaches**
- **Observation**: Engineers noted that real-world users tilt and place characters off-center, unlike the MNIST dataset.
- **Solution**: Implemented Data Augmentation to simulate these real-world variations.

---

### 9. Training pipelines

**i. Tooling**
- **Framework**: TensorFlow Lite (for mobile deployment).
- **Language**: Python (for model compilation).

**ii. Pipeline Process**
1. **Preprocessing**: Downscaling and binarization.
2. **Training**: Deep CNN with parameter optimization.
3. **Optimization**: Randomized parametric search and statistical testing to find optimal hyperparameters.
4. **Compilation**: Exporting the model to a `.tflite` file.
5. **Integration**: Baking the `.tflite` file into the application.

---

### 10. Features

**i. Model Architecture (Deep CNN)**
- **Convolutional Layers**: For automatic feature extraction.
- **Max Pooling Layers**: To narrow down extracted features.
- **ReLU Layers**: To introduce non-linearity for complex pattern discrimination.
- **Dropout Layers**: To mitigate overfitting.

**ii. Feature Selection**
- The model learns qualitative elements (edges, geometry) automatically via the CNN layers.

---

### 11. Measuring results

**i. Offline Evaluation**
- Tested against the Augmented EMNIST dataset.
- Achieved ~91% accuracy.

**ii. A/B Testing**
- [NO INFO]

---

### 12. Integration and Serving

**i. Serving Architecture**
- **On-Device ML**: The model is baked into the app as a `.tflite` file.
- **Input Trigger**: A "shunt" listens for letter writing events from the `SketchBox` components.

**ii. Input Logic (Pencil Timing)**
- **Input Locking**: A mutex-like system was implemented to prevent premature recognition.
- **Wait Time**: Experimented with 500ms to 1000ms delays between strokes before unlocking the stylus to ensure the character is complete.

**iii. SLAs and Fallbacks**
- [NO INFO]

---

### 13. Monitoring

**i. Engineering Metrics**
- **Model Size**: Monitored to ensure it remains small (~100K) for mobile storage constraints.

**ii. Model Quality**
- [NO INFO]

---

### 14. Operations

**i. Retraining Cadence**
- [NO INFO]

**ii. Future Work/Roadmap**
- Handling partial letters.
- Handling letters spaced at irregular intervals.
- "Scribble-to-Erase" detection.
- In-app self-training mechanisms.