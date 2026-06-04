import { getAnthropicClient, BRIEF_MODEL } from "@/lib/anthropic/client";
import { ANGLES } from "@/lib/video/formats";
import { getFormat } from "@/lib/video/formats";
import type {
  GeneratedScript,
  ProductDetails,
  ScriptAngle,
  VideoFormat,
} from "@/lib/video/types";

function extractText(blocks: Array<{ type: string; text?: string }>): string {
  const parts: string[] = [];
  for (const b of blocks) {
    if (b.type === "text" && typeof b.text === "string") parts.push(b.text);
  }
  return parts.join("");
}

function extractJsonArray(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("[")) return trimmed;
  const start = trimmed.indexOf("[");
  const end = trimmed.lastIndexOf("]");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

const VALID_ANGLES = new Set<string>(ANGLES.map((a) => a.key));

function buildSystem(format: VideoFormat): string {
  const spec = getFormat(format);
  const formatLine = spec
    ? `The ad format is "${spec.name}": ${spec.tagline}. Tone and pacing should suit that format.`
    : "";
  const angleList = ANGLES.map((a) => `- ${a.key}: ${a.label}. ${a.description}`).join(
    "\n",
  );
  return [
    "You are an expert direct response advertiser specializing in ecommerce video ads.",
    "You write scripts that sound like a real person talking to a friend about a product they love, never like an advertisement.",
    formatLine,
    "",
    "Write 5 different ad scripts. Each must use a DIFFERENT test angle from this framework, one per angle, all five represented:",
    angleList,
    "",
    "Every script grabs attention in under 4 seconds and runs 15 to 30 seconds total.",
    "Break each script into scenes that follow this converting structure:",
    "Hook (0-3s), Agitation (3-10s), Solution (10-20s), Social Proof (20-25s), CTA (25-30s).",
    "Lead with the emotional pain point, then show the transformation, and include specific product benefits.",
    "",
    "Return ONLY a JSON array of exactly 5 objects, no prose around it. Each object has this shape:",
    "{",
    '  "hook": "the spoken first line, under 4 seconds",',
    '  "angle": "one of the angle keys above",',
    '  "full_script": "the complete spoken script as one block of text",',
    '  "scenes": [',
    '    { "scene_number": 1, "timecode": "0-3s", "label": "Hook", "description": "what is on screen and what is said", "duration_seconds": 3 }',
    "  ]",
    "}",
    "",
    "Do not use em dashes. Do not use exclamation marks. Write in plain, natural sentences.",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildUser(product: ProductDetails): string {
  const lines = [
    `Product name: ${product.product_name || "not provided"}`,
    `Description: ${product.description || "not provided"}`,
    `Key benefits: ${product.benefits || "not provided"}`,
    `Price: ${product.price || "not provided"}`,
    `Target audience: ${product.audience || "not provided"}`,
    product.product_url ? `Product URL: ${product.product_url}` : "",
  ].filter(Boolean);
  return `Write the 5 scripts for this product.\n\n${lines.join("\n")}`;
}

export async function generateScripts(
  format: VideoFormat,
  product: ProductDetails,
): Promise<GeneratedScript[]> {
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: BRIEF_MODEL,
    max_tokens: 4000,
    system: buildSystem(format),
    messages: [{ role: "user", content: buildUser(product) }],
  });

  const text = extractText(
    response.content as Array<{ type: string; text?: string }>,
  );
  const candidate = extractJsonArray(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    throw new Error("Script response was not valid JSON");
  }
  if (!Array.isArray(parsed)) {
    throw new Error("Script response was not an array");
  }

  const angleLabel = (key: string): string =>
    ANGLES.find((a) => a.key === key)?.label ?? "Custom";

  return (parsed as Record<string, unknown>[]).map((raw, i) => {
    const angle = (
      VALID_ANGLES.has(String(raw.angle)) ? raw.angle : ANGLES[i % 5].key
    ) as ScriptAngle;
    const scenes = Array.isArray(raw.scenes)
      ? (raw.scenes as Record<string, unknown>[]).map((s, si) => ({
          scene_number: typeof s.scene_number === "number" ? s.scene_number : si + 1,
          timecode: String(s.timecode ?? ""),
          label: String(s.label ?? ""),
          description: String(s.description ?? ""),
          duration_seconds:
            typeof s.duration_seconds === "number" ? s.duration_seconds : undefined,
        }))
      : [];
    return {
      hook: String(raw.hook ?? ""),
      angle,
      angle_label: angleLabel(angle),
      full_script: String(raw.full_script ?? ""),
      scenes,
    };
  });
}
