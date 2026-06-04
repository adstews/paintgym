import { toFile } from "openai";
import { getOpenAIClient, OPENAI_IMAGE_MODEL } from "./client";
// The hard rules are model-agnostic — both generators append the exact same
// rules so OpenAI and Gemini are held to the same fidelity bar.
import { applyHardRules } from "../gemini/hard-rules";
import { platformDimensions } from "../types";
import type { Platform } from "../types";
// Mirror the Gemini generator's interface so the router can call either one
// interchangeably.
import type {
  GenerateImageOptions,
  GenerateImageResult,
} from "../gemini/generate-image";

export type { GenerateImageOptions, GenerateImageResult };

const REFERENCE_ANCHOR =
  "The attached image(s) are the EXACT product and brand assets for this ad. " +
  "Reproduce the product faithfully — the same item, packaging, label, shape, " +
  "proportions, colors, and any on-product text or logo. Do not invent, swap, " +
  "or substitute a different product.\n\n";

// Per-call deadline so a stalled request fails fast instead of hanging the route.
const CALL_TIMEOUT_MS = 120_000;
const MAX_ATTEMPTS = 3;

// gpt-image-1 only renders a fixed set of sizes. Map the platform aspect to the
// nearest supported portrait/landscape/square frame; the exact pixel target
// still rides along in the prompt via the hard rules.
function openaiSize(
  platform: Platform,
): "1024x1024" | "1024x1536" | "1536x1024" {
  const d = platformDimensions(platform);
  if (d.width > d.height) return "1536x1024";
  if (d.height > d.width) return "1024x1536";
  return "1024x1024";
}

// Same transient-failure classification as the Gemini generator: overload, rate
// limits, timeouts, and the occasional empty response are all worth retrying.
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

export async function generateImageOpenAI({
  prompt,
  referenceImages = [],
  platform = "meta",
}: GenerateImageOptions): Promise<GenerateImageResult> {
  const client = getOpenAIClient();

  const dims = platformDimensions(platform);
  const finalPrompt = applyHardRules(prompt, {
    aspect: dims.aspect,
    width: dims.width,
    height: dims.height,
  });
  const size = openaiSize(platform);
  const promptText =
    referenceImages.length > 0 ? REFERENCE_ANCHOR + finalPrompt : finalPrompt;

  let lastErr: unknown = new Error("OpenAI returned no image data");
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      // With reference images we use the edits endpoint so gpt-image-1 conditions
      // on the real product; without them we use plain generation.
      const response =
        referenceImages.length > 0
          ? await client.images.edit(
              {
                model: OPENAI_IMAGE_MODEL,
                image: await Promise.all(
                  referenceImages.map((ref, i) =>
                    toFile(Buffer.from(ref.data, "base64"), `ref-${i}.png`, {
                      type: ref.mimeType,
                    }),
                  ),
                ),
                prompt: promptText,
                size,
              },
              { timeout: CALL_TIMEOUT_MS },
            )
          : await client.images.generate(
              {
                model: OPENAI_IMAGE_MODEL,
                prompt: promptText,
                size,
              },
              { timeout: CALL_TIMEOUT_MS },
            );

      const b64 = response.data?.[0]?.b64_json;
      if (b64) {
        return {
          imageDataUrl: `data:image/png;base64,${b64}`,
          mimeType: "image/png",
        };
      }
      throw new Error("OpenAI returned no image data");
    } catch (err) {
      lastErr = err;
      if (attempt < MAX_ATTEMPTS && isRetryable(err)) {
        const backoff =
          1200 * 2 ** (attempt - 1) + Math.floor(Math.random() * 600);
        await sleep(backoff);
        continue;
      }
      throw err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
