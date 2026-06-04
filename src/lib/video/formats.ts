import type { VideoFormat, ScriptAngle } from "./types";

// The six AI video ad formats, sourced from the AI Ad System 2.0 guide.
// `icon` maps to the stroke icon set in components/tf/ui.tsx.

export interface FormatSpec {
  key: VideoFormat;
  name: string;
  tagline: string;
  description: string;
  tools: string[];
  cost: string;
  bestFor: string[];
  icon: string;
  // Which of the five workflows apply to this format (workflow ids).
  workflowIds: string[];
}

export const FORMATS: FormatSpec[] = [
  {
    key: "ugc",
    name: "AI UGC Ads",
    tagline: "Realistic AI avatars speaking your script",
    description:
      "Realistic AI avatars speak your script on camera so the ad looks like a real person filmed it on their phone. The highest-trust format for creator-style ads.",
    tools: ["Arcads", "HeyGen", "Shhots AI"],
    cost: "5 to 15 dollars per video",
    bestFor: ["Beauty", "Skincare", "Supplements", "Fitness", "Fashion"],
    icon: "user",
    workflowIds: ["full-ugc"],
  },
  {
    key: "claymation",
    name: "Claymation Ads",
    tagline: "Stop-motion clay characters and miniature sets",
    description:
      "Stop-motion style with clay characters, miniature sets, and fingerprint textures. Scroll-stopping and memorable for playful brands.",
    tools: ["Seedance 2.0", "Kling 3.0 via Higgsfield MCP"],
    cost: "2 to 20 dollars per asset",
    bestFor: ["Toys", "Kids products", "Food", "Quirky consumer goods"],
    icon: "layers",
    workflowIds: ["claymation"],
  },
  {
    key: "cartoon",
    name: "Cartoon / Illustration Ads",
    tagline: "Pixar-style, hand-drawn, graphic novel looks",
    description:
      "Pixar-style, hand-drawn, and graphic novel aesthetics. Warm and on-brand for lifestyle and wellness stories.",
    tools: ["Seedance 2.0 via Higgsfield MCP"],
    cost: "2 to 15 dollars per asset",
    bestFor: ["Wellness", "Lifestyle", "Beauty", "Kids products"],
    icon: "sparkle",
    workflowIds: ["cartoon"],
  },
  {
    key: "lofi",
    name: "Ugly Lo-Fi Ads",
    tagline: "Raw, unpolished, shot-on-a-phone energy",
    description:
      "Raw and unpolished so it looks like a quick phone video. Consistently the highest CTR format on the Meta feed because it does not read as an ad.",
    tools: ["Creatify", "Higgsfield MCP"],
    cost: "Near zero to 5 dollars",
    bestFor: ["Fashion", "Beauty", "Supplements", "General DTC"],
    icon: "bolt",
    workflowIds: ["lofi"],
  },
  {
    key: "talking_head",
    name: "AI Avatar Talking Head Ads",
    tagline: "Avatars speaking to camera with product demos",
    description:
      "AI avatars speak directly to camera with product demos. Built for Meta Reels, where synthetic faces perform well. TikTok penalizes synthetic faces, so keep these on Meta.",
    tools: ["Arcads first frame", "HeyGen"],
    cost: "5 to 15 dollars per video",
    bestFor: ["Meta Reels", "Demos", "Education-led offers"],
    icon: "target",
    workflowIds: ["full-ugc"],
  },
  {
    key: "cinematic",
    name: "Cinematic Product Demo Ads",
    tagline: "B-roll, lifestyle scenes, product demonstrations",
    description:
      "B-roll style footage, lifestyle scenes, and clean product demonstrations. Premium look for considered purchases.",
    tools: ["Veo 3", "Kling via Higgsfield MCP"],
    cost: "Free to 20 dollars per clip",
    bestFor: ["Home goods", "Tech", "Beauty tools", "Fitness equipment"],
    icon: "image",
    workflowIds: ["cinematic"],
  },
];

export function getFormat(key: VideoFormat): FormatSpec | undefined {
  return FORMATS.find((f) => f.key === key);
}

// The five "angles to test" framework. Each script Claude writes is tagged
// with one angle so the user can spread a test across distinct emotional bets.
export interface AngleSpec {
  key: ScriptAngle;
  label: string;
  description: string;
}

export const ANGLES: AngleSpec[] = [
  {
    key: "problem_agitation",
    label: "Problem Agitation",
    description:
      "Open on the pain, twist the knife, then relieve it with the product.",
  },
  {
    key: "transformation",
    label: "Transformation",
    description: "Before and after. Show the old way, then the new result.",
  },
  {
    key: "product_demo",
    label: "Product Demo",
    description: "Lead with the product in action and the moment it clicks.",
  },
  {
    key: "social_proof",
    label: "Social Proof",
    description: "Frame it as a recommendation everyone is already talking about.",
  },
  {
    key: "lifestyle_aspiration",
    label: "Lifestyle Aspiration",
    description: "Sell the identity and the life the product unlocks.",
  },
];

// The converting script structure, used in the prompt and shown in the UI.
export const SCRIPT_STRUCTURE: { timecode: string; label: string; note: string }[] =
  [
    { timecode: "0-3s", label: "Hook", note: "Grab attention in under 4 seconds" },
    { timecode: "3-10s", label: "Agitation", note: "Press on the pain point" },
    { timecode: "10-20s", label: "Solution", note: "Show the product and the fix" },
    { timecode: "20-25s", label: "Social Proof", note: "Proof it works for others" },
    { timecode: "25-30s", label: "CTA", note: "One clear next step" },
  ];
