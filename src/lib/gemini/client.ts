import { GoogleGenerativeAI } from "@google/generative-ai";

let cached: GoogleGenerativeAI | null = null;

export function getGeminiClient() {
  if (cached) return cached;
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
  cached = new GoogleGenerativeAI(key);
  return cached;
}

export const IMAGE_MODEL = "gemini-2.5-flash-image-preview";
