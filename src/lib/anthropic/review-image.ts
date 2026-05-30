import { z } from "zod";
import { BRIEF_MODEL, getAnthropicClient } from "./client";

export type QaSeverity = "minor" | "major";
export type Severity = QaSeverity | "none";

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

type AnthropicImageMediaType = "image/png" | "image/jpeg" | "image/webp" | "image/gif";

export const reviewSchema = z.object({
  passed: z.boolean(),
  issues: z.array(z.string()).default([]),
  severity: z.enum(["none", "minor", "major"]),
});

export type ReviewResult = z.infer<typeof reviewSchema>;

interface ParsedImage {
  mediaType: AnthropicImageMediaType;
  data: string;
}

function parseDataUrl(dataUrl: string): ParsedImage {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("Image is not a base64 data URL");
  }
  const mediaType = match[1].toLowerCase();
  if (!SUPPORTED_IMAGE_TYPES.has(mediaType)) {
    throw new Error(`Unsupported image type for review: ${mediaType}`);
  }
  return { mediaType: mediaType as AnthropicImageMediaType, data: match[2] };
}

function extractText(blocks: Array<{ type: string; text?: string }>): string {
  const parts: string[] = [];
  for (const block of blocks) {
    if (block.type === "text" && typeof block.text === "string") {
      parts.push(block.text);
    }
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

const REVIEW_SYSTEM = `You are a strict QA reviewer for static paid social ad images. You inspect a single generated image and compare it against the brief that produced it. You are pedantic and skeptical.

Your job is to detect any of the following error categories:
1. Text rendering errors: misspellings, garbled or invented letters, fake glyphs, half-formed characters.
2. Product label or brand distortion: altered, redesigned, or invented brand marks or packaging.
3. Wrong element counts: brief asked for N items, image shows a different number.
4. Missing required elements: anything the brief explicitly required is absent.
5. Layout mismatch: the structural composition does not match what the brief specified (for example, brief asked for split-screen and the image is a single panel).
6. Text overlap or cut-off: any on-image copy that is clipped, overlapping other type, or unreadable.
7. AI artifacts: warped hands, extra fingers, melted faces, smeared product, impossible reflections.
8. Wrong aspect ratio or framing: composition feels wrong for the stated dimensions.

Severity rules:
- "major" = anything that makes the image unusable: misspelled or garbled on-image text, broken brand mark, missing required element, wrong layout type, wrong element count for a benefits or comparison concept, severe AI artifacts on faces or hands.
- "minor" = a problem worth flagging but the image is still potentially usable: small typography issues, mild crops, slightly off composition.
- "none" = no notable problems; the image fairly executes the brief.

Output rules:
- Respond with a single JSON object and nothing else. No prose, no markdown fence, no preamble.
- Shape: {"passed": boolean, "issues": string[], "severity": "none" | "minor" | "major"}
- "passed" is true ONLY when severity is "none".
- "issues" is a list of short, concrete strings. One issue per string. Empty array when passed.
- Be specific about the failure ("the headline reads 'Hidraton' instead of 'Hydration'") rather than vague ("text issues").`;

function buildReviewUserText(briefText: string): string {
  return `Brief that produced this image:
"""
${briefText.trim()}
"""

Review the attached image against the brief and the error categories. Return the JSON object now.`;
}

export interface ReviewImageOptions {
  imageDataUrl: string;
  briefText: string;
}

export async function reviewImage({
  imageDataUrl,
  briefText,
}: ReviewImageOptions): Promise<ReviewResult> {
  const { mediaType, data } = parseDataUrl(imageDataUrl);
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: BRIEF_MODEL,
    max_tokens: 1024,
    system: REVIEW_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data },
          },
          { type: "text", text: buildReviewUserText(briefText) },
        ],
      },
    ],
  });

  const text = extractText(response.content);
  const candidate = extractJsonObject(text);
  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(candidate);
  } catch {
    throw new Error("QA review did not return valid JSON");
  }
  const validated = reviewSchema.safeParse(parsedJson);
  if (!validated.success) {
    throw new Error("QA review did not match the expected schema");
  }

  // Defensive normalization: if model says passed=true with issues, trust severity.
  const result = validated.data;
  if (result.severity === "none") {
    return { passed: true, issues: [], severity: "none" };
  }
  return {
    passed: false,
    issues: result.issues.length > 0 ? result.issues : ["Unspecified issue"],
    severity: result.severity,
  };
}
