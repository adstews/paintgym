import { BRIEF_MODEL, getAnthropicClient } from "./client";
import {
  buildConceptSection,
  buildProductContext,
  buildStyleSection,
} from "./brief-context";
import type { Concept, Project } from "../types";

function buildSystemPrompt(): string {
  return `You are a senior creative director who writes image generation briefs for paid social ads. Your briefs feed directly into an image model (Gemini Nano Banana or similar). Each brief you write must be a single self-contained paragraph the image model can render without further context.

Rules that always apply:
- Use the exact product or brand details provided. Do not invent product names, prices, features, claims, or testimonials.
- The brief is for ONE static image. Describe the composition, subject, lighting, color palette, typography, on-image copy, and aspect ratio.
- On-image copy must be short and concrete: a headline, an optional sub-headline, and at most one call to action. Quote it verbatim in your brief, in double quotes, so the image model renders it exactly.
- Tailor the copy and visual direction to the aggressiveness level, tone, visual style, and platform you are given.
- Never use em dashes. Never use exclamation marks. Never use words like unleash, elevate, revolutionize, game-changer, journey, or other AI cliches. Prefer plain, specific language.
- Do not include disclaimers, options, or alternative directions. Commit to one ad.
- Do not address the human reader, do not explain your choices, do not include any preamble. Output only the brief paragraph itself.`;
}

function buildUserPrompt(project: Project, concept: Concept): string {
  return `## Product context
${buildProductContext(project)}

## Concept for this ad
${buildConceptSection(concept)}

## Style direction
${buildStyleSection(project.style_settings)}

## Your task
Write the single-paragraph image generation brief for this one ad. Use the product context above as ground truth. Match the concept framing. Match the aggressiveness, tone, visual style, and platform. Render the brief now, with no preamble.`;
}

export interface GenerateBriefOptions {
  project: Project;
  concept: Concept;
}

export async function generateBriefForConcept({
  project,
  concept,
}: GenerateBriefOptions): Promise<string> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: BRIEF_MODEL,
    max_tokens: 1600,
    system: buildSystemPrompt(),
    messages: [
      { role: "user", content: buildUserPrompt(project, concept) },
    ],
  });

  const parts: string[] = [];
  for (const block of response.content) {
    if (block.type === "text") parts.push(block.text);
  }
  const text = parts.join("").trim();
  if (!text) throw new Error("Claude returned an empty brief");
  return text;
}
