import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { BRIEF_MODEL, getAnthropicClient } from "./client";
import {
  buildConceptSection,
  buildProductContext,
  buildStyleSection,
} from "./brief-context";
import type {
  CompetitorData,
  Concept,
  ConceptVariant,
  Project,
} from "../types";
import type { InlineImage } from "../gemini/reference-images";

const SUPPORTED_MIME = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

function buildSystem(hasImage: boolean): string {
  return `You are a senior creative director who writes static social ad briefs that position one product directly against a named competitor. Every brief you write must do work for the user's product by pointing at the competitor's weakness. You are not subtle. You are accurate.

You will be given:
1. The user's product, with full context.
2. The competitor's product, scraped from their site. Name, description, features, and price may be present.
3. A concept template that frames the ad.

For the concept you are given, write ONE brief that positions the user's product against the competitor. The brief feeds an image model (Gemini Nano Banana). One self-contained paragraph.

How to use the competitor data:
- Use the competitor's real name where appropriate. For "Us vs Them", "Comparison Chart", "Old vs New": name the competitor explicitly in the brief and in any on-image copy.
- For "Bold Claim" or hero-style concepts: do not necessarily name the competitor on-image, but write the claim so it directly answers something the competitor cannot answer. Pull the wedge from the user's strengths versus the competitor's gaps.
- For "Before & After" or transformation concepts: imply the "before" state as the competitor experience and the "after" state as the user's product.
- For social proof concepts: the testimonial copy must reference a specific weakness the competitor has and how the user's product resolved it.
- Across every concept, derive the wedge from the actual scraped fields, not from imagination. If you do not have evidence for a contrast, do not invent one.

Rules that always apply to every brief:
${
    hasImage
      ? "- A photo of the user's ACTUAL product is attached. It is the user's EXACT product. The ad must feature THIS EXACT product, same item, packaging, label, shape, proportions, colors, and any text or logo printed on it. Describe the real product as you see it and instruct the model to reproduce it faithfully from the attached reference. Never invent, restyle, or substitute a different product.\n"
      : ""
  }- Use the exact product, brand, price, and proof details for the user. Do not invent product names, prices, features, claims, or testimonials.
- Use the competitor name exactly as scraped. Do not insult them, do not use slurs or derogatory language, do not lie about them. Be sharp, not unfair.
- The brief is for ONE static image. Describe composition, subject, lighting, color palette, typography, on-image copy, and aspect ratio.
- On-image copy must be short and concrete. Quote it verbatim in double quotes so the image model renders it exactly.
- Match the supplied aggressiveness, tone, visual style, and platform.
- Never use em dashes. Never use exclamation marks. Never use AI cliches like unleash, elevate, revolutionize, game-changer, journey.
- Do not address the human reader. Do not explain your choices in the brief.

Output format:
- Respond with a single JSON object and nothing else. No prose, no markdown fence, no preamble.
- Shape: {"brief_text": "..."}`;
}

function buildCompetitorSection(competitor: CompetitorData): string {
  const lines: string[] = [];
  const brand = competitor.brand;
  const name = competitor.name;
  if (brand) lines.push(`Competitor brand: ${brand}`);
  if (name) lines.push(`Competitor product: ${name}`);
  if (competitor.description) {
    lines.push(`Competitor pitch: ${competitor.description.trim()}`);
  }
  if (competitor.features && competitor.features.length > 0) {
    lines.push(
      `Competitor features as they describe them: ${competitor.features.join("; ")}`,
    );
  }
  if (competitor.price) lines.push(`Competitor price point: ${competitor.price}`);
  if (competitor.url) lines.push(`Competitor URL: ${competitor.url}`);
  if (lines.length === 0) {
    lines.push("Competitor: details not available beyond the URL.");
  }
  return lines.join("\n");
}

function buildUserPrompt(
  project: Project,
  concept: Concept,
  competitor: CompetitorData,
  hasImage: boolean,
): string {
  return `## Your product (the brand the ad is for)
${buildProductContext(project)}
${hasImage ? "\nThe attached image is the user's actual product this ad must feature. Describe and reproduce THAT product exactly.\n" : ""}
## Competitor (position against this)
${buildCompetitorSection(competitor)}

## Concept for this ad
${buildConceptSection(concept)}

## Style direction
${buildStyleSection(project.style_settings)}

## Your task
Write one competitive brief for this concept. Use the competitor information above to sharpen the positioning. Return only the JSON object.`;
}

const responseSchema = z.object({
  brief_text: z.string().min(20),
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

export interface CompetitiveVariantBrief {
  variant: ConceptVariant;
  brief_text: string;
}

export interface GenerateCompetitiveBriefsOptions {
  project: Project;
  concept: Concept;
  competitor: CompetitorData;
  productImage?: InlineImage | null;
}

export async function generateCompetitiveBriefsForConcept({
  project,
  concept,
  competitor,
  productImage = null,
}: GenerateCompetitiveBriefsOptions): Promise<CompetitiveVariantBrief[]> {
  const client = getAnthropicClient();

  const useImage = !!productImage && SUPPORTED_MIME.has(productImage.mimeType);
  const userText = buildUserPrompt(project, concept, competitor, useImage);
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
    system: buildSystem(useImage),
    messages: [{ role: "user", content }],
  });

  const text = extractText(response.content);
  const candidate = extractJsonObject(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    throw new Error("Competitive brief response was not valid JSON");
  }
  const validated = responseSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(
      "Competitive brief response did not match the expected schema",
    );
  }
  return [{ variant: "A", brief_text: validated.data.brief_text }];
}
