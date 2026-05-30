import sharp from "sharp";

// Server-side watermark. Takes a base64 data URL, returns a base64 data URL
// of a PNG with a repeating, diagonal "PAINTGYM" overlay. The clean image is
// untouched; the caller stores both URLs separately.

function parseDataUrl(
  dataUrl: string,
): { mediaType: string; buffer: Buffer } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mediaType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

function buildOverlaySvg(width: number, height: number): string {
  // Diagonal repeating pattern of "PAINTGYM" tilted -28 degrees with low
  // opacity. Drawn as a single SVG so sharp can composite it in one call.
  const tile = 360;
  const text = "PAINTGYM";
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <pattern id="p" patternUnits="userSpaceOnUse" width="${tile}" height="${tile / 3}" patternTransform="rotate(-28)">
      <text x="0" y="50" font-family="Helvetica, Arial, sans-serif" font-weight="900" font-size="56" letter-spacing="6" fill="#ffffff" fill-opacity="0.32" stroke="#000000" stroke-opacity="0.18" stroke-width="1">${text}</text>
      <text x="180" y="${tile / 3 - 20}" font-family="Helvetica, Arial, sans-serif" font-weight="900" font-size="56" letter-spacing="6" fill="#ffffff" fill-opacity="0.32" stroke="#000000" stroke-opacity="0.18" stroke-width="1">${text}</text>
    </pattern>
  </defs>
  <rect width="100%" height="100%" fill="url(#p)" />
</svg>`;
}

export async function watermarkImageDataUrl(
  cleanDataUrl: string,
): Promise<string> {
  const parsed = parseDataUrl(cleanDataUrl);
  if (!parsed) throw new Error("Image is not a base64 data URL");

  const image = sharp(parsed.buffer);
  const meta = await image.metadata();
  const width = meta.width ?? 1080;
  const height = meta.height ?? 1080;

  const overlay = Buffer.from(buildOverlaySvg(width, height));
  const composited = await image
    .composite([{ input: overlay, top: 0, left: 0 }])
    .png()
    .toBuffer();

  return `data:image/png;base64,${composited.toString("base64")}`;
}
