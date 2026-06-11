// The 49 static ad frameworks Paintgym ships with, mirroring the default
// concepts seeded in the database. Used by the public concept guide (the
// /blog concept post), the concept-picker tool, and the "49 frameworks"
// marketing copy. The final 14 round out the original 35 (added via migration
// 0024); three of them — Discussion Thread, In-App Proof, Social Proof Mashup —
// render as zero-cost HTML screenshots like the other screenshot formats.

export type ConceptGoal = "awareness" | "conversion" | "retargeting";

export interface AdConcept {
  slug: string;
  name: string;
  category: string;
  description: string;
  whyItWorks: string;
  bestFor: string;
  // Tags the concept-picker uses to score recommendations.
  goals: ConceptGoal[];
  traits: string[]; // e.g. "proof", "humor", "premium", "value", "ugc"
  // Rendered server-side as a pixel-perfect screenshot with no image-gen cost.
  screenshot?: boolean;
}

export const CONCEPTS: AdConcept[] = [
  {
    slug: "one-core-idea",
    name: "One Core Idea",
    category: "Hero",
    description:
      "A single hero claim that distills the product into one striking visual idea.",
    whyItWorks:
      "Feeds are won in a glance. Stripping the ad to one idea removes everything the eye has to skip, so the message lands before the thumb moves.",
    bestFor: "New brands, simple products, cold prospecting at scale.",
    goals: ["awareness", "conversion"],
    traits: ["clean", "premium"],
  },
  {
    slug: "three-main-benefits",
    name: "Three Main Benefits",
    category: "Hero",
    description: "A three-up benefit layout showing the top reasons to buy.",
    whyItWorks:
      "Three is the number the eye reads as complete without feeling like a list. It frames the product as well-rounded in one scan.",
    bestFor: "Supplements, gadgets, anything with clear functional benefits.",
    goals: ["conversion"],
    traits: ["clean", "value"],
  },
  {
    slug: "bold-claim",
    name: "Bold Claim",
    category: "Typographic",
    description: "An oversized typographic claim that dominates the canvas.",
    whyItWorks:
      "Big type reads as confidence. When the claim is specific and true, the size makes it feel like a stake in the ground rather than a slogan.",
    bestFor: "Category challengers, products with a sharp point of difference.",
    goals: ["awareness"],
    traits: ["bold", "premium"],
  },
  {
    slug: "us-vs-them",
    name: "Us vs Them",
    category: "Comparison",
    description:
      "A side-by-side comparison that highlights your category advantages.",
    whyItWorks:
      "People decide by contrast. Showing the old way next to yours makes the choice feel obvious instead of asking the viewer to take it on faith.",
    bestFor: "Disruptor brands replacing an incumbent or a legacy habit.",
    goals: ["conversion"],
    traits: ["proof", "value"],
  },
  {
    slug: "comparison-chart",
    name: "Comparison Chart",
    category: "Comparison",
    description:
      "A feature comparison chart with check marks against category alternatives.",
    whyItWorks:
      "A grid of checks and crosses reads as objective even when you built it. It does the buyer's research for them and lands on your name.",
    bestFor: "Considered purchases, software, products with many alternatives.",
    goals: ["conversion", "retargeting"],
    traits: ["proof", "value"],
  },
  {
    slug: "before-and-after",
    name: "Before & After",
    category: "Transformation",
    description:
      "A visible transformation story showing the result the product delivers.",
    whyItWorks:
      "The before/after split is the most proven visual proof there is. It shows the outcome instead of describing it, which beats any adjective.",
    bestFor: "Skincare, fitness, cleaning, home, anything with a visible result.",
    goals: ["conversion"],
    traits: ["proof", "transformation"],
  },
  {
    slug: "old-vs-new",
    name: "Old vs New",
    category: "Comparison",
    description:
      "A category reframe positioning the product as the modern replacement.",
    whyItWorks:
      "Framing the status quo as outdated makes sticking with it feel like a choice, and nobody wants to choose the old thing on purpose.",
    bestFor: "Reinvented staples, tech upgrades, modern takes on a tired category.",
    goals: ["awareness", "conversion"],
    traits: ["bold", "value"],
  },
  {
    slug: "social-proof-reviews",
    name: "Social Proof / 5 Star Reviews",
    category: "Proof",
    description:
      "Layered customer review quotes radiating around the hero product.",
    whyItWorks:
      "Strangers trust other buyers more than they trust the brand. Real quotes borrow that trust and stack it around the product.",
    bestFor: "Established brands with a backlog of strong reviews.",
    goals: ["conversion", "retargeting"],
    traits: ["proof", "ugc"],
  },
  {
    slug: "price-drop",
    name: "Price Drop",
    category: "Promo",
    description: "A promo creative that highlights a discount or price anchor.",
    whyItWorks:
      "An anchored price gives the brain a reference point, so the new number reads as a deal instead of just a cost.",
    bestFor: "Sales, launches, retargeting warm shoppers who hesitated on price.",
    goals: ["conversion", "retargeting"],
    traits: ["value", "promo"],
  },
  {
    slug: "stat-based",
    name: "Stat-Based",
    category: "Proof",
    description: "A single hero statistic that anchors the entire visual.",
    whyItWorks:
      "A precise number reads as evidence. Built around one stat, the ad feels like a fact rather than a pitch.",
    bestFor: "Brands with a strong result, study, or sales figure to point to.",
    goals: ["awareness", "conversion"],
    traits: ["proof", "clean"],
  },
  {
    slug: "press-screenshot",
    name: "Press Screenshot",
    category: "Authority",
    description:
      "A mock editorial press feature that lends third-party credibility.",
    whyItWorks:
      "An editorial frame carries authority the brand cannot claim about itself. It reads as someone else vouching, not the brand bragging.",
    bestFor: "Premium products, anything that has earned real press coverage.",
    goals: ["awareness", "conversion"],
    traits: ["proof", "premium"],
  },
  {
    slug: "platform-native",
    name: "Platform Native",
    category: "Native",
    description: "An ad that mimics native social UI to feel like organic content.",
    whyItWorks:
      "It slips past the ad-blindness reflex. By the time the viewer clocks it as an ad, the message has already landed.",
    bestFor: "DTC brands chasing low-cost, high-volume cold creative.",
    goals: ["awareness"],
    traits: ["ugc", "native"],
  },
  {
    slug: "comedic-satire",
    name: "Comedic / Satire",
    category: "Native",
    description: "Light humor or satire that punches up a category truth.",
    whyItWorks:
      "Humor earns a share and lowers the guard, so a real selling point gets in while the viewer is enjoying the joke.",
    bestFor: "Bold brands with a clear voice and a relatable category gripe.",
    goals: ["awareness"],
    traits: ["humor", "native"],
  },
  {
    slug: "notes-app",
    name: "Notes App",
    category: "Screenshot",
    description:
      "An iPhone Notes screenshot styled as a candid personal list about the product.",
    whyItWorks:
      "It reads like a private note a friend forgot to hide, which feels honest in a way a designed ad never can.",
    bestFor: "Founder-led brands, recommendations, list-style selling points.",
    goals: ["awareness", "conversion"],
    traits: ["ugc", "native"],
    screenshot: true,
  },
  {
    slug: "sticky-notes",
    name: "Sticky Notes",
    category: "Low-fi",
    description: "A hand-written sticky-note collage around the hero product.",
    whyItWorks:
      "Handwriting signals a human, not a marketing team. The lo-fi look makes the claims feel jotted down rather than focus-grouped.",
    bestFor: "Approachable brands, reminders, simple benefit call-outs.",
    goals: ["awareness"],
    traits: ["ugc", "low-fi"],
  },
  {
    slug: "meme-based",
    name: "Meme Based",
    category: "Native",
    description: "A static meme-format ad built on a recognizable meme structure.",
    whyItWorks:
      "A familiar meme template borrows attention the viewer already gives the format, then swaps in the product as the punchline.",
    bestFor: "Younger audiences, brands fluent in internet culture.",
    goals: ["awareness"],
    traits: ["humor", "native"],
  },
  {
    slug: "low-fi",
    name: "Low-Fi",
    category: "Low-fi",
    description: "A phone-camera lo-fi aesthetic that reads as authentic UGC.",
    whyItWorks:
      "Polished ads scream ad. A slightly rough photo reads as real, which is exactly why the cheapest-looking creative often wins.",
    bestFor: "Cold prospecting, UGC-style testing, founder content.",
    goals: ["awareness", "conversion"],
    traits: ["ugc", "low-fi"],
  },
  {
    slug: "imessage",
    name: "iMessage",
    category: "Screenshot",
    description:
      "A realistic iMessage thread where a friend recommends the product.",
    whyItWorks:
      "We trust a text from a friend more than any headline. The chat frame turns a claim into a recommendation.",
    bestFor: "Word-of-mouth products, gifting, anything friends actually text about.",
    goals: ["awareness", "conversion"],
    traits: ["ugc", "proof", "native"],
    screenshot: true,
  },
  {
    slug: "reddit-thread",
    name: "Reddit Thread",
    category: "Screenshot",
    description:
      "A Reddit post and replies where the product comes up as the answer.",
    whyItWorks:
      "Reddit reads as the place people are honest. Surfacing the product inside a thread feels earned, not paid.",
    bestFor: "Research-heavy categories where buyers ask 'what actually works'.",
    goals: ["conversion", "retargeting"],
    traits: ["ugc", "proof", "native"],
    screenshot: true,
  },
  {
    slug: "tweet",
    name: "Tweet",
    category: "Screenshot",
    description: "A Twitter/X post praising the product, with engagement metrics.",
    whyItWorks:
      "A liked, reposted tweet carries built-in social proof. The metrics do the convincing the copy cannot.",
    bestFor: "Brands with a voice, viral moments, quotable selling points.",
    goals: ["awareness"],
    traits: ["ugc", "proof", "native"],
    screenshot: true,
  },
  {
    slug: "tiktok-comment",
    name: "TikTok Comment",
    category: "Screenshot",
    description:
      "A TikTok comment-section overlay where commenters rave about the product.",
    whyItWorks:
      "The comments are where TikTok buys happen. A stacked comment section reads as a crowd agreeing in real time.",
    bestFor: "Trend-driven products, impulse buys, younger audiences.",
    goals: ["awareness", "conversion"],
    traits: ["ugc", "proof", "native"],
    screenshot: true,
  },
  {
    slug: "instagram-story",
    name: "Instagram Story",
    category: "Screenshot",
    description: "An Instagram Story screenshot with text overlays and a sticker.",
    whyItWorks:
      "Stories are where people share what they actually use. The format makes the product feel like a casual share, not a campaign.",
    bestFor: "Lifestyle and beauty brands, influencer-style placements.",
    goals: ["awareness"],
    traits: ["ugc", "native"],
    screenshot: true,
  },
  {
    slug: "claude-chat",
    name: "Claude Chat",
    category: "Screenshot",
    description:
      "A Claude AI chat where the assistant explains why the product is a smart pick.",
    whyItWorks:
      "People now ask AI what to buy. An assistant naming your product reads as a neutral, researched verdict.",
    bestFor: "Considered purchases, comparison-shopped categories.",
    goals: ["conversion", "retargeting"],
    traits: ["proof", "native"],
    screenshot: true,
  },
  {
    slug: "chatgpt-chat",
    name: "ChatGPT Chat",
    category: "Screenshot",
    description:
      "A ChatGPT conversation where the assistant recommends the product.",
    whyItWorks:
      "Same trust shortcut as a friend's text, but from the tool millions now treat as their researcher.",
    bestFor: "Problem-solution products people would ask an assistant about.",
    goals: ["conversion", "retargeting"],
    traits: ["proof", "native"],
    screenshot: true,
  },
  {
    slug: "ugc-testimonial",
    name: "UGC Testimonial",
    category: "Proof",
    description:
      "A creator-style photo paired with a real customer quote in their words.",
    whyItWorks:
      "A face and a quote together read as a real person, which converts harder than a studio shot with brand copy.",
    bestFor: "Beauty, wellness, apparel, anything bought on trust.",
    goals: ["conversion"],
    traits: ["ugc", "proof"],
  },
  {
    slug: "founders-note",
    name: "Founder's Note",
    category: "Authority",
    description:
      "A direct, personal letter from the founder on why they built the product.",
    whyItWorks:
      "A founder speaking plainly signals there is a real person behind the brand who stands by it, which lowers the risk of buying.",
    bestFor: "Mission-led brands, premium products, repositioning a category.",
    goals: ["awareness", "conversion"],
    traits: ["premium", "story"],
  },
  {
    slug: "problem-agitate-solve",
    name: "Problem / Agitate / Solve",
    category: "Direct response",
    description:
      "Name the pain, twist the knife, then present the product as the relief.",
    whyItWorks:
      "Leading with the problem self-selects the right buyer and makes the solution feel inevitable by the time it appears.",
    bestFor: "Pain-point products, supplements, tools that fix a clear annoyance.",
    goals: ["conversion"],
    traits: ["pain", "value"],
  },
  {
    slug: "value-stack",
    name: "Value Stack",
    category: "Direct response",
    description:
      "A breakdown of everything in the box and what each piece is worth.",
    whyItWorks:
      "Itemizing the value makes the price feel small against the pile, especially for bundles and kits.",
    bestFor: "Bundles, kits, subscriptions, higher-ticket offers.",
    goals: ["conversion", "retargeting"],
    traits: ["value", "promo"],
  },
  {
    slug: "guarantee",
    name: "Money-Back Guarantee",
    category: "Direct response",
    description:
      "A creative built around a bold risk-reversal or money-back promise.",
    whyItWorks:
      "Removing the downside removes the last objection. A confident guarantee also signals the brand trusts its own product.",
    bestFor: "First-time buyers, higher-priced products, skeptical categories.",
    goals: ["conversion", "retargeting"],
    traits: ["proof", "value"],
  },
  {
    slug: "objection-handler",
    name: "Objection Handler",
    category: "Direct response",
    description:
      "A FAQ-style ad that answers the single biggest reason people don't buy.",
    whyItWorks:
      "Naming the doubt out loud disarms it. Buyers feel understood instead of sold to.",
    bestFor: "Retargeting warm traffic that bounced on a specific concern.",
    goals: ["retargeting", "conversion"],
    traits: ["proof", "value"],
  },
  {
    slug: "unboxing",
    name: "Unboxing",
    category: "Product",
    description:
      "A flat-lay or in-hand shot of the full unboxing moment and packaging.",
    whyItWorks:
      "The unboxing is the first delight a buyer pictures. Showing it makes the purchase feel like an experience, not a transaction.",
    bestFor: "Premium packaging, gifting, subscription boxes.",
    goals: ["awareness", "conversion"],
    traits: ["premium", "clean"],
  },
  {
    slug: "ingredient-spotlight",
    name: "Ingredient Spotlight",
    category: "Product",
    description:
      "A close-up that isolates one hero ingredient, material, or spec.",
    whyItWorks:
      "Zooming in on what makes the product work turns a feature into proof and justifies a premium.",
    bestFor: "Skincare, supplements, food, anything with a standout ingredient.",
    goals: ["conversion"],
    traits: ["clean", "premium"],
  },
  {
    slug: "use-case-grid",
    name: "Use-Case Grid",
    category: "Hero",
    description:
      "A grid of the product in several real moments or use cases.",
    whyItWorks:
      "Showing many uses widens the audience and answers 'when would I actually use this' in one frame.",
    bestFor: "Versatile products, gadgets, multi-purpose tools.",
    goals: ["awareness", "conversion"],
    traits: ["value", "clean"],
  },
  {
    slug: "occasion-seasonal",
    name: "Occasion / Seasonal",
    category: "Promo",
    description:
      "A timely creative tied to a holiday, season, or cultural moment.",
    whyItWorks:
      "A deadline the calendar sets for you adds urgency without inventing a fake sale, and the moment makes the ad feel current.",
    bestFor: "Gifting seasons, holidays, launches tied to an event.",
    goals: ["conversion", "retargeting"],
    traits: ["promo", "value"],
  },
  {
    slug: "as-seen-in",
    name: "As Seen In",
    category: "Authority",
    description:
      "A wall of press, retailer, or partner logos under a short claim.",
    whyItWorks:
      "Recognized logos transfer their credibility in a glance, no reading required.",
    bestFor: "Brands with real press or retail distribution to show off.",
    goals: ["awareness", "conversion"],
    traits: ["proof", "premium"],
  },
  {
    slug: "anti-ad",
    name: "Anti-Ad",
    category: "Low-fi",
    description:
      "A deliberately unpolished, no-design creative that reads like an honest founder note.",
    whyItWorks:
      "Rejecting design is the pattern interrupt. A raw, ugly ad reads as a real person talking instead of a campaign, so the guard drops and the message gets a hearing.",
    bestFor: "Founder-led brands, candid angles, audiences tired of polished ads.",
    goals: ["awareness", "conversion"],
    traits: ["low-fi", "ugc", "story"],
  },
  {
    slug: "checkerboard-grid",
    name: "Checkerboard Grid",
    category: "Hero",
    description:
      "A 2x2 grid showing four product uses, angles, or benefits in one frame.",
    whyItWorks:
      "Four panels read together as one complete story, so a single ad covers several reasons to buy without feeling like a list.",
    bestFor: "Versatile products, multi-benefit items, anything with several use cases.",
    goals: ["awareness", "conversion"],
    traits: ["clean", "value"],
  },
  {
    slug: "discussion-thread",
    name: "Discussion Thread",
    category: "Screenshot",
    description:
      "A community discussion thread, Facebook Group or forum style, where the product comes up as the answer.",
    whyItWorks:
      "A recommendation inside a real-looking community thread reads as earned word of mouth, not an ad, so the endorsement carries a stranger's trust.",
    bestFor: "Research-heavy categories and problems people ask their community about.",
    goals: ["conversion", "retargeting"],
    traits: ["ugc", "proof", "native"],
    screenshot: true,
  },
  {
    slug: "starter-pack-grid",
    name: "Starter Pack Grid",
    category: "Native",
    description:
      "The 'starter pack' meme format applied to your ideal customer, with the product among the essentials.",
    whyItWorks:
      "Tying the product to an identity people recognize makes it instantly relatable and shareable, so the ad spreads like a meme while it still sells.",
    bestFor: "Lifestyle brands, persona-driven products, younger social audiences.",
    goals: ["awareness"],
    traits: ["humor", "native"],
  },
  {
    slug: "street-interview",
    name: "Street Interview",
    category: "Native",
    description:
      "A still frame from a person-on-the-street reaction with a bold pull-quote overlay.",
    whyItWorks:
      "A candid, unscripted reaction reads as a real opinion caught on camera, which converts harder than a staged testimonial.",
    bestFor: "Reaction-worthy products, broad consumer goods, social-first brands.",
    goals: ["awareness", "conversion"],
    traits: ["ugc", "proof", "native"],
  },
  {
    slug: "in-app-proof",
    name: "In-App Proof Shot",
    category: "Screenshot",
    description:
      "A screenshot of real-looking in-app data — a dashboard, analytics, or results tracker — proving the product works.",
    whyItWorks:
      "A number on a screen reads as a recorded fact rather than a claim, so a believable dashboard makes the result feel measured instead of marketed.",
    bestFor: "Apps, tools, and products with a measurable result to show.",
    goals: ["conversion", "retargeting"],
    traits: ["proof", "native"],
    screenshot: true,
  },
  {
    slug: "three-stat-scoreboard",
    name: "Three-Stat Scoreboard",
    category: "Proof",
    description:
      "Three bold stats laid out like a scoreboard, stacking multiple proof points into one case.",
    whyItWorks:
      "Three numbers together build a cumulative case no single stat can, and the scoreboard framing reads as confident and final.",
    bestFor: "Brands with several strong results or figures to point to.",
    goals: ["awareness", "conversion"],
    traits: ["proof", "clean"],
  },
  {
    slug: "listicle",
    name: "Listicle",
    category: "Typographic",
    description:
      "A numbered list as the whole ad, with a punchy headline and short reasons to buy.",
    whyItWorks:
      "A numbered list promises a quick, scannable read, so the eye commits to it in the feed and absorbs several selling points at once.",
    bestFor: "Multi-benefit products and audiences that respond to editorial content.",
    goals: ["awareness", "conversion"],
    traits: ["value", "clean"],
  },
  {
    slug: "social-proof-mashup",
    name: "Social Proof Mashup",
    category: "Screenshot",
    description:
      "A collage of mini screenshots — a tweet, a review, a comment, an email — all praising the product.",
    whyItWorks:
      "Praise from many platforms at once reads as a chorus rather than a single cherry-picked quote, which is much harder to dismiss.",
    bestFor: "Brands with proof scattered across reviews, social, and email.",
    goals: ["conversion", "retargeting"],
    traits: ["ugc", "proof", "native"],
    screenshot: true,
  },
  {
    slug: "educational-explainer",
    name: "Educational Explainer",
    category: "Authority",
    description:
      "A clean infographic-style static that teaches something useful with the product woven in.",
    whyItWorks:
      "Leading with genuine value earns attention and trust before the pitch, so the product lands as the helpful answer instead of an interruption.",
    bestFor: "Considered purchases, technical products, and category education.",
    goals: ["awareness", "conversion"],
    traits: ["clean", "value", "premium"],
  },
  {
    slug: "product-in-motion",
    name: "Product-in-Motion Hero",
    category: "Product",
    description:
      "A dynamic hero shot with implied motion — a splash, a pour, or an action freeze-frame.",
    whyItWorks:
      "Implied movement creates visual drama that stops the scroll, giving a plain product shot the energy of a video in a single frame.",
    bestFor: "Food and drink, beauty, and any product that looks good in action.",
    goals: ["awareness"],
    traits: ["premium", "clean"],
  },
  {
    slug: "pov-shot",
    name: "POV Shot",
    category: "Product",
    description:
      "A first-person shot of a hand holding or using the product, as if through the viewer's own eyes.",
    whyItWorks:
      "Seeing the product from your own point of view makes ownership feel immediate and tangible, closing the gap between looking and having.",
    bestFor: "Handheld products, everyday-use items, lifestyle brands.",
    goals: ["awareness", "conversion"],
    traits: ["ugc", "clean"],
  },
  {
    slug: "behind-the-scenes",
    name: "Behind the Scenes",
    category: "Authority",
    description:
      "A look at how the product is made, packed, or sourced.",
    whyItWorks:
      "Showing the craft behind the product builds trust through transparency and justifies a premium by making the work visible.",
    bestFor: "Premium and craft brands, sourcing stories, quality-led positioning.",
    goals: ["awareness", "conversion"],
    traits: ["premium", "story", "proof"],
  },
  {
    slug: "cultural-reference",
    name: "Cultural Reference",
    category: "Native",
    description:
      "Ties the product to a trending cultural moment, show, or meme format, with no copyrighted material.",
    whyItWorks:
      "Borrowing a moment the audience is already thinking about buys instant relevance, and the product becomes the payoff to a hook they recognize.",
    bestFor: "Culturally fluent brands, timely launches, younger audiences.",
    goals: ["awareness"],
    traits: ["humor", "native"],
  },
];

export const CONCEPT_COUNT = CONCEPTS.length;

export function conceptBySlug(slug: string): AdConcept | undefined {
  return CONCEPTS.find((c) => c.slug === slug);
}
