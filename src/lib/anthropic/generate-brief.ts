import { z } from "zod";
import { BRIEF_MODEL, getAnthropicClient } from "./client";
import {
  buildConceptSection,
  buildProductContext,
  buildStyleSection,
} from "./brief-context";
import type { Concept, ConceptVariant, Project } from "../types";
import { CONCEPT_VARIANT_DIRECTION } from "../types";

function buildSystemPrompt(): string {
  return `You are a senior creative director who writes image generation briefs for paid social ads. Your briefs feed directly into an image model (Gemini Nano Banana or similar). Each brief must be a single self-contained paragraph the image model can render without further context.

For every concept you are given, you write three briefs — variant A, variant B, and variant C. The three briefs must be fundamentally different from each other:
- A is the most natural interpretation of the concept.
- B takes a different angle, different headline, different visual composition, different emotional framing.
- C is the wildcard — an unexpected take on the concept that still serves the product.
Do not make B or C a small variation of A. They should feel like distinct ad ideas.

Rules that always apply to every brief:
- Use the exact product or brand details provided. Do not invent product names, prices, features, claims, or testimonials.
- Each brief is for ONE static image. Describe composition, subject, lighting, color palette, typography, on-image copy, and aspect ratio.
- On-image copy must be short and concrete. Quote it verbatim in double quotes so the image model renders it exactly.
- Match the supplied aggressiveness, tone, visual style, and platform.
- If brand colors, fonts, or voice are supplied, reference them by hex and name and write copy in the brand voice.
- Never use em dashes. Never use exclamation marks. Never use AI cliches like unleash, elevate, revolutionize, game-changer, journey.
- Do not address the human reader, do not explain your choices in the brief.

Output format:
- Respond with a single JSON object and nothing else. No prose, no markdown fence, no preamble.
- Shape: {"variants": [{"variant": "A", "brief_text": "..."}, {"variant": "B", "brief_text": "..."}, {"variant": "C", "brief_text": "..."}]}
- Return all three variants, in the order A, B, C.`;
}

function buildUserPrompt(project: Project, concept: Concept): string {
  return `## Product context
${buildProductContext(project)}

## Concept for this ad
${buildConceptSection(concept)}

## Style direction
${buildStyleSection(project.style_settings)}

## Variant directions
A: ${CONCEPT_VARIANT_DIRECTION.A}
B: ${CONCEPT_VARIANT_DIRECTION.B}
C: ${CONCEPT_VARIANT_DIRECTION.C}

## Your task
Write the three image generation briefs for this concept. Return only the JSON object.`;
}

const variantSchema = z.object({
  variant: z.enum(["A", "B", "C"]),
  brief_text: z.string().min(20),
});

const responseSchema = z.object({
  variants: z.array(variantSchema).length(3),
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
}

export interface GenerateBriefOptions {
  project: Project;
  concept: Concept;
}

export async function generateBriefsForConcept({
  project,
  concept,
}: GenerateBriefOptions): Promise<VariantBrief[]> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: BRIEF_MODEL,
    max_tokens: 4000,
    system: buildSystemPrompt(),
    messages: [
      { role: "user", content: buildUserPrompt(project, concept) },
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
  // Canonicalize order
  const byVariant = new Map(validated.data.variants.map((v) => [v.variant, v]));
  const ordered: VariantBrief[] = [];
  for (const v of ["A", "B", "C"] as const) {
    const found = byVariant.get(v);
    if (!found) throw new Error(`Brief response is missing variant ${v}`);
    ordered.push({ variant: found.variant, brief_text: found.brief_text });
  }
  return ordered;
}
