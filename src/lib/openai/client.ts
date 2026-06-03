import OpenAI from "openai";

let cached: OpenAI | null = null;

export function getOpenAIClient(): OpenAI {
  if (cached) return cached;
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  // maxRetries 0: generate-image.ts runs its own retry/backoff loop that mirrors
  // the Gemini generator, so we disable the SDK's built-in retries to avoid
  // double-retrying (and double-counting against the per-attempt timeout).
  cached = new OpenAI({ apiKey: key, maxRetries: 0 });
  return cached;
}

// Latest available OpenAI image model. gpt-image-1 supports reference-image
// conditioning (via the edits endpoint) and always returns base64 data.
export const OPENAI_IMAGE_MODEL = "gpt-image-1";
