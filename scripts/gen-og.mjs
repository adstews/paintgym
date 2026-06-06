// Generates the default social-share image at public/og-default.png (1200x630)
// in the Paintgym brand style. Run once with: node scripts/gen-og.mjs
import sharp from "sharp";
import { writeFileSync } from "node:fs";

const W = 1200;
const H = 630;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <pattern id="dots" width="28" height="28" patternUnits="userSpaceOnUse">
      <circle cx="1.5" cy="1.5" r="1.5" fill="rgba(20,20,20,0.06)"/>
    </pattern>
  </defs>
  <rect width="${W}" height="${H}" fill="#f4f4f0"/>
  <rect width="${W}" height="${H}" fill="url(#dots)"/>
  <rect x="0" y="0" width="${W}" height="14" fill="#141414"/>
  <rect x="0" y="${H - 14}" width="${W}" height="14" fill="#c2f536"/>

  <!-- wordmark -->
  <text x="80" y="120" font-family="Helvetica, Arial, sans-serif" font-weight="800" font-size="34" letter-spacing="1" fill="#141414">PAINT<tspan fill="#a6d916">/</tspan>GYM</text>

  <!-- kicker -->
  <text x="80" y="250" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="22" letter-spacing="3" fill="#5f5f57">35 CONCEPTS · 4:5 ADS · IN MINUTES</text>

  <!-- headline -->
  <text x="76" y="350" font-family="Helvetica, Arial, sans-serif" font-weight="900" font-size="104" letter-spacing="-2" fill="#141414">AI AD CREATIVES</text>
  <rect x="80" y="392" width="560" height="58" fill="#c2f536"/>
  <text x="80" y="440" font-family="Helvetica, Arial, sans-serif" font-weight="900" font-size="104" letter-spacing="-2" fill="#141414">IN MINUTES</text>

  <!-- subline -->
  <text x="80" y="540" font-family="Helvetica, Arial, sans-serif" font-weight="500" font-size="28" fill="#3a3a36">Claude writes the briefs. Gemini and GPT render them. A QA agent checks every one.</text>
</svg>`;

const png = await sharp(Buffer.from(svg)).png().toBuffer();
writeFileSync(new URL("../public/og-default.png", import.meta.url), png);
console.log("Wrote public/og-default.png", png.length, "bytes");
