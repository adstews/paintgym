import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { BRIEF_MODEL, getAnthropicClient } from "./client";
import {
  buildConceptSection,
  buildProductContext,
  buildStyleSection,
} from "./brief-context";
import { buildFewShotSection, type FewShotExample } from "./few-shot";
import type { Concept, ConceptVariant, Project } from "../types";
import type { InlineImage } from "../gemini/reference-images";

const SUPPORTED_MIME = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

function buildSystemPrompt(hasImage: boolean): string {
  return `You are a senior creative director who writes image-generation briefs for paid social ads. Your brief is fed directly to an image model (Gemini "Nano Banana Pro") that ALSO receives the product image. The brief must be a single, vivid, self-contained paragraph the model can render verbatim.

${
    hasImage
      ? `A photo of the ACTUAL product is attached. Study it. The ad must feature THIS EXACT product — same item, packaging, label, shape, proportions, colors, and any text or logo printed on it. In the brief, describe the real product as you actually see it and explicitly instruct the model to reproduce it faithfully from the attached reference. Never invent, restyle, or substitute a different product.`
      : `No product photo is attached; rely on the product details given and do not invent specific packaging or label artwork.`
  }

For the concept you are given, write ONE brief — the strongest, most scroll-stopping execution of that concept's framework for this product.

Make the brief concrete and renderable:
- Lead with the product as the hero unless the framework dictates otherwise; say where it sits in the 4:5 frame.
- Specify composition, background/scene, lighting, and color palette (reference brand colors by hex when given).
- Write every piece of on-image copy verbatim in "double quotes" so the model renders it exactly; keep it short and specific.
- Specify typography (a named typeface family or a faithful description) and the 4:5 / 1080x1350 framing.

Rules:
- Use the exact product, brand, price, and proof details provided. Do not invent product names, prices, features, claims, or testimonials.
- NEVER invent, guess, or hallucinate a price. Use only the exact price given in the product context. If no price is provided, do not mention price, cost, "$", discounts, or any number that implies a price anywhere in the brief.
- Match the supplied aggressiveness, tone, visual style, and platform.
- Never use em dashes. Never use exclamation marks. No AI cliches (unleash, elevate, revolutionize, game-changer, journey).
- Do not address the reader or explain your choices in the brief.

Output format:
- Respond with a single JSON object and nothing else. No prose, no markdown fence, no preamble.
- Shape: {"brief_text": "...", "summary": "...", "key_points": ["...", "...", "..."]}
- "brief_text" is the full image-generation brief described above.
- "summary" is one short sentence (max ~15 words) describing the ad at a glance.
- "key_points" is exactly three short phrases (~3 to 6 words each) naming the most important creative decisions: the hook or headline, the core visual, and the format or angle.`;
}

function buildContrastSection(contrastBrief: string | null | undefined): string {
  if (!contrastBrief || !contrastBrief.trim()) return "";
  return `\n## Brief already written for this concept (DO NOT REPEAT IT)
You already wrote the brief below for the SAME product and concept. Now write a COMPLETELY DIFFERENT version. Use a different copy angle, a different headline, a different visual approach, a different emotional hook, a different composition. Do not reuse any of its ideas, phrasing, layout, or imagery. The two ads should feel like they came from two different creative teams.
"""
${contrastBrief.trim()}
"""\n`;
}

function buildUserPrompt(
  project: Project,
  concept: Concept,
  examples: FewShotExample[],
  hasImage: boolean,
  contrastBrief: string | null | undefined,
): string {
  const fewShot = buildFewShotSection(examples);
  return `## Product context
${buildProductContext(project)}
${hasImage ? "\nThe attached image is the actual product this ad must feature. Describe and reproduce THAT product exactly.\n" : ""}
## Concept for this ad
${buildConceptSection(concept)}

## Style direction
${buildStyleSection(project.style_settings)}
${buildContrastSection(contrastBrief)}${fewShot ? `\n${fewShot}\n` : ""}
## Your task
Write one image generation brief for this concept. Return only the JSON object.`;
}

const responseSchema = z.object({
  brief_text: z.string().min(20),
  summary: z.string().min(3),
  key_points: z.array(z.string().min(1)).min(1),
});

function extractText(blocks: Array<{ type: string; text?: string }>): string {
  const parts: string[] = [];
  for (const b of blocks) {
    if (b.type === "text" && typeof b.text === "string") parts.push(b.text);
  }
  return parts.join("");
}

function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

export interface VariantBrief {
  variant: ConceptVariant;
  brief_text: string;
  summary: string;
  key_points: string[];
}

export interface GenerateBriefOptions {
  project: Project;
  concept: Concept;
  fewShotExamples?: FewShotExample[];
  productImage?: InlineImage | null;
  // The existing brief for this concept to deliberately diverge from (used when
  // writing the GPT set so it doesn't echo the Gemini set).
  contrastBrief?: string | null;
}

export async function generateBriefsForConcept({
  project,
  concept,
  fewShotExamples = [],
  productImage = null,
  contrastBrief = null,
}: GenerateBriefOptions): Promise<VariantBrief[]> {
  const client = getAnthropicClient();

  const useImage = !!productImage && SUPPORTED_MIME.has(productImage.mimeType);
  const userText = buildUserPrompt(
    project,
    concept,
    fewShotExamples,
    useImage,
    contrastBrief,
  );
  const content: Anthropic.MessageParam["content"] = useImage
    ? [
        {
          type: "image",
          source: {
            type: "base64",
            media_type: productImage!.mimeType as
              | "image/jpeg"
              | "image/png"
              | "image/gif"
              | "image/webp",
            data: productImage!.data,
          },
        },
        { type: "text", text: userText },
      ]
    : userText;

  const response = await client.messages.create({
    model: BRIEF_MODEL,
    max_tokens: 2000,
    system: buildSystemPrompt(useImage),
    messages: [{ role: "user", content }],
  });

  const text = extractText(response.content);
  const candidate = extractJsonObject(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    throw new Error("Brief response was not valid JSON");
  }
  const validated = responseSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error("Brief response did not match the expected schema");
  }
  return [
    {
      variant: "A",
      brief_text: validated.data.brief_text,
      summary: validated.data.summary,
      key_points: validated.data.key_points.slice(0, 3),
    },
  ];
}
