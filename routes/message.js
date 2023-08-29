const express = require('express');
const router = express.Router();
const fetchuser = require('../middleware/fetchuser'); // Middleware to fetch user's data using auth key
const Topic = require('../models/Topic'); // Import Inventory Model
const { body, validationResult } = require('express-validator');
const mqtt = require('mqtt');
const User=require('../models/User');
const Message = require('../models/Message');
const brokerOptions = {
    host: '192.168.18.208', // Remove the mqtt:// protocol
    port: 1883, // Default MQTT port
    clientId: 'mqtt-client', // Client ID to identify the connection
    username: 'noob', // Replace with your MQTT broker username
    password: 'talha6295', // Replace with your MQTT broker password
};
let isConnected = false;

const client = mqtt.connect(brokerOptions);

client.on('connect', () => {
    isConnected=true;
    console.log('Connected to MQTT broker');
 
});

client.on('close', () => {
    isConnected = false;
    console.log('Connection closed');
});

client.on('error', (error) => {
    console.error('Error:', error); 
});

//Subscribe to a topic
router.post('/subscribe', fetchuser, async (req, res) => {
    try {
        const { topic } = req.body;

        // Check if topic is already subscribed by the user
        const existingTopic = await Topic.findOne({ topic, user: req.user.id });
        if (existingTopic) {
            client.subscribe(topic);
          
            // Topic is already subscribed by the user
            return res.json({ error: "Topic is already subscribed by the user" });
        }

        // Check if topic exists in the database
        const topicExists = await Topic.findOne({ topic });
        if (!topicExists) {
            // Topic doesn't exist, so create a new subscription record
            const newTopic = new Topic({
                topic,
                user: req.user.id
            });
            await newTopic.save();
            client.subscribe(topic);
            // MQTT subscription logic here (assuming client is defined)
            // Example: client.subscribe(topic);

            res.json({ message: "Topic subscribed successfully" });
        } else {
            // Topic exists, but user hasn't subscribed to it
            // Check if any other user has subscribed to it
            const otherUserSubscribed = await Topic.findOne({ topic, user: { $ne: req.user.id } });
            if (otherUserSubscribed) {
                // Another user has subscribed, so subscribe the current user
                const newTopic = new Topic({
                    topic,
                    user: req.user.id
                });
                await newTopic.save();

                // MQTT subscription logic here (assuming client is defined)
                // Example: client.subscribe(topic);

                res.json({ message: "Topic subscribed successfully" });
            } else {
                // No other user has subscribed, return a message
                res.json({ error: "Topic already exists but no other user has subscribed to it" });
            }
        }

    } catch (error) {
        res.status(400).json({ error: "Some error occurred", msg: error.message });
    }
});

//UnSubScribe topic
router.delete('/unsubscribe', fetchuser, async (req, res) => {
    try {
        const { topic } = req.body;

        // Check if the user has subscribed to the topic
        const subscribedTopic = await Topic.findOne({ topic, user: req.user.id });
        if (!subscribedTopic) {
            return res.json({ error: "User is not subscribed to the topic" });
        }

        // Remove the subscription record
        await Topic.findOneAndDelete({ topic, user: req.user.id });

        // MQTT unsubscription logic here (assuming client is defined)
        // Example: client.unsubscribe(topic);

        res.json({ message: "Topic unsubscribed successfully" });
    } catch (error) {
        res.status(400).json({ error: "Some error occurred", msg: error.message });
    }
});

//Delete topic from existance

router.delete('/delete-topic', fetchuser, async (req, res) => {
    try {
        const cuid = req.user.id;
        const { topic } = req.body;
    
        // Check if the topic exists in the database
        const topicExists = await Topic.findOne({ topic });
        if (!topicExists) {
            return res.json({ error: "Topic does not exist" });
        } else {
            // Fetch the user document
            const user = await User.findOne({ _id: cuid });
    
            if (!user) {
                return res.json({ error: "User not found" });
            }else{
                if(user.userType=="admin"){
                            // Delete the topic from all users who have subscribed to it
        const deleteResult = await Topic.deleteMany({ topic });

        // MQTT unsubscription logic here for each user (assuming client is defined)
        // Example: Loop through deleteResult and client.unsubscribe(topic) for each user

        res.json({ message: `Topic '${topic}' deleted from all users who subscribed to it` });
                }else{
                    res.status(500).json({
                        error:"Delete topic require admin access"
                    })
                }
            }
    
           
        }


    } catch (error) {
        res.status(400).json({ error: "Some error occurred", msg: error.message });
    }
});

