import { BRIEF_MODEL, getAnthropicClient } from "./client";
import type { ProductData } from "@/lib/types";

// One Claude pass that turns a scraped product page into a filled-in product
// brief for the new-project wizard. Mirrors the field set of ProductDetailsForm
// so the wizard can pre-fill every step. Colors, fonts, and images come from the
// deterministic scraper (brand-extract / scrape) — this only handles the copy.

export interface PrefillFields {
  brand_name: string;
  product_name: string;
  product_description: string;
  key_selling_points: string;
  target_audience: string;
  price_point: string;
  proof_points: string;
  compliance_rules: string;
  brand_voice: string;
}

const EMPTY: PrefillFields = {
  brand_name: "",
  product_name: "",
  product_description: "",
  key_selling_points: "",
  target_audience: "",
  price_point: "",
  proof_points: "",
  compliance_rules: "",
  brand_voice: "",
};

const SYSTEM = `You are a direct-response marketing strategist. You are given the scraped contents of a product or service web page. Fill in a product brief that a copywriter will use to write ads.

Output a single JSON object and nothing else. Use exactly these keys, all string values:
- brand_name: the company or brand behind the product.
- product_name: the specific product or service being sold.
- product_description: two to four sentences on what it is, who it is for, and the problem it solves. Plain and concrete.
- key_selling_points: the strongest benefits, one per line, each line starting with "- ". Three to six lines.
- target_audience: one line describing who this is for.
- price_point: the price exactly as shown on the page, for example "$49", "$9.99/month", or "from $120". If no price is visible, return "".
- proof_points: real proof found on the page only, such as awards, press, customer counts, ratings, or guarantees, one per line starting with "- ". If none are present, return "".
- compliance_rules: return "" unless the product is in an obviously regulated category such as supplements, alcohol, finance, or medical, in which case suggest one or two cautious hard rules. Never invent rules.
- brand_voice: one short paragraph describing how the brand sounds (tone, formality, signature mannerisms), inferred from the page copy.

Rules: base everything on the provided page content, do not invent facts, claims, prices, or proof. If you cannot determine a field, use "". Do not use em dashes. Do not use exclamation marks. Output only the JSON object.`;

function extractText(blocks: Array<{ type: string; text?: string }>): string {
  const parts: string[] = [];
  for (const b of blocks) {
    if (b.type === "text" && typeof b.text === "string") parts.push(b.text);
  }
  return parts.join("").trim();
}

function asString(v: unknown): string {
  if (typeof v === "string") return v.trim();
  if (Array.isArray(v)) {
    return v
      .map((x) => (typeof x === "string" ? `- ${x.trim()}` : ""))
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

// Claude is asked to start its turn with "{" (prefilled assistant message), so
// the returned text is the body after the opening brace. We reassemble, then
// fall back to grabbing the first {...} block if anything drifted.
function parseFields(raw: string): Partial<PrefillFields> | null {
  const candidates = [raw, `{${raw}`];
  const braced = raw.match(/\{[\s\S]*\}/);
  if (braced) candidates.push(braced[0]);
  for (const c of candidates) {
    try {
      const obj = JSON.parse(c) as Record<string, unknown>;
      return {
        brand_name: asString(obj.brand_name),
        product_name: asString(obj.product_name),
        product_description: asString(obj.product_description),
        key_selling_points: asString(obj.key_selling_points),
        target_audience: asString(obj.target_audience),
        price_point: asString(obj.price_point),
        proof_points: asString(obj.proof_points),
        compliance_rules: asString(obj.compliance_rules),
        brand_voice: asString(obj.brand_voice),
      };
    } catch {
      // try the next candidate
    }
  }
  return null;
}

// Whatever Claude couldn't produce, backfill from the raw scrape so the wizard
// is never blank when the page actually had the data.
function withScrapeFallback(
  fields: Partial<PrefillFields>,
  product: ProductData,
): PrefillFields {
  const merged = { ...EMPTY, ...fields };
  if (!merged.product_name && product.name) merged.product_name = product.name;
  if (!merged.product_description && product.description)
    merged.product_description = product.description;
  if (!merged.price_point && product.price) merged.price_point = product.price;
  return merged;
}

function scrapeOnly(product: ProductData): PrefillFields {
  return withScrapeFallback({}, product);
}

export async function prefillProjectFields(input: {
  url: string;
  product: ProductData;
  textSample: string;
}): Promise<{ fields: PrefillFields; degraded: boolean }> {
  try {
    const client = getAnthropicClient();
    const lines = [
      `URL: ${input.url}`,
      input.product.name ? `Page title / product: ${input.product.name}` : "",
      input.product.price ? `Detected price: ${input.product.price}` : "",
      input.product.description
        ? `Meta description: ${input.product.description}`
        : "",
      input.product.features && input.product.features.length > 0
        ? `List items on page:\n${input.product.features
            .map((f) => `- ${f}`)
            .join("\n")}`
        : "",
      input.textSample
        ? `Readable page copy:\n${input.textSample.slice(0, 2400)}`
        : "",
    ].filter(Boolean);

    const response = await client.messages.create({
      model: BRIEF_MODEL,
      max_tokens: 1500,
      system: SYSTEM,
      messages: [
        {
          role: "user",
          content: `Scraped page content:\n\n${lines.join(
            "\n\n",
          )}\n\nReturn the brief JSON now.`,
        },
        { role: "assistant", content: "{" },
      ],
    });

    const text = extractText(response.content);
    const parsed = parseFields(`{${text}`);
    if (!parsed) return { fields: scrapeOnly(input.product), degraded: true };
    return {
      fields: withScrapeFallback(parsed, input.product),
      degraded: false,
    };
  } catch {
    // Claude is down or the key is missing — fall back to the raw scrape so the
    // wizard still works, just without the AI polish.
    return { fields: scrapeOnly(input.product), degraded: true };
  }
}
