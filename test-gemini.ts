import * as dotenv from "dotenv";
dotenv.config();
import { GoogleGenerativeAI } from "@google/generative-ai";

async function testGemini() {
    const geminiApiKey = process.env.GEMINI_API_KEY || "";
    if (!geminiApiKey) {
        console.error("No API key found in process.env.GEMINI_API_KEY");
        return;
    }

    try {
        console.log("Key found, starting Gemini...");
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });
        const prompt = `Translate the following phone call summary to professional Swedish:\n\nThe user asked how to play squash.`;

        console.log("Sending prompt...");
        const result = await model.generateContent(prompt);
        console.log(JSON.stringify(result, null, 2));
        console.log("Text:", result.response.text());
    } catch (e) {
        console.error("Gemini threw an error:", e);
    }
}

testGemini();
