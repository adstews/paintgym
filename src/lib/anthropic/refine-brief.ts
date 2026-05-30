import { BRIEF_MODEL, getAnthropicClient } from "./client";
import {
  buildConceptSection,
  buildProductContext,
  buildStyleSection,
} from "./brief-context";
import type { Concept, Project } from "../types";

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

type AnthropicImageMediaType =
  | "image/png"
  | "image/jpeg"
  | "image/webp"
  | "image/gif";

function parseDataUrl(
  dataUrl: string,
): { mediaType: AnthropicImageMediaType; data: string } {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Source image is not a base64 data URL");
  const mediaType = match[1].toLowerCase();
  if (!SUPPORTED_IMAGE_TYPES.has(mediaType)) {
    throw new Error(`Unsupported image type for refinement: ${mediaType}`);
  }
  return { mediaType: mediaType as AnthropicImageMediaType, data: match[2] };
}

const REFINE_SYSTEM = `You are the same senior creative director who writes image generation briefs for paid social ads. The user has reviewed an image you produced and asked for specific changes. Your job is to write a brand new brief that incorporates their feedback while keeping the core concept intact.

Do not patch the old brief. Do not append fixes. Write the brief fresh, as if you were starting over with the new direction in mind. The new brief must be a single self-contained paragraph the image model can render without further context.

When you interpret the feedback, take it literally and act on it:
- If they ask for a different layout, describe the new layout twice: once as a directive sentence and once in the spatial description of the canvas.
- If they ask for different copy, quote the exact new copy in double quotes. Drop any phrasing the user did not endorse.
- If they ask for a different color or palette, lead with the new palette and reference brand colors by hex where applicable.
- If they ask for less text, reduce on-image copy to one short phrase plus the product hero. If they ask for more clarity, increase whitespace and shrink the count of elements.
- If they ask for a different mood, rebuild the lighting, color, and styling from that mood downward.
- Keep the core concept that this brief is for. Do not switch concepts to chase the feedback.

Rules that still apply:
- Use the exact product or brand details provided. Do not invent product names, prices, features, claims, or testimonials.
- Single self-contained paragraph. No preamble, no options, no explanations.
- Quote any on-image copy verbatim in double quotes.
- Match the supplied aggressiveness, tone, visual style, and platform.
- Never use em dashes. Never use exclamation marks. Never use AI cliches like unleash, elevate, revolutionize, game-changer, journey.

Output only the new brief paragraph.`;

function buildRefineUserPrompt(
  project: Project,
  concept: Concept | null,
  originalBrief: string,
  feedback: string,
): string {
  const conceptSection = concept
    ? `## Concept for this ad\n${buildConceptSection(concept)}\n\n`
    : "";
  return `## Product context
${buildProductContext(project)}

${conceptSection}## Style direction
${buildStyleSection(project.style_settings)}

## The brief that produced the attached image
"""
${originalBrief.trim()}
"""

## What the user wants changed
"""
${feedback.trim()}
"""

## Your task
Write a brand new brief that incorporates the user's feedback while keeping the core concept intact. Do not tweak the old brief. Output only the new brief paragraph, with no preamble.`;
}

export interface RefineBriefOptions {
  project: Project;
  concept: Concept | null;
  originalBrief: string;
  sourceImageDataUrl: string;
  feedback: string;
}

export async function refineBriefFromFeedback({
  project,
  concept,
  originalBrief,
  sourceImageDataUrl,
  feedback,
}: RefineBriefOptions): Promise<string> {
  const { mediaType, data } = parseDataUrl(sourceImageDataUrl);
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: BRIEF_MODEL,
    max_tokens: 1600,
    system: REFINE_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data },
          },
          {
            type: "text",
            text: buildRefineUserPrompt(
              project,
              concept,
              originalBrief,
              feedback,
            ),
          },
        ],
      },
    ],
  });

  const parts: string[] = [];
  for (const block of response.content) {
    if (block.type === "text") parts.push(block.text);
  }
  const text = parts.join("").trim();
  if (!text) throw new Error("Claude returned an empty refined brief");
  return text;
}
