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

  const response = await ai.models.generateContent({
    model: IMAGE_MODEL,
    contents: [{ role: "user", parts }],
  });

  const candidates = response.candidates ?? [];
  for (const candidate of candidates) {
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

  throw new Error("Gemini returned no image data");
}
