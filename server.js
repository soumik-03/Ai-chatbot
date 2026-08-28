import express from "express";
import cors from "cors";
import "dotenv/config";
import OpenAI from "openai";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(cors());
app.use(express.json({ limit: "6mb" }));
const __filename = fileURLToPath(import.meta.url);
app.use(express.static(path.join(path.dirname(__filename), "Public")));

const openai = new OpenAI({ apiKey: process.env.GROQ_API_KEY || "no_key_found", baseURL: "https://api.groq.com/openai/v1" });
const MAX_MESSAGES = 20;
const VISION_MODEL = "qwen/qwen3.6-27b";

function isValidMessage(message) {
  if (!message || !["user", "assistant"].includes(message.role)) return false;
  if (typeof message.content === "string") return message.content.trim().length > 0 && message.content.length <= 4000;
  if (!Array.isArray(message.content) || message.content.length === 0) return false;
  return message.content.every((part) => part?.type === "text"
    ? typeof part.text === "string" && part.text.length <= 4000
    : part?.type === "image_url" && typeof part.image_url?.url === "string" && part.image_url.url.startsWith("data:image/"));
}
function hasImage(messages) {
  return messages.some((message) => Array.isArray(message.content) && message.content.some((part) => part.type === "image_url"));
}

const descriptions = { 0: "Clear sky", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Rime fog", 51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle", 61: "Light rain", 63: "Rain", 65: "Heavy rain", 71: "Light snow", 73: "Snow", 75: "Heavy snow", 80: "Rain showers", 81: "Moderate showers", 82: "Violent showers", 95: "Thunderstorm" };

app.get("/weather", async (req, res) => {
  const latitude = Number(req.query.lat), longitude = Number(req.query.lon);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return res.status(400).json({ error: "A valid location is required." });
  try {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({ latitude, longitude, current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m", timezone: "auto" });
    const [forecastResponse, placeResponse] = await Promise.all([fetch(url), fetch(`https://geocoding-api.open-meteo.com/v1/reverse?latitude=${latitude}&longitude=${longitude}&count=1`)]);
    if (!forecastResponse.ok) throw new Error("Weather service request failed");
    const forecast = await forecastResponse.json(), place = placeResponse.ok ? await placeResponse.json() : {}, current = forecast.current, location = place.results?.[0];
    res.json({ location: location ? `${location.name}, ${location.country}` : "Your location", temperature: Math.round(current.temperature_2m), feelsLike: Math.round(current.apparent_temperature), humidity: current.relative_humidity_2m, wind: Math.round(current.wind_speed_10m), description: descriptions[current.weather_code] || "Current conditions" });
  } catch (error) { console.error("Weather Error:", error.message); res.status(502).json({ error: "Weather information is temporarily unavailable." }); }
});

app.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    if (!Array.isArray(messages) || messages.length === 0 || messages.length > MAX_MESSAGES || !messages.every(isValidMessage)) return res.status(400).json({ reply: "Please send a valid, shorter conversation." });
    const completion = await openai.chat.completions.create({
      model: hasImage(messages) ? VISION_MODEL : "openai/gpt-oss-120b",
      messages: [{ role: "system", content: "You are a helpful AI assistant. Use markdown for formatting. If video frames are attached, say your observations are based on sampled frames, not the whole video." }, ...messages],
    });
    res.json({ reply: completion.choices[0].message.content });
  } catch (error) {
    console.error("AI Error:", error.status, error.message);
    const message = error.status === 401 ? "The Groq API key is missing or invalid."
      : error.status === 429 ? "The Groq free-plan limit has been reached. Please wait and try again."
      : error.status === 404 ? "The selected AI model is unavailable."
      : "The AI service could not complete that request. Please try again.";
    res.status(error.status || 500).json({ reply: message });
  }
});

app.listen(5000, () => console.log("Server running on http://localhost:5000"));
