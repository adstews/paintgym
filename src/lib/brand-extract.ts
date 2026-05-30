// Extract a rough brand kit from a fetched HTML document.
// Designed to run alongside scrapeProduct() — same input bytes, two outputs.

export interface BrandColor {
  label: string;
  hex: string;
}

export interface BrandFont {
  role: string;
  family: string;
}

export interface ScrapedBrand {
  colors: BrandColor[];
  fonts: BrandFont[];
  text_sample: string;
}

const HEX_RE = /#(?:[0-9a-f]{3}|[0-9a-f]{6})\b/gi;
const COMMON_NEUTRALS = new Set([
  "#000000",
  "#fff",
  "#ffffff",
  "#000",
  "#cccccc",
  "#ccc",
  "#dddddd",
  "#ddd",
  "#eeeeee",
  "#eee",
  "#f5f5f5",
]);

function normalizeHex(raw: string): string | null {
  let hex = raw.toLowerCase();
  if (hex.startsWith("#")) hex = hex.slice(1);
  if (hex.length === 3) {
    hex = hex
      .split("")
      .map((c) => c + c)
      .join("");
  }
  if (hex.length !== 6) return null;
  return `#${hex}`;
}

function pickMetaTheme(html: string): string | null {
  const m = html.match(
    /<meta[^>]+name=["']theme-color["'][^>]+content=["']([^"']+)["']/i,
  );
  if (!m) return null;
  return normalizeHex(m[1]);
}

function extractFromInlineStyles(html: string): string[] {
  const colors = new Map<string, number>();
  for (const match of html.matchAll(HEX_RE)) {
    const hex = normalizeHex(match[0]);
    if (!hex) continue;
    if (COMMON_NEUTRALS.has(hex)) continue;
    colors.set(hex, (colors.get(hex) ?? 0) + 1);
  }
  return Array.from(colors.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([hex]) => hex);
}

const ROLE_BY_INDEX = ["primary", "secondary", "accent"];

export function extractBrandColors(html: string): BrandColor[] {
  const out: BrandColor[] = [];
  const seen = new Set<string>();

  const theme = pickMetaTheme(html);
  if (theme && !seen.has(theme)) {
    out.push({ label: "primary", hex: theme });
    seen.add(theme);
  }

  for (const hex of extractFromInlineStyles(html)) {
    if (seen.has(hex)) continue;
    const role = ROLE_BY_INDEX[out.length] ?? `color-${out.length + 1}`;
    out.push({ label: role, hex });
    seen.add(hex);
    if (out.length >= 5) break;
  }
  return out.slice(0, 5);
}

const GENERIC_FONTS = new Set([
  "inherit",
  "initial",
  "unset",
  "serif",
  "sans-serif",
  "monospace",
  "system-ui",
  "ui-sans-serif",
  "ui-serif",
  "ui-monospace",
  "cursive",
  "fantasy",
  "-apple-system",
  "blinkmacsystemfont",
  "segoe ui",
  "helvetica",
  "arial",
  "roboto",
]);

function cleanFontToken(raw: string): string | null {
  let s = raw.trim();
  s = s.replace(/^['"]/, "").replace(/['"]$/, "");
  if (!s) return null;
  const lower = s.toLowerCase();
  if (GENERIC_FONTS.has(lower)) return null;
  if (lower.startsWith("var(") || lower.startsWith("--")) return null;
  return s;
}

export function extractBrandFonts(html: string): BrandFont[] {
  const seen = new Set<string>();
  const out: BrandFont[] = [];

  // 1. Google Fonts <link> hrefs: ?family=Inter:wght@400;600&display=swap
  for (const m of html.matchAll(/family=([^"'&>]+)/gi)) {
    const families = m[1].split("|");
    for (const family of families) {
      const name = decodeURIComponent(family.split(":")[0])
        .replace(/\+/g, " ")
        .trim();
      const cleaned = cleanFontToken(name);
      if (!cleaned) continue;
      if (seen.has(cleaned.toLowerCase())) continue;
      seen.add(cleaned.toLowerCase());
      out.push({
        role: out.length === 0 ? "heading" : out.length === 1 ? "body" : "accent",
        family: cleaned,
      });
      if (out.length >= 3) return out;
    }
  }

  // 2. font-family declarations inside any embedded CSS
  for (const m of html.matchAll(/font-family\s*:\s*([^;}"]+)/gi)) {
    const declaration = m[1];
    const first = declaration.split(",")[0];
    const cleaned = cleanFontToken(first);
    if (!cleaned) continue;
    if (seen.has(cleaned.toLowerCase())) continue;
    seen.add(cleaned.toLowerCase());
    out.push({
      role: out.length === 0 ? "heading" : out.length === 1 ? "body" : "accent",
      family: cleaned,
    });
    if (out.length >= 3) break;
  }
  return out;
}

// Pull a representative sample of human-readable text from the page so that
// Claude can describe the brand voice. We strip tags, scripts, and styles, then
// take the first ~1500 chars of meaningful copy.
export function extractTextSample(html: string): string {
  const withoutScripts = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");
  const text = withoutScripts
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, 2400);
}

export function extractBrand(html: string): ScrapedBrand {
  return {
    colors: extractBrandColors(html),
    fonts: extractBrandFonts(html),
    text_sample: extractTextSample(html),
  };
}
