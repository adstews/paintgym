import { z } from "zod";
import { BRIEF_MODEL, getAnthropicClient } from "./client";
import { buildProductContext, buildStyleSection } from "./brief-context";
import { hookInstruction } from "../hooks";
import { HTML_RENDER_LABEL, RENDER_SCHEMAS } from "../html-render/types";
import type {
  ChatContent,
  HtmlRenderType,
  ImessageContent,
  InstagramStoryContent,
  NotesContent,
  RedditContent,
  RenderContent,
  TiktokContent,
  TweetContent,
} from "../html-render/types";
import type { Project } from "../types";
import type { InlineImage } from "../gemini/reference-images";

const SUPPORTED_MIME = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);

// Per-type direction: what the on-screen text should accomplish for an ad. The
// schema shape is enforced separately (RENDER_SCHEMAS); this guides the writing.
const TYPE_GUIDANCE: Record<HtmlRenderType, string> = {
  imessage: `Write a believable two-person text thread where one friend recommends the product to another who has the matching problem. 4 to 6 messages, alternating naturally, "them" sends first. The recommendation should name the product and one concrete reason it works. contact_name is the friend's first name.`,
  notes: `Write an Apple Notes note as if a real customer jotted down why the product is worth it. A short title, a believable date, and 4 to 7 short lines (most as bullets) that read like honest personal notes, not ad copy.`,
  reddit: `Write a Reddit thread where the product surfaces as the genuine answer. A realistic subreddit, an upvoted question-style post from someone with the problem, and 2 to 3 top comments that recommend the product with specifics. Usernames and vote counts must look real ("1.2k", "847", "u/quietgains").`,
  tweet: `Write one tweet from a believable account praising the product in a specific, non-corporate way. Realistic display name, handle, and engagement counts (replies/retweets/likes, optional views like "84.2K").`,
  tiktok: `Write a TikTok comment section over a video about the product. A short caption, and 3 to 4 comments that hype the product the way real commenters do (specific, casual). Realistic usernames and like counts.`,
  instagram_story: `Write an Instagram Story reacting to the product: 1 to 3 short overlay text lines and one interactive sticker (a poll, a question box, or a rating) that fits the product. Casual, first-person, like a creator sharing a find.`,
  claude: `Write a short Claude conversation: a user asks for help with the problem the product solves, and Claude gives a clean, well-formatted answer that recommends the product and explains why. Use "- " bullet lines and **bold** for the key points. 2 messages (user, assistant), optionally a short follow-up.`,
  chatgpt: `Write a short ChatGPT conversation: a user asks which option to pick for their problem, and the assistant recommends the product with specific reasons. Use "- " bullet lines and **bold** sparingly. 2 messages (user, assistant), optionally a short follow-up.`,
};

function buildSystemPrompt(type: HtmlRenderType, hasImage: boolean): string {
  return `You write the on-screen text for a believable ${HTML_RENDER_LABEL[type]} that will be screenshotted and run as a paid social ad. The screenshot IS the ad, so the words have to feel real, specific, and native to the app, never like marketing copy.

${
    hasImage
      ? `A photo of the ACTUAL product is attached. Reference THIS exact product (its real name and what it actually is). Never invent a different product.`
      : `Rely only on the product details provided. Do not invent specifics that aren't given.`
  }

${TYPE_GUIDANCE[type]}

Rules:
- Use the exact product, brand, and price details provided. Do not invent product names, prices, features, claims, or testimonials.
- NEVER invent or imply a price unless the exact price is given. If no price is provided, never mention price, cost, "$", or discounts.
- OBEY the compliance / hard rules in the product context without exception. If a rule conflicts with the concept, the rule wins.
- Never use em dashes. Never use exclamation marks. No AI cliches (unleash, elevate, revolutionize, game-changer, journey).
- Keep every line short enough to fit a phone screen. Make names, usernames, timestamps, and counts look real.

Output format:
- Respond with a single JSON object and nothing else. No prose, no markdown fence.
- Shape: {"summary": "...", "key_points": ["...","...","..."], "content": { ... }}
- "summary" is one short sentence (max ~15 words) describing the ad at a glance.
- "key_points" is exactly three short phrases (~3 to 6 words each): the hook/angle, the core proof, and the format.
- "content" must exactly match this JSON shape: ${shapeHint(type)}`;
}

// A compact, human-readable shape hint per type so the model returns the right
// fields (the zod schema still validates strictly afterward).
function shapeHint(type: HtmlRenderType): string {
  switch (type) {
    case "imessage":
      return `{"contact_name": string, "messages": [{"from": "them"|"me", "text": string}]}`;
    case "notes":
      return `{"title": string, "date": string, "lines": [{"text": string, "bullet": boolean}]}`;
    case "reddit":
      return `{"subreddit": string, "post_title": string, "post_author": string, "posted": string, "upvotes": string, "post_body": string (optional), "comments": [{"author": string, "posted": string, "upvotes": string, "text": string}]}`;
    case "tweet":
      return `{"name": string, "handle": string, "verified": boolean, "time": string, "text": string, "replies": string, "retweets": string, "likes": string, "views": string (optional)}`;
    case "tiktok":
      return `{"username": string, "caption": string, "likes": string, "comments_count": string, "shares": string, "comments": [{"username": string, "text": string, "likes": string}]}`;
    case "instagram_story":
      return `{"username": string, "time_ago": string, "overlay_lines": [string], "sticker": {"type":"poll","question":string,"option_a":string,"option_b":string} | {"type":"question","prompt":string} | {"type":"rating","prompt":string} (optional)}`;
    case "claude":
    case "chatgpt":
      return `{"messages": [{"role": "user"|"assistant", "text": string}]}`;
  }
}

function buildUserPrompt(
  project: Project,
  type: HtmlRenderType,
  hasImage: boolean,
  hook: string | null | undefined,
): string {
  return `## Product context
