import { getGeminiClient, IMAGE_MODEL } from "./client";
import { applyHardRules } from "./hard-rules";

export interface GenerateImageOptions {
  prompt: string;
  referenceImages?: { mimeType: string; data: string }[];
}

export interface GenerateImageResult {
  imageDataUrl: string;
  mimeType: string;
}

export async function generateImage({
  prompt,
  referenceImages = [],
}: GenerateImageOptions): Promise<GenerateImageResult> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: IMAGE_MODEL });

  const finalPrompt = applyHardRules(prompt);

  const parts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  > = [{ text: finalPrompt }];

  for (const ref of referenceImages) {
    parts.push({ inlineData: { mimeType: ref.mimeType, data: ref.data } });
  }

  const result = await model.generateContent({
    contents: [{ role: "user", parts }],
  });

  const candidates = result.response.candidates ?? [];
  for (const candidate of candidates) {
    for (const part of candidate.content?.parts ?? []) {
      const inline = (part as { inlineData?: { mimeType: string; data: string } })
        .inlineData;
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
