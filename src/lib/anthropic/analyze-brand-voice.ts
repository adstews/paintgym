import { BRIEF_MODEL, getAnthropicClient } from "./client";

const SYSTEM = `You read a sample of a brand's marketing copy and describe how the brand sounds. Output one short paragraph (two to four sentences). Cover: tone (warm, edgy, clinical, playful, etc.), reading level, formality, and any signature mannerisms in their writing (how they open, how they end, what kinds of metaphors they use, whether they speak directly to the reader). Be concrete. Do not include a heading, do not address the human reader, do not use em dashes, do not use exclamation marks. Output the paragraph only.`;

function extractText(blocks: Array<{ type: string; text?: string }>): string {
  const parts: string[] = [];
  for (const b of blocks) {
    if (b.type === "text" && typeof b.text === "string") parts.push(b.text);
  }
  return parts.join("").trim();
}

export async function analyzeBrandVoice(textSample: string): Promise<string | null> {
  const cleaned = textSample.trim();
  if (cleaned.length < 80) return null;
  const client = getAnthropicClient();

  const response = await client.messages.create({
    model: BRIEF_MODEL,
    max_tokens: 400,
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Brand copy sample:\n\n${cleaned.slice(0, 2400)}\n\nDescribe the brand voice in one paragraph.`,
      },
    ],
  });

  const text = extractText(response.content);
  if (!text) return null;
  return text;
}
