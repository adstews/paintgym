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

const REWRITE_SYSTEM = `You are the same senior creative director who writes image generation briefs for paid social ads. A previous brief you wrote produced an image that failed QA. You will see the failed image, the brief that produced it, and the specific Hard Rules a QA reviewer flagged.

Your job is to write a brand new brief for the same concept that works around the failure modes. Do not iterate. Do not try to "fix" the old brief. Write a fundamentally different brief, with a different angle, composition, copy, or visual treatment.

The QA reviewer enforces ten Hard Rules. The issues list will be prefixed with rule numbers (for example "Rule 2: ..."). For each failed rule, the new brief must actively prevent that failure mode from recurring:

- Rule 1 failures (text spelling): cut the amount of on-image text. Use shorter, simpler, more common words the model can render cleanly. Replace long headlines with one or two words plus the product hero. If a specific number kept failing, drop the number and describe the same idea pictorially. Avoid uncommon proper nouns where possible.
- Rule 2 failures (text edge spacing): explicitly require generous margins on all sides for any text. Add a directive sentence like "leave a margin of at least 8 percent of the canvas on every side around all text" and re-state where text sits (for example, "centered in the upper third of the canvas with clear space above, below, and on both sides").
- Rule 3 failures (product sizing): name the real-world size of the product (for example, "a standard 5 ounce glass hot sauce bottle") and the reference object's size, and describe their proportional relationship explicitly. Use phrases like "the bottle stands approximately a third the height of the hand holding it" to anchor scale.
- Rule 4 failures (Before/After logic): for any comparison concept, state in two separate sentences that the advertised product appears ONLY on the favorable side. Describe the other side as a deliberately different, generic, or absent alternative. Name what each side shows in the spatial description, not just the directive.
- Rule 5 failures (concept-prompt alignment): lead the brief with a sharp one-sentence description of the concept format itself (for example, "this is a screenshot of the iOS Notes app" or "this is a two-panel meme template"), then describe content. Restate the format in the spatial description so the model commits to it.
- Rule 6 failures (brand name accuracy): quote the brand and product name verbatim in double quotes everywhere they appear on canvas. Avoid making the brand name the primary rendered text if the model has shown it cannot spell it; substitute a short safe phrase and keep the brand mark in the logo position instead.
- Rule 7 failures (duplicate elements): specify exact element counts ("a single bottle", "exactly two testimonial cards"). If the prior image duplicated the hero, reduce to a single hero. Avoid mirrored compositions when the model has shown it doubles elements.
- Rule 8 failures (readable text size): reduce the amount of text drastically. Name a maximum word count for any on-image copy (for example, "no more than four words total on canvas") and require the type to occupy a specific portion of the canvas height ("the headline occupies roughly 12 percent of the canvas height").
- Rule 9 failures (contrast legibility): name the text color and the background color directly, choose colors that contrast strongly (dark type on a calm light area, or light type on a saturated dark area), and reserve a dedicated solid panel or area behind text rather than overlaying it on a busy photo.
- Rule 10 failures (face/hand distortion): remove the human element entirely. Crop tight so faces and hands are outside the frame, or replace the human with an object, a flat lay, or a hands-out-of-frame product hero.
- Rule 11 failures (logo accuracy): do one of two things, whichever fits the concept. Option A, render the logo more simply: describe it as a single solid wordmark in a specific color, drop any complex icon or stylized lettering, give it generous padding and place it in a clean corner so the model has space to render the letterforms cleanly. Option B, leave space for post-production: do not render the logo in the image at all. Reserve a clearly described empty area (for example, "a 120 pixel tall band of clean negative space along the bottom edge where the logo will be added in post") and explicitly say no logo should appear in the rendered output. Pick Option B whenever the brand mark is intricate enough that the model is unlikely to redraw it faithfully.

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
