import * as dotenv from "dotenv";
dotenv.config();
import { GoogleGenerativeAI } from "@google/generative-ai";

async function listModels() {
    const geminiApiKey = process.env.GEMINI_API_KEY || "";
    if (!geminiApiKey) {
        console.error("No API key");
        return;
    }

    try {
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const models = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiApiKey}`);
        const data = await models.json();
        console.log("Available models:");
        data.models.forEach((m: any) => console.log(m.name));
    } catch (e) {
        console.error("Error fetching models:", e);
    }
}
listModels();
