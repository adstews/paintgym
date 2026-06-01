import { GoogleGenAI } from "@google/genai";

let cached: GoogleGenAI | null = null;

export function getGeminiClient() {
  if (cached) return cached;
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
  cached = new GoogleGenAI({ apiKey: key });
  return cached;
}

export const IMAGE_MODEL = "gemini-3-pro-image";