//Subscribe to all available topics

router.post('/subscribe-all', fetchuser, async (req, res) => {
    try {
        // Find all topics subscribed by the current user
        const userTopics = await Topic.find({ user: req.user.id });

        // Extract topic names from userTopics
        const topicNames = userTopics.map(topic => topic.topic);

        // MQTT subscription logic here for each topic (assuming client is defined)
        for (const topicName of topicNames) {
            client.subscribe(topicName); // Assuming your MQTT client can subscribe to topics
        }

        res.json({ message: `Subscribed to all topics in the user's database` });
    } catch (error) {
        res.status(400).json({ error: "Some error occurred", msg: error.message });
    }
});

//Publish message and store that message to Database
router.post('/publish', fetchuser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { topicName, messageContent, messageType } = req.body;

        console.log('Received request to publish message:', topicName, messageContent, messageType);

        // Find the topic by its name
        const topic = await Topic.findOne({ topic: topicName });
        if (!topic) {
            console.log('Topic not found:', topicName);
            return res.status(404).json({ error: 'Topic not found' });
        }

        console.log('Found topic:', topic);

        // Create a new message
        const newMessage = new Message({
            user: userId,
            topic: topic._id,
            message: messageContent,
            msgtype: messageType
        });
        if (isConnected) {
            try {
                client.publish(topicName, messageContent);
                console.log('Message published successfully');
            } catch (error) {
                console.error('Error publishing message:', error);
            }
        } else {
            console.log('MQTT client is not connected. Message not published.');
        }
        

        console.log('Creating new message:', newMessage);

        // Save the new message
        await newMessage.save();

       
        console.log('Message saved successfully');

        res.json({ message: 'Message stored successfully' });
    } catch (error) {
        console.error('Error storing message:', error);
        res.status(500).json({ error: 'Failed to store message' });
    }
});

//recieve message from MQTT and store them to database
client.on('message', async (topic, message) => {
    try {
        console.log(`Received MQTT message on topic ${topic}: ${message.toString()}`);

        // Find the topic in the database
        const existingTopic = await Topic.findOne({ topic });
        if (!existingTopic) {
            console.log('Topic not found:', topic);
            return;
        }

        // Check if the user is subscribed to the topic
        const subscribedTopic = await Topic.findOne({ topic, user: existingTopic.user });
        if (!subscribedTopic) {
            console.log('User is not subscribed to the topic:', topic);
            return;
        }

        // Create a new message
        const newMessage = new Message({
            user: existingTopic.user,
            topic: existingTopic._id,
            message: message.toString(),
            msgtype: 'incoming', // Set the message type as 'incoming'
        });

        // Save the new message to the database
        await newMessage.save();

        console.log('Message stored in the database successfully');
    } catch (error) {
        console.error('Error storing message in the database:', error);
    }
});

// HTTP POST route for receiving messages from MQTT
router.post('/receive-message', fetchuser, async (req, res) => {
    try {
        const { topic } = req.body;

        // Find the topic in the database
        const existingTopic = await Topic.findOne({ topic });
        if (!existingTopic) {
            console.log('Topic not found:', topic);
            return res.status(404).json({ error: 'Topic not found' });
        }

        // Check if the user is subscribed to the topic
        const subscribedTopic = await Topic.findOne({ topic, user: req.user.id });
        if (!subscribedTopic) {
            console.log('User is not subscribed to the topic:', topic);
            return res.status(403).json({ error: 'User is not subscribed to the topic' });
        }

        res.json({ message: 'Receiving messages from MQTT on this topic' });
    } catch (error) {
        console.error('Error receiving messages from MQTT:', error);
        res.status(500).json({ error: 'Failed to receive messages from MQTT' });
    }
});

// Get messages from the current user's database on a specific topic
 
// Get messages for a specific topic
router.get('/show-msgs', fetchuser, async (req, res) => {
    try {
        const userId = req.user.id;
        const { topicName } = req.body;

        // Find the topic in the database
        const subscribedTopic = await Topic.findOne({ topic: topicName, user: userId });
        if (!subscribedTopic) {
            return res.status(403).json({ error: 'User is not subscribed to the topic' });
        }

        // Retrieve messages for the specified topic
        const messages = await Message.find({ user: userId, topic: subscribedTopic._id });

        console.log('Retrieved messages:', messages); // Log the retrieved messages

        res.json({ messages });
    } catch (error) {
        console.error('Error getting messages:', error);
        res.status(500).json({ error: 'Failed to get messages' });
    }
});


module.exports = router;