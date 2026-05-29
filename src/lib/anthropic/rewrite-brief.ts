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
  if (!match) throw new Error("Failed image is not a base64 data URL");
  const mediaType = match[1].toLowerCase();
  if (!SUPPORTED_IMAGE_TYPES.has(mediaType)) {
    throw new Error(`Unsupported image type for rewrite: ${mediaType}`);
  }
  return { mediaType: mediaType as AnthropicImageMediaType, data: match[2] };
}

const REWRITE_SYSTEM = `You are the same senior creative director who writes image generation briefs for paid social ads. A previous brief you wrote produced an image that failed QA. You will see the failed image, the brief that produced it, and the specific issues a QA reviewer flagged.

Your job is to write a brand new brief for the same concept that works around the failure modes. Do not iterate. Do not try to "fix" the old brief. Write a fundamentally different brief, with a different angle, composition, copy, or visual treatment.

When you choose the new direction, take the failure mode seriously:
- If on-image text was misspelled or garbled: cut the amount of on-image text. Use shorter, simpler words. If a long headline kept breaking, replace it with one or two words plus the product hero. If the model cannot render a number reliably, drop the number from the visual and describe the same idea pictorially.
- If a product label or brand mark was distorted: rely more on the supplied reference, describe the label far less and the surrounding context more, frame the product in 3/4 or partial view rather than tight straight-on.
- If element counts were wrong: name an exact count and a clear arrangement. If the brief asked for three things and the model rendered four, switch to a single hero element instead.
- If layout was wrong (asked for split-screen, got single panel): describe the layout twice, once as a clear directive sentence and once again in the spatial description of the canvas.
- If AI artifacts on faces or hands: remove the human element or crop tight so the problem area is outside the frame.
- If text overlapped or was cut off: reduce the text and reserve more whitespace for it. Specify where it goes on the canvas.

Rules that still apply:
- Use the exact product or brand details provided. Do not invent product names, prices, features, claims, or testimonials.
- Single self-contained paragraph. No preamble, no options, no explanations.
- Quote any on-image copy verbatim in double quotes.
- Match the supplied aggressiveness, tone, visual style, and platform.
- Never use em dashes. Never use exclamation marks. Never use AI cliches like unleash, elevate, revolutionize, game-changer, journey.

Output only the new brief paragraph.`;

function buildRewriteUserPrompt(
  project: Project,
  concept: Concept,
  originalBrief: string,
  issues: string[],
): string {
  const issuesList = issues
    .map((s, i) => `${i + 1}. ${s.trim()}`)
    .join("\n");
  return `## Product context
${buildProductContext(project)}

## Concept for this ad
${buildConceptSection(concept)}

## Style direction
${buildStyleSection(project.style_settings)}

## The brief that failed
"""
${originalBrief.trim()}
"""

## QA issues found in the attached image
${issuesList}

## Your task
Write a brand new brief for this same concept. Do not tweak the old brief. Change the angle, composition, or copy strategy so the failure modes above cannot recur. Output only the new brief paragraph, with no preamble.`;
}

export interface RewriteBriefOptions {
  project: Project;
  concept: Concept;
  originalBrief: string;
  failedImageDataUrl: string;
  issues: string[];
}

export async function rewriteBriefAfterFailure({
  project,
  concept,
  originalBrief,
  failedImageDataUrl,
  issues,
}: RewriteBriefOptions): Promise<string> {
  const { mediaType, data } = parseDataUrl(failedImageDataUrl);
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: BRIEF_MODEL,
    max_tokens: 1600,
    system: REWRITE_SYSTEM,
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
            text: buildRewriteUserPrompt(project, concept, originalBrief, issues),
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
  if (!text) throw new Error("Claude returned an empty rewrite");
  return text;
}