${buildProductContext(project)}
${hasImage ? "\nThe attached image is the actual product this ad must feature.\n" : ""}
## Style direction
${buildStyleSection(project.style_settings)}
${hookInstruction(hook, "opening")}
## Your task
Write the on-screen text for a ${HTML_RENDER_LABEL[type]} ad for this product. Return only the JSON object.`;
}

// Turn validated render content into a readable transcript so the brief card has
// something legible to show and edit.
export function serializeRenderContent(
  type: HtmlRenderType,
  content: RenderContent,
): string {
  switch (type) {
    case "imessage": {
      const c = content as ImessageContent;
      return `iMessage with ${c.contact_name}\n\n${c.messages
        .map((m) => `${m.from === "me" ? "You" : c.contact_name}: ${m.text}`)
        .join("\n")}`;
    }
    case "notes": {
      const c = content as NotesContent;
      return `${c.title}\n${c.date}\n\n${c.lines
        .map((l) => `${l.bullet ? "• " : ""}${l.text}`)
        .join("\n")}`;
    }
    case "reddit": {
      const c = content as RedditContent;
      return `r/${c.subreddit} — ${c.post_title} (${c.upvotes} upvotes)\n${
        c.post_body ?? ""
      }\n\n${c.comments
        .map((cm) => `u/${cm.author} (${cm.upvotes}): ${cm.text}`)
        .join("\n\n")}`;
    }
    case "tweet": {
      const c = content as TweetContent;
      return `${c.name} (@${c.handle})\n${c.text}\n\n${c.replies} replies · ${c.retweets} reposts · ${c.likes} likes`;
    }
    case "tiktok": {
      const c = content as TiktokContent;
      return `@${c.username}: ${c.caption}\n\nComments (${c.comments_count}):\n${c.comments
        .map((cm) => `${cm.username} (${cm.likes}): ${cm.text}`)
        .join("\n")}`;
    }
    case "instagram_story": {
      const c = content as InstagramStoryContent;
      const sticker = c.sticker
        ? `\nSticker (${c.sticker.type}): ${
            "question" in c.sticker ? c.sticker.question : c.sticker.prompt
          }`
        : "";
      return `@${c.username} story\n${c.overlay_lines.join("\n")}${sticker}`;
    }
    case "claude":
    case "chatgpt": {
      const c = content as ChatContent;
      return c.messages
        .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.text}`)
        .join("\n\n");
    }
  }
}

function extractJsonObject(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

export interface HtmlConceptResult {
  brief_text: string;
  summary: string;
  key_points: string[];
  render_content: RenderContent;
}

export interface GenerateHtmlConceptOptions {
  project: Project;
  type: HtmlRenderType;
  productImage?: InlineImage | null;
  hook?: string | null;
}

export async function generateHtmlConceptContent({
  project,
  type,
  productImage = null,
  hook = null,
}: GenerateHtmlConceptOptions): Promise<HtmlConceptResult> {
  const client = getAnthropicClient();
  const useImage = !!productImage && SUPPORTED_MIME.has(productImage.mimeType);

  const responseSchema = z.object({
    summary: z.string().min(3),
    key_points: z.array(z.string().min(1)).min(1),
    content: RENDER_SCHEMAS[type],
  });

  const userText = buildUserPrompt(project, type, useImage, hook);
  const content = useImage
    ? [
        {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: productImage!.mimeType as
              | "image/jpeg"
              | "image/png"
              | "image/gif"
              | "image/webp",
            data: productImage!.data,
          },
        },
        { type: "text" as const, text: userText },
      ]
    : userText;

  const response = await client.messages.create({
    model: BRIEF_MODEL,
    max_tokens: 2000,
    system: buildSystemPrompt(type, useImage),
    messages: [{ role: "user", content }],
  });

  const text = response.content
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("");
  let parsed: unknown;
  try {
    parsed = JSON.parse(extractJsonObject(text));
  } catch {
    throw new Error("HTML concept response was not valid JSON");
  }
  const validated = responseSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error("HTML concept response did not match the expected schema");
  }

  const renderContent = validated.data.content as RenderContent;
  return {
    brief_text: serializeRenderContent(type, renderContent),
    summary: validated.data.summary,
    key_points: validated.data.key_points.slice(0, 3),
    render_content: renderContent,
  };
}
