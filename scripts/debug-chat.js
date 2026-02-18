require('dotenv').config({ path: '.env.local' });
const https = require('https');

const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testChat() {
    console.log("Testing Chatbot with gemini-2.5-flash...");

    if (!process.env.GEMINI_API_KEY) {
        console.error("Error: GEMINI_API_KEY is missing in .env.local");
        return;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
    });

    try {
        const chat = model.startChat({
            history: [],
            generationConfig: {
                maxOutputTokens: 100,
            },
        });

        console.log("Sending message: 'Hello'");
        const result = await chat.sendMessage("Hello");
        const response = await result.response;
        console.log("Response text:", response.text());
        console.log("Success!");
    } catch (error) {
        console.error("Chat failed:", error);
    }
}

testChat();
