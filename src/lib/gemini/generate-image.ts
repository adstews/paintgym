import { getGeminiClient, IMAGE_MODEL } from "./client";
import { applyHardRules } from "./hard-rules";
import { PLATFORM_DIMENSIONS } from "../types";
import type { Platform } from "../types";

export interface GenerateImageOptions {
  prompt: string;
  referenceImages?: { mimeType: string; data: string }[];
  platform?: Platform;
}

export interface GenerateImageResult {
  imageDataUrl: string;
  mimeType: string;
}

const REFERENCE_ANCHOR =
  "The attached image(s) are the EXACT product and brand assets for this ad. " +
  "Reproduce the product faithfully — the same item, packaging, label, shape, " +
  "proportions, colors, and any on-product text or logo. Do not invent, swap, " +
  "or substitute a different product.\n\n";

// Per-call deadline. Gemini 3 Pro image gen normally lands in 15-40s; this caps a
// single attempt so a stalled request fails fast instead of hanging the whole route.
const CALL_TIMEOUT_MS = 75_000;
const MAX_ATTEMPTS = 3;

// Transient backend conditions that are worth retrying: overload, rate limits,
// timeouts, and the occasional empty (text-only / safety-deflected) response.
function isRetryable(err: unknown): boolean {
  const msg = (err instanceof Error ? err.message : String(err)).toLowerCase();
  return (
    msg.includes("no image data") ||
    msg.includes("503") ||
    msg.includes("502") ||
    msg.includes("500") ||
    msg.includes("overloaded") ||
    msg.includes("unavailable") ||
    msg.includes("429") ||
    msg.includes("resource_exhausted") ||
    msg.includes("rate limit") ||
    msg.includes("quota") ||
    msg.includes("timeout") ||
    msg.includes("timed out") ||
    msg.includes("deadline") ||
    msg.includes("aborted") ||
    msg.includes("econnreset") ||
    msg.includes("fetch failed") ||
    msg.includes("network")
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractImage(response: {
  candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> } }>;
}): GenerateImageResult | null {
  for (const candidate of response.candidates ?? []) {
    for (const part of candidate.content?.parts ?? []) {
      const inline = part.inlineData;
      if (inline?.data) {
        const mime = inline.mimeType || "image/png";
        return {
          imageDataUrl: `data:${mime};base64,${inline.data}`,
          mimeType: mime,
        };
      }
    }
  }
  return null;
}

export async function generateImage({
  prompt,
  referenceImages = [],
  platform = "meta",
}: GenerateImageOptions): Promise<GenerateImageResult> {
  const ai = getGeminiClient();

  const dims = PLATFORM_DIMENSIONS[platform];
  const finalPrompt = applyHardRules(prompt, {
    aspect: dims.aspect,
    width: dims.width,
    height: dims.height,
  });

  // Reference images go first (the documented pattern for image-conditioned
  // generation), followed by the prompt. When references are present we prepend
  // an explicit instruction so the model reproduces the real product.
  const parts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  > = [];

  for (const ref of referenceImages) {
    parts.push({ inlineData: { mimeType: ref.mimeType, data: ref.data } });
  }

  const promptText =
    referenceImages.length > 0 ? REFERENCE_ANCHOR + finalPrompt : finalPrompt;
  parts.push({ text: promptText });

  let lastErr: unknown = new Error("Gemini returned no image data");
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: IMAGE_MODEL,
        contents: [{ role: "user", parts }],
        // Hard per-request timeout so a stalled call can't hang the function.
        config: { httpOptions: { timeout: CALL_TIMEOUT_MS } },
      });

      const image = extractImage(response);
      if (image) return image;
      throw new Error("Gemini returned no image data");
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_ATTEMPTS && isRetryable(err)) {
        // Exponential backoff with jitter to ride out overload/rate-limit blips.
        const backoff = 1200 * 2 ** (attempt - 1) + Math.floor(Math.random() * 600);
        await sleep(backoff);
        continue;
      }
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
