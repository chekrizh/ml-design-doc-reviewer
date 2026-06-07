# Deep Reinforcement Learning in Production Part 2: Personalizing User Notifications

- **Sample ID**: case_046
- **Source URL**: https://towardsdatascience.com/deep-reinforcement-learning-in-production-part-2-personalizing-user-notifications-812a68ce2355
- **Content type**: article

---

By Mehdi Ben Ayed and Patrick Halina from Zynga’s ML Engineering team.
This series discusses how Zynga uses deep reinforcement learning in production to personalize user experiences in our games. It’s based on our presentations at Spark Summit and the Toronto ML Summit.
In this article we talk about how we used RL to personalize notifications and increase click through rates in Words with Friends Instant. It serves as an illustration for what it takes to build and RL application and why RL so powerful.
Our journey using reinforcement learning started in 2018. We knew it fit out needs for personalization on a theoretical level, but we needed to test if it would work in the real world. In this article, we’ll discuss a Zynga application to illustrate how RL can make a real impact for personalization. To protect trade secrets, some of the details have been obfuscated. Spoiler Alert: The RL agent worked! Since then, we’ve gone on to develop our open source library for deep RL Applications, RL Bakery, and launch several other production applications.
Push Notification Timing
Most mobile applications send out a daily message to their user base. For example, Zynga’s popular words game, Words With Friends, sends messages to remind users that their friends are waiting on a move. It’s a challenge to decide when to send that message. We have a worldwide user base, and everybody has their own schedule. The time at which that notification is sent is a critical driver of engagement.
- If the notification is sent at a good time, the user might come back and engage in the game.
- If the notification is sent at a bad time, the user might ignore it and not come back to the game. You could even miss that your mom is waiting on you to make the next move!
Previous Approach
The game already had a working segment-based solution implemented before we started. The player-base was split into 3 time zones based on a user’s country. Each user received a message in the evening for their timezone, as that’s the most popular time to play. This approach worked well as a quick, first attempt, but they were ready to optimize it.
Can you think of any shortcomings with this solution?
First is the crude time zone approximations. Of course there’s more than 3 timezones in the world. Not only that, but countries like the US and Canada have multiple timezones within them, making it hard to map a player’s nation to a specific timezone. We may not even have the correct country associated with all of our users.
Aside from data issues, there’s a lack of personalization that’s pretty common with Segment based personalization schemes. Even if we nail somebody’s timezone, everyone has their own schedule. It might be better to message someone at 3 in the morning if it’s Monday, because that’s "lunch break" for their night shift. Segment strategies just don’t use enough player context to perform fine grained user experience personalizations.
There’s a more critical issue with the premise of this approach that shows why RL is so powerful for personalization. Ultimately, our goal is to increase user engagement. If we had the perfect model that told us this user is going to play at 7PM, does it make sense to send a message at that time? They were already going to engage with the game! Should we try sending a message an hour before? 12 hours before? If we tried messaging a user at 7PM 3 times in a row and they don’t respond, should we try a different time? That’s where RL comes in. It answers the question: what Action do I take for this user to increase engagement.
Reinforcement Learning Setup
To recap Part 1 of our series, we formulated a personalization problem as selecting an Action for a given State in order to maximize a long term Reward. For the notification timing problem, we used the following State, Action and Reward:
- State: user historical interactions with previous push notifications. The time window is bound to 14 days and the data points are structured as a time series.
- Action: the hour of the day to send the next notification. So there are 24 actions available.
- Reward: A positive reward was provided when the user interacted with the push notification. No reward is provided otherwise.
We built a machine learning pipeline powered RL Bakery to collect, train and perform batch-recommendations everyday for all eligible players for push notifications.
(More details will be about the infrastructure will be shared in Part 3 of this series.)
Reinforcement Learning Training Setup
What does it actually mean to build a Reinforcement Learning application? Essentially, we’re training an Agent to select Actions. There are lots of Deep RL algorithms to train agents: DQN, PPO, TD3, SAC etc. Every month new algorithms (with new 3 letter acronyms) are published in ML papers.
Our expertise isn’t researching and implementing these algorithms. We used an off the shelf implementation from the open source TF-Agents library. We chose to use the DQN algorithm for our Proof of Concept. It’s one of the simpler algorithms, but it was actually used in the AlphaGo project to defeat the world’s best GO player.
With an RL algorithm selected, we chose a set of hyper parameters. Many of these concern the deep learning model at the heart of any deep learning algorithm. You need to choose the network architecture to best represent your features and the Policy (the decision making logic of the Agent.) You also need to choose deep learning hyperparameters like learning rates, optimizer algorithms (eg. ADAM, SGD) etc.
There are some RL specific parameters as well. For DQN, exploration occurs with an epsilon-greedy mechanism. That means that with probability epsilon, a random Action will be chosen. The rest of the time, the Action with the best predicted reward will be used. It’s typical to start with a higher epsilon to encourage exploration, then reduce epsilon over time as the Agent hones in on a successful strategy.
Choosing the hyper parameter values is difficult with RL. Unlike supervised learning, you can’t simply provide a static set of labelled data and determine which hyper parameters lead to the best results. RL only learns from feedback with the environment. Complex interactions from one time step to future times just can’t be captured from static datasets. However, for this situation, we had an existing strategy to work with (the simple segmentation approach that split the world into 3 timezones.) We tested different hyper-parameters by training the Agent to mimic the existing approach. We’ll cover this in more details in Part 4 of our series.
Reinforcement Learning Training Loop
Every day, we ran a batch training workflow to update our Agent and generate times to send the next push notifications. The workflow gathers the following data for training:
- The State of the users from 2 days ago
- The Action (hour a notification was sent) from 2 days ago
- The next State of the user (from 1 day ago)
- User engagement values (the Reward) from 1 day ago
For each user, this is assembled into a trajectory of
(State, Action, Next State, Reward)
This set of trajectories is used to update the existing RL Agent. The update means running through a deep learning workflow on Tensorflow: the values of the neural network representing the Agent are updated to better reflect the relationships between States, Actions and long term rewards.
One nice thing about RL Agents is that they keep track of the ‘long term reward’ implicitly. Notice that we’re only telling the Agent about the immediate reward from the following day. We don’t need to wait a week to tell it about the 7 day retention. The RL Algorithms build up their own internal estimates of the long term reward, based on the immediate rewards and the next State.
This is an example of an offline, batch RL problem. It’s offline because we train the Agent from offline data (instead of immediate interactions with the environment.) It’s batch because we’re feeding in batches of data. This setup is unlike most RL problems discussed in papers and research. In most academic problems, the Agents are trained online, with simulated environments that react instantly. However, offline problems are much more typical in the real world, since rewards are often delayed from when the Actions take place.
Results
Over the span of a few days of data collection and training, the agent increased the click through rate by about 10% (relatively). This first success showcased the power of reinforcement learning using a fairly simple solution. It algorithmically tests different strategies to personalize values for each user and learns how to optimize for key metrics such as long term retention and engagement.
The agent was able to answer this question: what hour do I send each user a message in order to raise engagement. It works tirelessly, exploring new strategies and finding new patterns. If the game or user patterns change, it can adapt as well. In this case, the reinforcement learning framework provided us with a way to optimize our key metrics with minimal tuning and no manual process. This makes it the perfect methodology for personalization applications.
This first success led us to deploy the solution to Words With Friends Instant’s entire player base. It’s now run in production for several million players per day.
What’s next
Training and deploying RL agents to production comes with several challenges. It requires the setup of custom machine learning infrastructure capable of maintaining and serving the recommendations when needed. The next article in this series address these challenges.