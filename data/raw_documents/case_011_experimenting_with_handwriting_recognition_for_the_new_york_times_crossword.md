# Experimenting with Handwriting Recognition for The New York Times Crossword

- **Sample ID**: case_011
- **Source URL**: https://open.nytimes.com/experimenting-with-handwriting-recognition-for-new-york-times-crossword-a78e08fec08f
- **Content type**: article

---

Experimenting with Handwriting Recognition for The New York Times Crossword
By Shafik Quoraishee
Introduction
As part of MakerWeek 2023, The New York Times annual hackathon, iOS and Android Mobile engineers explored the ability to write in The New York Times Crosswords app on each respective platform.
As an Android engineer who participated in the experiment, I’m excited to share my platform specific experience implementing On Device ML onto the Android Crosswords.
Note: This exploration is for a future feature, which hasn’t been released yet.
Initial Setup and Requirements
The New York Times Crossword has a custom software keyboard built into the app. When a user types their letter on the keyboard, it appears on that square.
To allow for handwriting, the first thing we needed to do was to ensure that the user could actually enter text manually, via a stylus or their finger. We took each crossword square on both the Mini and the Daily, and we transformed it into a custom component we called ‘SketchBox’. This component captures each stroke made by the user’s finger or stylus as they write on the screen, and is specially designed to listen for touch and drag events to display drawn letter strokes.
After our Sketchbox captured the resultant letter pixels from the canvas, we could then send the data to the machine learning algorithm of our choice.
Pencil Timing
Before we get to the actual handwriting detection, we need to address a subtle but important point.
As a user writes on the Sketchbox, they typically lift their finger or the stylus off the canvas, especially to complete letters like K, A, H, etc. This means we needed to determine when exactly a user was done writing, between each stroke. For example, if they enter the stem of the “K,” if we try to detect what letter this may be as soon as they lift their writing utensil off the canvas, it might be interpreted as an “I”.
So how long do we wait between strokes?
For our initial implementation, we introduced the concept of a mutex-like input locking system. Between each stroke we experimented with values around 500 to 1000 milliseconds depending on certain conditions. We didn’t want to wait too long before unlocking the stylus, otherwise the user input experience would seem degraded and choppy.
This is one of the many complexities we had to consider as we were designing the writing mechanic; and something that will be open for refinement in the future.
Data Preparation, Conditioning and Normalization
Before exploring conversion of images into text, we had to consider our input: letters from various devices with different screen sizes and resolutions.
An essential pre-processing step included getting the simplest form of the data that the algorithm needs for accurate learning. In the case of image data, this means getting rid of non-essential noise, and “frivolous geometry”. We downscaled and binarized the letter data, and then converted 128x128 raw input letters to much smaller, efficient and simplified 28x28 images.
Once we did that, we could finally begin to discuss how we translate the rasterized canvas image data to an actual character that our crossword app understands.
Handwriting recognition is a classic machine learning challenge within Optical Character Recognition (OCR). It has seen substantial advancements over the years, notably with Dr. Yann LeCun’s LeNet-5 architecture in 1998, which significantly improved digit recognition on the Modified National Institute of Standards and Technology (MNIST) dataset. The MNIST dataset contains thousands of variations of the digits 1–9, and is the de facto standard database for digit recognition.
The system we were trying to build looks like this high-level architecture diagram:
The machine learning algorithm we chose was intended to provide the best separation of character data into recognition clusters as idealized below. This way it would be easy for our system to determine if the user wanted, for example, to enter an ‘A’ vs a ‘C’. We explored several other options that I won’t go into detail about here, before settling on the use of a Deep Convolutional Neural Network architecture, which proved up to the task.
Building A Deep Convolutional Network
The Deep-CNN ((Convolutional Neural Network) is the cornerstone of any legitimate modern day image based machine learning system. It is a special kind of neural network that examines sections of image data, and using its learning mechanic, intelligently finds important features that help identify and classify images.
In the example presented above, the neural network takes in an input image of a bird, and detects structures that correspond to different qualitative elements of the bird. It can detect portions of the image that correspond to feathers, eyes, edges of the beak, internal beak geometry, and a whole host of traits that a person would have difficulty designing an algorithm from scratch to do.
Using the most important features, it can determine if it’s looking at a bird, and what kind of bird it is. We can even determine things like what direction the bird is flying in or looking at–provided the network is trained properly. We apply the same principle to letters that a user inputs into our crossword app.
Get The NYT Open Team’s stories in your inbox
Join Medium for free to get updates from this writer.
The basic CNN is a combination of the following elemental layers. By intelligently mixing and matching these structures with the proper parameters, there’s very little imagewise that we can’t detect:
- Convolutional layers allow the model to extract features automatically
- Max pooling layers narrow down the features obtained from the Conv Layers
- ReLU layers introduce non-linearity and allow for complex pattern discrimination
- Dropout layers mitigate overfitting of the network to the training data
TensorFlow Lite and Ingesting our Model
In addition to building the model, we also had to find a way to deliver it to our device. We chose to use Tensorflow Lite, a mobile framework used to install Python compiled ML models into an Android or iOS device.
Once we were satisfied with our model, we compiled it to a .tflite file and baked it into our application, then built a shunt for listening to letter writing events coming from the crossword squares. We iterated several times through different models and different configurations until we were satisfied with the final result, which turned into a trained file of only 100K or so–perfect for a mobile application, where space considerations are important.
Digit Recognition
Before approaching the problem of full-blown letter recognition, we decided to start simple and tackle the well studied and foundational problem of numerical digit recognition. The core section of code below provides the basic CNN setup we implemented:
First Digit Based CNN Model Failure: What Went wrong?
Despite abundant training data obtained from the MNIST, our recognition results were poor.
We ascertained the training data was “too perfect”. All the digits were only minor variations of each other, and all of them were mostly in the center of the box.
This is not the way people enter data into a crossword square. People have different handwriting styles and ways of tilting and placing the characters in the squares off center.
To solve this, we needed to employ a well known machine learning technique called Data Augmentation.
Data augmentation automatically generates off-center and distorted versions of our training data, bypassing the need for manual adjustments and skewing. This allows for many variations of our initial data set, including significantly off-centered versions of our characters.
By applying data augmentation techniques, we expanded our dataset from thousands to over 1 million samples with off-center minor shifts, rotations, and scaling — also called affine transformations.
Data Augmented Digit Model Success against Digits
As you can see, the digit recognition has improved significantly on the real crossword — a milestone in our work!
Moving to Full Blown Letter Recognition
Now that we solved digits, the next step was to solve letters. This includes lowercase and capital letters and all of their variations. Instead of just ten digits, we are now dealing with 26 lowercase, 26 capital letters and ten digits, which equates to 62 characters.
We can use the EMNIST dataset (Dataset source: http://arxiv.org/abs/1702.05373), an expanded version of the MNIST set, that includes both letters and digits and even punctuation, to help train the model better.
However, even with the enhanced dataset, the digit specific model isn’t sufficient for our needs. This is intuitively not surprising, because while the digit recognition model was powerful, it is surely not “intelligent” enough for the greatly expanded variation in character structure that is introduced by looking at letters.
Hyper Powering The Model through Parameter Optimization
To increase the power of our model, we added much more depth to our network in the form of several additional layers. We also employed Stratified K-Fold cross-validation to diversify our training by using randomized subsets of our augmented training/validation data.
To ensure that our layers were optimally designed, we employed a randomized parametric search along with enhanced statistical testing, which allowed us to find the optimal hyperparameters for our model. This proved to be an enhancement from our previous strategy of guessing the right parameters.
In our testing phase, we attained an average validation accuracy of ~91% on the Augmented EMNIST dataset. This gave us faith that our model would work.
FINALLY: SUCCESS!
After a long journey of exploring the landscape of ML model building, we finally arrived at a working crossword model–which was exciting. Even though we attained stellar results, there is still much work to do for the complete crossword experience, including dealing with partial letters, and letters that are spaced at irregular intervals.
Conclusion
Implementing handwriting recognition on the Android crossword app was an exciting adventure, even in an experimental context. Aside from handwriting, there’s also the potential for interactive features like “Scribble-to-Erase” detection and the possibility of in-app self-training mechanisms, and a whole host of other doors that On-Device ML in the Games App can open.
Having the opportunity to experiment with new techniques and amplifications to our existing products is a core part of why working at the Times as an engineer is so unique and so worth it. We hope one day to turn this into a feature that amplifies the Games experience for our current users and attracts new subscribers.
Shafik Quoraishee is a Senior Android Engineer on the Games Team at The New York Times. He is an avid machine learning/A.I. Enthusiast. Outside of work, he enjoys playing guitar, writing, and running quirky experiments.