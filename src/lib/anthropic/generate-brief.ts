import { z } from "zod";
import { BRIEF_MODEL, getAnthropicClient } from "./client";
import {
  buildConceptSection,
  buildProductContext,
  buildStyleSection,
} from "./brief-context";
import { buildFewShotSection, type FewShotExample } from "./few-shot";
import type { Concept, ConceptVariant, Project } from "../types";

function buildSystemPrompt(): string {
  return `You are a senior creative director who writes image generation briefs for paid social ads. Your brief feeds directly into an image model (Gemini Nano Banana or similar). The brief must be a single self-contained paragraph the image model can render without further context.

For the concept you are given, write ONE brief: the strongest, most scroll-stopping interpretation of the concept for this product.

Rules that always apply:
- Use the exact product or brand details provided. Do not invent product names, prices, features, claims, or testimonials.
- The brief is for ONE static image. Describe composition, subject, lighting, color palette, typography, on-image copy, and aspect ratio.
- On-image copy must be short and concrete. Quote it verbatim in double quotes so the image model renders it exactly.
- Match the supplied aggressiveness, tone, visual style, and platform.
- If brand colors, fonts, or voice are supplied, reference them by hex and name and write copy in the brand voice.
- Never use em dashes. Never use exclamation marks. Never use AI cliches like unleash, elevate, revolutionize, game-changer, journey.
- Do not address the human reader, do not explain your choices in the brief.

Output format:
- Respond with a single JSON object and nothing else. No prose, no markdown fence, no preamble.
- Shape: {"brief_text": "...", "summary": "...", "key_points": ["...", "...", "..."]}
- "brief_text" is the full image-generation brief described above.
- "summary" is one short sentence (max ~15 words) describing the ad at a glance.
- "key_points" is exactly three short phrases (~3 to 6 words each, not full sentences) naming the most important creative decisions: the hook or headline, the core visual, and the format or angle.`;
}

function buildUserPrompt(
  project: Project,
  concept: Concept,
  examples: FewShotExample[],
): string {
  const fewShot = buildFewShotSection(examples);
  return `## Product context
${buildProductContext(project)}

## Concept for this ad
${buildConceptSection(concept)}

## Style direction
${buildStyleSection(project.style_settings)}
${fewShot ? `\n${fewShot}\n` : ""}
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
}

export async function generateBriefsForConcept({
  project,
  concept,
  fewShotExamples = [],
}: GenerateBriefOptions): Promise<VariantBrief[]> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: BRIEF_MODEL,
    max_tokens: 2000,
    system: buildSystemPrompt(),
    messages: [
      {
        role: "user",
        content: buildUserPrompt(project, concept, fewShotExamples),
      },
    ],
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
