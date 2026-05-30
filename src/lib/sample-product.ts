// Sample data used to preview concept prompt templates from the admin panel.
// These values intentionally cover every template variable supported by
// fillTemplate() in src/lib/prompt.ts.

import type { Project } from "./types";
import { DEFAULT_STYLE_SETTINGS } from "./types";

export const SAMPLE_PROJECT: Project = {
  id: "00000000-0000-0000-0000-000000000000",
  user_id: "00000000-0000-0000-0000-000000000000",
  name: "Dragon Fire launch",
  client_name: "Acme Sauces",
  product_url: "https://example.com/dragon-fire",
  product_data: {
    name: "Dragon Fire Hot Sauce",
    price: "$12.99",
    description:
      "A craft hot sauce built around fermented Carolina Reaper peppers, smoked garlic, and aged apple cider vinegar. A slow building heat with a clean finish.",
    features: [
      "fermented for 90 days",
      "eight ingredients or fewer",
      "vegan and gluten free",
      "non GMO",
    ],
    ingredients: [
      "Carolina Reaper",
      "smoked garlic",
      "sea salt",
      "apple cider vinegar",
    ],
    images: ["https://example.com/images/dragon-fire-hero.png"],
    url: "https://example.com/dragon-fire",
  },
  logo_url: "https://example.com/images/acme-sauces-logo.png",
  brand_name: "Acme Sauces",
  product_name: "Dragon Fire Hot Sauce",
  product_description:
    "A craft hot sauce built around fermented Carolina Reaper peppers, smoked garlic, and aged apple cider vinegar.",
  key_selling_points:
    "Slow build heat with a clean finish. Fermented 90 days for depth, not just heat. Eight ingredients or fewer.",
  target_audience: "Hot sauce hobbyists who buy small batch craft brands.",
  price_point: "$12.99",
  proof_points:
    "Featured in Bon Appetit best new hot sauces 2025. 4.8 stars across 1,200 reviews.",
  style_settings: DEFAULT_STYLE_SETTINGS,
  brand_colors: [
    { label: "primary", hex: "#C0322B" },
    { label: "secondary", hex: "#2A1A12" },
    { label: "accent", hex: "#F2D49B" },
  ],
  brand_fonts: [
    { role: "heading", family: "Fraunces" },
    { role: "body", family: "Inter" },
  ],
  brand_voice:
    "Direct, a little defiant, dry humor, never corporate. Reads like a recommendation from a friend who is into hot sauce.",
  created_at: new Date(0).toISOString(),
};
