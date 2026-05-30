import { z } from "zod";
import { BRIEF_MODEL, getAnthropicClient } from "./client";
import {
  buildProductContext,
  buildStyleSection,
} from "./brief-context";
import type { Project, VariantLabel } from "../types";

interface VariantSpec {
  label: VariantLabel;
  display: string;
  direction: string;
}

const VARIANT_SPECS: VariantSpec[] = [
  {
    label: "faithful",
    display: "Faithful",
    direction:
      "Closest to the original. Same layout structure, same composition logic, same general mood, only the product, brand, and copy swapped to the user's. Useful as the obvious comparison point.",
  },
  {
    label: "simplified",
    display: "Simplified",
    direction:
      "Same core idea, stripped down. Less on-image text, more whitespace, fewer elements competing for attention. Quieter, more editorial.",
  },
  {
    label: "bold",
    display: "Bold",
    direction:
      "Same core idea, pushed harder. Larger type, higher contrast, more decisive shadows and color blocking. Made to stop the scroll cold.",
  },
  {
    label: "alt_palette",
    display: "Alt palette",
    direction:
      "Same composition, different color and mood. Choose a palette that fits the user's brand context but contrasts the original. Different emotional register: if the original was warm, try cool; if bright, try moody.",
  },
  {
    label: "platform_adapted",
    display: "Platform adapted",
    direction:
      "Same creative concept, restaged for a different platform feel. If the original looks like a 4:5 Meta feed ad, restage as a vertical 9:16 TikTok or Reels frame with the hero in the upper two-thirds. If the original is vertical, restage as a horizontal LinkedIn-friendly frame. Adjust composition so the message survives the new aspect.",
  },
];

const briefSchema = z.object({
  label: z.enum([
    "faithful",
    "simplified",
    "bold",
    "alt_palette",
    "platform_adapted",
  ]),
  brief_text: z.string().min(20),
});

const responseSchema = z.object({
  analysis: z.string().min(20),
  briefs: z.array(briefSchema).min(5).max(5),
});

export type RecreateResponse = z.infer<typeof responseSchema>;

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

const RECREATE_SYSTEM = `You are a senior creative director. The user is going to show you an example static ad image and give you the product they want to advertise. Your job is two things:

1. Analyze the example. In a short paragraph, describe what makes it work: layout (split-screen, single hero, etc.), composition, color palette and mood, typographic choices, where text sits and how much there is, the creative framework or concept (social proof, before-after, bold claim, lifestyle, comparison, etc.), and what specifically you would steal and apply to a different brand. Be concrete. Do not describe what is depicted as if narrating a photo; describe what the ad is doing as a piece of creative.

2. Write five distinct image generation briefs for the user's product that reuse the analyzed creative framework. The briefs go straight to an image model (Gemini Nano Banana). Each brief is a single self-contained paragraph the image model can render. The five briefs must be meaningfully different from each other, each following a specific direction (faithful, simplified, bold, alt palette, platform adapted) the user will give you.

Rules for the briefs:
- This is recreation, not copying. Apply the creative framework of the original to the USER'S product and brand. Use the user's product name, brand, price, claims, and proof points verbatim. Do not invent details.
- Each brief must describe composition, subject, lighting, color palette, typography, and on-image copy.
- Quote on-image copy verbatim in double quotes so the image model renders it exactly.
- Match the style settings (aggressiveness, tone) provided.
- Never use em dashes. Never use exclamation marks. Never use AI cliches like unleash, elevate, revolutionize, game-changer, journey.
- Do not address the human reader, do not explain your choices in the brief itself.

Output format:
- Respond with a single JSON object and nothing else. No prose, no markdown fence, no preamble.
- Shape:
{
  "analysis": "string",
  "briefs": [
    { "label": "faithful", "brief_text": "string" },
    { "label": "simplified", "brief_text": "string" },
    { "label": "bold", "brief_text": "string" },
    { "label": "alt_palette", "brief_text": "string" },
    { "label": "platform_adapted", "brief_text": "string" }
  ]
}
- Return exactly five briefs in the order shown above.`;

function buildUserText(project: Project): string {
  const variantLines = VARIANT_SPECS.map(
    (v, i) => `${i + 1}. "${v.label}" (${v.display}) - ${v.direction}`,
  ).join("\n");

  return `## Product context (this is the brand the briefs are for)
${buildProductContext(project)}

## Style direction
${buildStyleSection(project.style_settings)}

## Variants to write
${variantLines}

## Task
Look at the attached example ad. Write the analysis, then write five briefs for the user's product following the five variant directions above, in the same order. Return the JSON object now, with no other text.`;
}

export interface RecreateFromExampleOptions {
  project: Project;
  exampleImageUrl: string;
}

export async function recreateFromExample({
  project,
  exampleImageUrl,
}: RecreateFromExampleOptions): Promise<RecreateResponse> {
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: BRIEF_MODEL,
    max_tokens: 6000,
    system: RECREATE_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "url", url: exampleImageUrl },
          },
          { type: "text", text: buildUserText(project) },
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
    throw new Error("Recreate response was not valid JSON");
  }
  const validated = responseSchema.safeParse(parsedJson);
  if (!validated.success) {
    throw new Error("Recreate response did not match the expected schema");
  }

  // Enforce the canonical variant order.
  const byLabel = new Map(validated.data.briefs.map((b) => [b.label, b]));
  const ordered = VARIANT_SPECS.map((v) => byLabel.get(v.label));
  if (ordered.some((b) => !b)) {
    throw new Error("Recreate response is missing one or more variants");
  }
  return {
    analysis: validated.data.analysis,
    briefs: ordered as RecreateResponse["briefs"],
  };
}
