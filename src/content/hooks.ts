// The 20-hook bank that ships in Paintgym (mirrors the rows seeded in migration
// 0018). Used by the public hook-generator tool and the hook guide. The
// [bracketed] tokens are filled with the user's product or category.

export type HookCategory =
  | "curiosity"
  | "fomo"
  | "social_proof"
  | "pain_point"
  | "transformation"
  | "controversy"
  | "authority";

export interface Hook {
  template: string;
  category: HookCategory;
  whyItWorks: string;
}

export const HOOKS: Hook[] = [
  {
    template:
      "I tried every [category] on the market and [product] is the only one that actually works",
    category: "social_proof",
    whyItWorks:
      "Frames the product as the survivor of an exhaustive search, which reads as earned credibility rather than a claim.",
  },
  {
    template: "Stop scrolling if you struggle with [pain point]",
    category: "pain_point",
    whyItWorks:
      "A pattern interrupt that self-selects the exact person who needs the product.",
  },
  {
    template: "Nobody talks about this, but [category] has a problem",
    category: "curiosity",
    whyItWorks:
      "Promises insider knowledge, which opens a loop the viewer wants closed.",
  },
  {
    template: "I was today years old when I found out about [product]",
    category: "curiosity",
    whyItWorks:
      "A familiar meme format that makes a benefit feel like a fresh discovery.",
  },
  {
    template: "POV: you finally found a [category] that actually works",
    category: "transformation",
    whyItWorks:
      "Puts the viewer inside the moment of relief, making the outcome feel personal.",
  },
  {
    template: "The [category] industry doesn't want you to know this",
    category: "controversy",
    whyItWorks:
      "Positions the brand as the honest insider against a faceless industry.",
  },
  {
    template: "I've been using [product] for 30 days and here's what happened",
    category: "social_proof",
    whyItWorks:
      "A testimonial framing that promises a real, time-tested result.",
  },
  {
    template: "Thousands of people bought [product] last month. Here's why.",
    category: "fomo",
    whyItWorks:
      "Hard social proof plus an open loop on the reason, driving both trust and curiosity.",
  },
  {
    template: "If you're still buying cheap [category], I feel bad for you",
    category: "controversy",
    whyItWorks:
      "A mild provocation that makes the old way feel embarrassing and the new way obvious.",
  },
  {
    template: "My friend told me about [product] and I haven't looked back",
    category: "authority",
    whyItWorks:
      "Borrows trust from a credible third party the viewer already respects.",
  },
  {
    template: "Here's why [product] has thousands of five-star reviews",
    category: "social_proof",
    whyItWorks: "Leads with quantified proof, then promises to justify it.",
  },
  {
    template: "You're going to wish you knew about [product] sooner",
    category: "fomo",
    whyItWorks:
      "Implies the viewer is already behind, which sparks urgency to catch up.",
  },
  {
    template: "This is what your money gets you with [product]",
    category: "curiosity",
    whyItWorks:
      "Anchors on value and forces the viewer to keep watching to judge it.",
  },
  {
    template: "Before and after 30 days of using [product]",
    category: "transformation",
    whyItWorks:
      "The before/after frame is the most proven visual proof of a result.",
  },
  {
    template: "Unpopular opinion: most [category] is a waste of money",
    category: "controversy",
    whyItWorks:
      "Signals a contrarian take, which the feed rewards with attention and debate.",
  },
  {
    template: "The difference between cheap [category] and [product] is real",
    category: "pain_point",
    whyItWorks:
      "Makes a concrete comparison that justifies paying more.",
  },
  {
    template: "I almost didn't buy [product], but then I saw the reviews",
    category: "transformation",
    whyItWorks:
      "A relatable hesitation followed by the exact proof that flipped the decision.",
  },
  {
    template: "If [product] doesn't work for you, you get your money back",
    category: "authority",
    whyItWorks:
      "A confident guarantee that signals the brand is sure of its own product.",
  },
  {
    template: "Things I wish I knew before buying a [category]",
    category: "pain_point",
    whyItWorks:
      "Promises to save the viewer from mistakes, positioning the product as the smart choice.",
  },
  {
    template: "This [product] replaced three things in my routine",
    category: "pain_point",
    whyItWorks:
      "Frames the product as a simplifier that removes cost and clutter.",
  },
];

export const HOOK_COUNT = HOOKS.length;

/** Fill a hook template's [tokens] with a product name and category. */
export function fillHook(
  template: string,
  product: string,
  category: string,
): string {
  return template
    .replace(/\[product\]/g, product || "your product")
    .replace(/\[category\]/g, category || "product")
    .replace(/\[pain point\]/g, `your ${category || "everyday"} problem`);
}
