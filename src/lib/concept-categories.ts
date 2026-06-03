// Gallery category grouping (item 17). Maps each concept to a Netflix-style
// horizontal row. Concept names are matched case/punctuation-insensitively so
// small DB naming drift (e.g. "Stat-Based" vs "Stat Based") still lands in the
// right row. Anything unmatched falls into "Other".

export interface GalleryCategory {
  key: string;
  title: string;
  conceptNames: string[];
}

export const GALLERY_CATEGORIES: GalleryCategory[] = [
  {
    key: "hero",
    title: "Hero shots",
    conceptNames: ["One Core Idea", "Bold Claim", "Stat-Based", "Price Drop"],
  },
  {
    key: "comparisons",
    title: "Comparisons",
    conceptNames: [
      "Us vs Them",
      "Us vs Us",
      "Before & After",
      "Old vs New",
      "Do This Not That",
      "Comparison Chart",
      "Feature Table",
      "In/Out",
      "Myth vs Fact",
    ],
  },
  {
    key: "social",
    title: "Social proof",
    conceptNames: [
      "Social Proof",
      "Reddit Thread",
      "Tweet",
      "TikTok Comment",
      "iMessage",
      "Instagram Story",
      "Claude Chat",
      "ChatGPT Chat",
    ],
  },
  {
    key: "creative",
    title: "Creative",
    conceptNames: [
      "Comedic Satire",
      "Meme Based",
      "Notes App",
      "Sticky Notes",
      "Low-Fi",
      "POV Meme",
    ],
  },
  {
    key: "editorial",
    title: "Editorial",
    conceptNames: [
      "Press Screenshot",
      "Copy-Led",
      "Why We Built This",
      "Flowchart",
      "Transformation Timeline",
      "Would You Rather",
      "Platform Native",
    ],
  },
];

export const OTHER_CATEGORY = { key: "other", title: "Other" };

function normalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Built once: normalized concept name -> category key.
const NAME_TO_CATEGORY = new Map<string, string>();
for (const cat of GALLERY_CATEGORIES) {
  for (const n of cat.conceptNames) NAME_TO_CATEGORY.set(normalize(n), cat.key);
}

export function categoryForConcept(conceptName: string): string {
  return NAME_TO_CATEGORY.get(normalize(conceptName)) ?? OTHER_CATEGORY.key;
}

// Display order including the trailing "Other" bucket.
export const CATEGORY_ORDER: { key: string; title: string }[] = [
  ...GALLERY_CATEGORIES.map((c) => ({ key: c.key, title: c.title })),
  OTHER_CATEGORY,
];
