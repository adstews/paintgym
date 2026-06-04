import { getAnthropicClient, BRIEF_MODEL } from "@/lib/anthropic/client";
import { getFormat } from "@/lib/video/formats";
import type {
  GeneratedScenePrompt,
  ProductDetails,
  SceneBeat,
  VideoFormat,
  VideoModel,
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

// Which generation model each format leans on for its scenes. Drives the
// guidance Claude gets and the default model tag on each returned prompt.
const FORMAT_MODEL: Record<VideoFormat, VideoModel> = {
  ugc: "veo",
  talking_head: "arcads",
  claymation: "seedance",
  cartoon: "seedance",
  lofi: "higgsfield",
  cinematic: "veo",
};

const MODEL_GUIDANCE: Record<VideoModel, string> = {
  veo: "Write cinematic Veo 3 prompts: describe the shot, the subject, the camera move, the lighting, and the mood in one rich paragraph.",
  kling: "Write Kling prompts: describe the shot, subject motion, camera move, and lighting in one rich paragraph.",
  seedance:
    "Write Seedance prompts that lock the chosen art style (claymation or illustration) plus the action and camera move.",
  arcads:
    "Write Arcads avatar-scene prompts: describe the avatar, framing, what they hold, and the product-demo action for the first frame.",
  higgsfield:
    "Write lo-fi Higgsfield prompts: handheld phone footage, shaky cam, natural room light, imperfect focus, casual raw UGC energy.",
  creatify: "Write a concise Creatify scene direction for a fast variation test.",
  heygen: "Write a HeyGen avatar-scene prompt describing the avatar, framing, and demo action.",
};

function buildSystem(format: VideoFormat, model: VideoModel): string {
  const spec = getFormat(format);
  return [
    "You are a senior AI video prompt engineer for paid social ads.",
    spec ? `The ad format is "${spec.name}": ${spec.tagline}.` : "",
    MODEL_GUIDANCE[model],
    "For each scene you receive, write ONE production-ready video generation prompt that will render that beat.",
    "Keep the product accurate to the details given. Keep each prompt self-contained.",
    "",
    "Return ONLY a JSON array, no prose around it. One object per scene, in order:",
    '{ "scene_number": 1, "model": "' + model + '", "prompt": "the full generation prompt" }',
    "",
    "Do not use em dashes. Do not use exclamation marks.",
  ]
    .filter(Boolean)
    .join("\n");
}

function buildUser(scenes: SceneBeat[], product: ProductDetails): string {
  const productLines = [
    `Product: ${product.product_name || "not provided"}`,
    `Description: ${product.description || "not provided"}`,
    `Audience: ${product.audience || "not provided"}`,
  ].join("\n");
  const sceneLines = scenes
    .map(
      (s) =>
        `Scene ${s.scene_number} (${s.timecode}, ${s.label}): ${s.description}`,
    )
    .join("\n");
  return `${productLines}\n\nScenes to prompt:\n${sceneLines}`;
}

export async function generateScenePrompts(
  format: VideoFormat,
  scenes: SceneBeat[],
  product: ProductDetails,
): Promise<GeneratedScenePrompt[]> {
  const model = FORMAT_MODEL[format];
  const client = getAnthropicClient();
  const response = await client.messages.create({
    model: BRIEF_MODEL,
    max_tokens: 3000,
    system: buildSystem(format, model),
    messages: [{ role: "user", content: buildUser(scenes, product) }],
  });

  const text = extractText(
    response.content as Array<{ type: string; text?: string }>,
  );
  const candidate = extractJsonArray(text);
  let parsed: unknown;
  try {
    parsed = JSON.parse(candidate);
  } catch {
    throw new Error("Scene prompt response was not valid JSON");
  }
  if (!Array.isArray(parsed)) {
    throw new Error("Scene prompt response was not an array");
  }

  return (parsed as Record<string, unknown>[]).map((raw, i) => ({
    scene_number:
      typeof raw.scene_number === "number"
        ? raw.scene_number
        : scenes[i]?.scene_number ?? i + 1,
    model,
    prompt: String(raw.prompt ?? ""),
  }));
}
