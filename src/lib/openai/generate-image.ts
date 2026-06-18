import { toFile } from "openai";
import { getOpenAIClient, OPENAI_IMAGE_MODEL } from "./client";
// The hard rules are model-agnostic — both generators append the exact same
// rules so OpenAI and Gemini are held to the same fidelity bar.
import { applyHardRules } from "../gemini/hard-rules";
import { isTransientImageError } from "../image-gen/transient";
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
  "The attached image is the EXACT product for this ad. Treat it as the real " +
  "product photo to place into the scene — do NOT redesign, restyle, recolor, " +
  "or reinterpret it. Reproduce it identically: same container shape, same cap " +
  "or lid, same label layout, the same text printed on the product spelled " +
  "exactly, same colors, same proportions. The product in the final ad must be " +
  "indistinguishable from this reference. Do not invent, swap, or substitute a " +
  "different product, and do not invent a new label or packaging.\n\n";

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
      if (attempt < MAX_ATTEMPTS && isTransientImageError(err)) {
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
