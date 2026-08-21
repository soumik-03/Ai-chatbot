import express from "express";
import cors from "cors";
import "dotenv/config"; 
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json());

// 1. Setup paths for the 'public' folder
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.static(path.join(__dirname, "public")));

// 2. Configuration & API Key Check
const GROQ_KEY = process.env.GROQ_API_KEY;

if (!GROQ_KEY) {
  console.error("❌ ERROR: GROQ_API_KEY is missing from your .env file!");
} else {
  console.log("✅ API Key detected. Server logic is loading...");
}

const openai = new OpenAI({
  apiKey: GROQ_KEY || "no_key_found",
  baseURL: "https://api.groq.com/openai/v1",
});

// 3. The Chat Route (V2 with Memory)
app.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body; // Receives chat history from script.js

    const completion = await openai.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: "You are a helpful AI assistant. Use markdown for formatting." },
        ...messages
      ]
    });

    res.json({ reply: completion.choices[0].message.content });
  } catch (error) {
    console.error("AI Error:", error.message); 
    res.status(500).json({ reply: "The AI is having trouble thinking right now." });
  }
});

// 4. START THE SERVER (Crucial: This must be at the very bottom)
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`🚀 SUCCESS! Server is running on http://localhost:${PORT}`);
  console.log("Keep this terminal open while using the chatbot.");
});