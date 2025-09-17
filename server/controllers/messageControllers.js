import Chat from "../models/Chat.js";
import User from "../models/User.js";
import axios from "axios";
import imagekit from "../config/imagekit.js";
import openai from "../config/openai.js";


// Text-based AI Chat Message Controller
export const textMessageController = async (req, res) => {
    try {
        const userId = req.user._id;

        if (req.user.credits < 1) {
            return res.json({ success: false, message: "Insufficient credits. Please recharge." });
        }

        const { chatId, prompt } = req.body;

        const chat = await Chat.findOne({ userId, _id: chatId });
        chat.messages.push({ role: "user", content: prompt, timestamp: Date.now(), isImage: false });

        const { choices } = await openai.chat.completions.create({
            model: "gemini-2.0-flash",
            messages: [
                {
                    role: "user",
                    content: prompt,
                },
            ],
        });

        const reply = { ...choices[0].message, timestamp: Date.now(), isImage: false }
        res.json({ success: true, reply });

        chat.messages.push(reply);
        await chat.save();
        await User.updateOne({ _id: userId }, { $inc: { credits: -1 } })



    } catch (error) {
        res.json({ success: false, message: error.message });

    }
}


// Image Generation Message Controller
export const imageMessageController = async (req, res) => {
    try {
        const userId = req.user._id;

        // Check Credits
        if (req.user.credits < 2) {
            return res.json({ success: false, message: "Insufficient credits. Please recharge." });
        }
        const { chatId, prompt, isPublished } = req.body;

        // Find Chat
        const chat = await Chat.findOne({ userId, _id: chatId })

        //Push user Message
        chat.messages.push({
            role: "user",
            content: prompt,
            timestamp: Date.now(),
            isImage: false
        });


        // Encode the prompt
        const encodedPrompt = encodeURIComponent(prompt);

        // Construct ImageKit AI generation URL
        const generateImageUrl = `${process.env.IMAGEKIT_URL_ENDPOINT}/ik-genimg-prompt-${encodedPrompt}/quickgpt/${Date.now()}.jpg?te=w-800,h-800`;

        //Trigger generation by fetching from imagekit
        const aiImageResponce = await axios.get(generateImageUrl, { responceType: "arraybuffer" });

        // Convert to Base64 
        const base64Image = `data:image/png;base64${Buffer.from(aiImageResponce.data, "binary").toString("base64")}`;

        // Upload to ImageKit Media Library
        const uploadResponce = await imagekit.upload({
            file: base64Image,
            fileName: `${Date.now()}.png`,
            folder: 'quickgpt'
        })

        const reply = {
            role: 'assistant',
            content: uploadResponce.url,
            timestamp: Date.now(),
            isImage: false,
            isPublished
        }
        res.json({ success: true, reply });

        chat.messages.push(reply);
        await chat.save();
        await User.updateOne({ _id: userId }, { $inc: { credits: -2 } })



    } catch (error) {
        res.json({ success: false, message: error.message });
    }
} 