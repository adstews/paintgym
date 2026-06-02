// Training Floor data layer — ported from the design handoff (pg-data.jsx).
// 35 frameworks, ad palettes, per-framework creative renderers, sample packs.
//
// NOTE (production wiring): in the live app the "creative" is a real Gemini 3 Pro
// 4:5 image from /api/generate, and the copy pack comes from /api/scrape +
// /api/generate-briefs. For this preview the LAYOUTS render the design's
// placeholder creatives so the look is faithful without a generation round-trip.
// generateProductPack() resolves to a sample/derived pack (no browser model call).

export type Palette = { bg: string; ink: string; pop: string };
export type AdStatus = "pending" | "loading" | "done" | "error";
export type FwCat = "Core" | "Proof" | "Compare" | "Native" | "Offer";

export type Framework = { n: string; c: FwCat; layout: string };

export type Pack = {
  brand: string;
  noun: string;
  price: string;
  name: string;
  url?: string;
  accent?: string;
  hook: string;
  copy: string;
  claim: string;
  cta: string;
  transform: string;
  compareTitle: string;
  compareBullets: string[];
  statNum: string;
  statLine: string;
  reviews: string;
  testimonial: string;
  reviewer: string;
  ugcHandle: string;
  ugcCaption: string;
  memeTop: string;
  notesTitle: string;
  notesLines: string[];
  chatAsk: string;
  chatReply: string;
  chatFollow: string;
  tweetText: string;
  listTitle: string;
  listItems: string[];
  priceWas: string;
  priceSave: string;
  [key: string]: unknown;
};

export type AdItem = {
  id: string;
  fw: string;
  cat: FwCat;
  layout: string;
  pal: Palette;
  rating: number;
  version: number;
  status: AdStatus;
  html: string;
  history?: AdItem[];
};

export type TFProject = {
  id: string;
  name: string;
  url: string;
  price: string;
  brand: string;
  product: Pack;
  set?: string;
  adCount?: number;
  bestRated?: number;
  preview?: AdItem[];
};

export const FRAMEWORKS: Framework[] = [
  { n: "One Core Idea", c: "Core", layout: "core" },
  { n: "Bold Claim", c: "Core", layout: "claim" },
  { n: "Before & After", c: "Proof", layout: "beforeafter" },
  { n: "Comparison Chart", c: "Compare", layout: "comparison" },
  { n: "Problem / Solution", c: "Core", layout: "claim" },
  { n: "Stat Drop", c: "Proof", layout: "stat" },
  { n: "Testimonial", c: "Proof", layout: "testimonial" },
  { n: "UGC Native", c: "Native", layout: "ugc" },
  { n: "Meme", c: "Native", layout: "meme" },
  { n: "Notes-app", c: "Native", layout: "notes" },
  { n: "Chat Screenshot", c: "Native", layout: "chat" },
  { n: "Tweet", c: "Native", layout: "tweet" },
  { n: "Listicle", c: "Core", layout: "listicle" },
  { n: "3 Reasons", c: "Core", layout: "listicle" },
  { n: "Us vs Them", c: "Compare", layout: "comparison" },
  { n: "Price Anchor", c: "Offer", layout: "price" },
  { n: "Bundle Deal", c: "Offer", layout: "price" },
  { n: "Limited Drop", c: "Offer", layout: "claim" },
  { n: "Guarantee", c: "Offer", layout: "claim" },
  { n: "Objection Crusher", c: "Core", layout: "claim" },
  { n: "Hook Question", c: "Core", layout: "core" },
  { n: "Ingredient Spotlight", c: "Core", layout: "core" },
  { n: "Transformation", c: "Proof", layout: "beforeafter" },
  { n: "Review Stack", c: "Proof", layout: "testimonial" },
  { n: "Press Quote", c: "Proof", layout: "testimonial" },
  { n: "Founder Letter", c: "Native", layout: "notes" },
  { n: "Day in the Life", c: "Native", layout: "ugc" },
  { n: "Myth vs Fact", c: "Compare", layout: "comparison" },
  { n: "Stop Doing X", c: "Core", layout: "claim" },
  { n: "POV", c: "Native", layout: "meme" },
  { n: "Unboxing", c: "Native", layout: "ugc" },
  { n: "How-To", c: "Core", layout: "listicle" },
  { n: "Social Proof Wall", c: "Proof", layout: "stat" },
  { n: "Checklist", c: "Core", layout: "listicle" },
  { n: "Hot Take", c: "Native", layout: "tweet" },
];

export const FW_CATS = ["All", "Core", "Proof", "Compare", "Native", "Offer"] as const;

export const PALETTES: Palette[] = [
  { bg: "#0f5c4a", ink: "#eafff5", pop: "#c2f536" },
  { bg: "#e9466b", ink: "#fff0f4", pop: "#ffd84d" },
  { bg: "#13182b", ink: "#eef0ff", pop: "#7be0c8" },
  { bg: "#f3d9c6", ink: "#3a2418", pop: "#d8714a" },
  { bg: "#e6b32b", ink: "#2a1f05", pop: "#141414" },
  { bg: "#111111", ink: "#ffffff", pop: "#c2f536" },
  { bg: "#0e7c86", ink: "#e8ffff", pop: "#ffd84d" },
  { bg: "#c2502f", ink: "#fff3ee", pop: "#ffd84d" },
  { bg: "#dfe7df", ink: "#1b2a1b", pop: "#2f6b3a" },
  { bg: "#2b50e6", ink: "#eef1ff", pop: "#c2f536" },
  { bg: "#fcfbf7", ink: "#1c1c1c", pop: "#e9466b" },
  { bg: "#5a3aa6", ink: "#f3eeff", pop: "#ffd84d" },
];

const ph = (label: string, p: Palette) =>
  `<div class="ph" style="flex:1;position:relative"><span style="color:${p.ink}">${label}</span></div>`;
const esc = (s: unknown) =>
  String(s == null ? "" : s).replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] || c));

export const LAYOUTS: Record<string, (d: Pack, p: Palette) => string> = {
  claim: (d, p) => `
    <div class="ad-tag" style="color:${p.pop}">${esc(d.brand).toUpperCase()}</div>
    <div style="flex:1;display:flex;align-items:center">
      <div class="ad-h" style="font-size:22px;color:${p.ink}">${esc(d.claim)}</div>
    </div>
    <div style="display:flex;align-items:flex-end;justify-content:space-between">
      <span class="ad-price" style="color:${p.ink}">${esc(d.price)}</span>
      <span class="ad-cta" style="background:${p.pop};color:${p.bg}">${esc(d.cta)} →</span>
    </div>`,
  core: (d, p) => `
    ${ph("product shot", p)}
    <div class="ad-h" style="font-size:17px;margin-top:8px;color:${p.ink}">${esc(d.hook)}</div>`,
  beforeafter: (d, p) => `
    <div style="flex:1;display:flex;gap:6px">
      <div class="ph" style="flex:1;position:relative"><span style="color:${p.ink};opacity:.6">before</span></div>
      <div class="ph" style="flex:1;position:relative;background-image:repeating-linear-gradient(45deg,${p.pop}33 0 6px,transparent 6px 12px)"><span style="color:${p.pop}">after</span></div>
    </div>
    <div class="ad-h" style="font-size:15px;margin-top:8px;color:${p.ink}">${esc(d.transform)}</div>`,
  comparison: (d, p) => `
    <div class="ad-h" style="font-size:14px;color:${p.ink};margin-bottom:8px">${esc(d.compareTitle)}</div>
    <div style="flex:1;display:flex;flex-direction:column;gap:6px;font-size:11px">
      ${(d.compareBullets || []).slice(0, 3).map((t) => `
        <div style="display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid ${p.ink}22;padding-bottom:5px">
          <span style="color:${p.ink}">${esc(t)}</span>
          <span style="display:flex;gap:16px"><b style="color:${p.pop}">✓</b><b style="color:${p.ink};opacity:.35">✕</b></span>
        </div>`).join("")}
    </div>`,
  stat: (d, p) => `
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center">
      <div style="font-family:'Archivo',sans-serif;font-weight:900;font-size:54px;line-height:.9;color:${p.pop}">${esc(d.statNum)}</div>
      <div class="ad-h" style="font-size:14px;margin-top:8px;color:${p.ink}">${esc(d.statLine)}</div>
    </div>
    <div class="ad-tag" style="color:${p.ink};opacity:.6">${esc(d.brand)} · ${esc(d.reviews)}</div>`,
  testimonial: (d, p) => `
    <div style="display:flex;gap:2px;margin-bottom:8px;color:${p.pop};font-size:13px">★★★★★</div>
    <div class="ad-h" style="font-size:15px;color:${p.ink};flex:1">"${esc(d.testimonial)}"</div>
    <div style="display:flex;align-items:center;gap:7px;margin-top:8px">
      <div style="width:22px;height:22px;border-radius:50%;background:${p.pop}"></div>
      <span class="ad-tag" style="color:${p.ink}">— ${esc(d.reviewer || "Verified buyer")}</span>
    </div>`,
  ugc: (d, p) => `
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px">
      <div style="width:22px;height:22px;border-radius:50%;background:${p.pop}"></div>
      <div style="font-size:10px;color:${p.ink}"><b>${esc(d.ugcHandle || "@creator")}</b><div style="font-size:8px;opacity:.6">Sponsored</div></div>
    </div>
    ${ph("UGC photo", p)}
    <div style="font-size:10px;margin-top:6px;color:${p.ink}">${esc(d.ugcCaption)}</div>`,
  meme: (d, p) => `
    <div class="ad-h" style="font-size:13px;text-align:center;color:${p.ink}">${esc(d.memeTop)}</div>
    <div class="ph" style="flex:1;margin-top:8px;position:relative"><span style="color:${p.ink};opacity:.6">reaction shot</span></div>`,
  notes: (d, p) => `
    <div style="background:${p.ink}0d;border:1px solid ${p.ink}22;border-radius:8px;flex:1;padding:11px;display:flex;flex-direction:column">
      <div class="ad-tag" style="color:${p.ink};opacity:.5;margin-bottom:6px">Notes · just now</div>
      <div style="font-weight:800;font-size:13px;margin-bottom:7px;color:${p.ink}">${esc(d.notesTitle)}</div>
      <div style="font-size:10px;line-height:1.55;color:${p.ink};opacity:.85">${(d.notesLines || []).map((l, i) => `${i + 1}. ${esc(l)}`).join("<br/>")}</div>
      <div style="margin-top:auto;height:3px;background:${p.pop};width:42%"></div>
    </div>`,
  chat: (d, p) => `
    <div style="flex:1;display:flex;flex-direction:column;gap:6px;justify-content:center">
      <div style="align-self:flex-start;background:${p.ink}14;color:${p.ink};padding:7px 10px;border-radius:13px 13px 13px 3px;font-size:10px;max-width:82%">${esc(d.chatAsk)}</div>
      <div style="align-self:flex-end;background:${p.pop};color:${p.bg};padding:7px 10px;border-radius:13px 13px 3px 13px;font-size:10px;max-width:82%;font-weight:600">${esc(d.chatReply)}</div>
      <div style="align-self:flex-start;background:${p.ink}14;color:${p.ink};padding:7px 10px;border-radius:13px 13px 13px 3px;font-size:10px;max-width:82%">${esc(d.chatFollow)}</div>
    </div>`,
  tweet: (d, p) => `
    <div style="display:flex;align-items:center;gap:7px;margin-bottom:9px">
      <div style="width:26px;height:26px;border-radius:50%;background:${p.pop}"></div>
      <div style="font-size:10px;color:${p.ink}"><b>marketing jade</b> <span style="opacity:.55">@jade</span></div>
    </div>
    <div class="ad-h" style="font-size:15px;color:${p.ink};flex:1">${esc(d.tweetText)}</div>
    <div class="ad-tag" style="color:${p.ink};opacity:.5;margin-top:8px">2,481 reposts · 14.2K likes</div>`,
  listicle: (d, p) => `
    <div class="ad-h" style="font-size:15px;color:${p.ink};margin-bottom:10px">${esc(d.listTitle)}</div>
    <div style="flex:1;display:flex;flex-direction:column;gap:9px">
      ${(d.listItems || []).slice(0, 3).map((t, i) => `
        <div style="display:flex;gap:8px;align-items:center">
          <span style="font-family:'Archivo';font-weight:900;font-size:18px;color:${p.pop};line-height:1">0${i + 1}</span>
          <span style="font-size:11px;color:${p.ink}">${esc(t)}</span>
        </div>`).join("")}
    </div>`,
  price: (d, p) => `
    <div class="ad-tag" style="color:${p.ink};opacity:.6">${esc(d.brand)} bundle</div>
    <div style="flex:1;display:flex;flex-direction:column;justify-content:center">
      <div style="display:flex;align-items:baseline;gap:8px">
        <span style="font-family:'Archivo';font-weight:900;font-size:40px;color:${p.ink};line-height:1">${esc(d.price)}</span>
        <span style="font-size:13px;text-decoration:line-through;color:${p.ink};opacity:.45">${esc(d.priceWas)}</span>
      </div>
      <div class="ad-h" style="font-size:14px;margin-top:6px;color:${p.ink}">${esc(d.priceSave)}</div>
    </div>
    <span class="ad-cta" style="background:${p.pop};color:${p.bg};align-self:flex-start">${esc(d.cta)} →</span>`,
};

export function defaultPack(over: Partial<Pack> = {}): Pack {
  const brand = (over.brand as string) || "Lumen";
  const noun = (over.noun as string) || "serum";
  const price = (over.price as string) || "$39";
  return {
    brand,
    noun,
    price,
    name: `${brand} ${noun[0].toUpperCase() + noun.slice(1)}`,
    hook: "Glow you can see by Friday.",
    copy: "Clinical 15% vitamin C. One bottle replaces your whole shelf.",
    claim: `The ${noun} that actually works.`,
    cta: "Shop now",
    transform: `14 days. One ${noun}. See it.`,
    compareTitle: `${brand} vs. the $200 shelf`,
    compareBullets: ["Clinical dose", "One bottle", "Under $40"],
    statNum: "93%",
    statLine: "saw visible results in 2 weeks.",
    reviews: "1,200 reviews",
    testimonial: "Didn't think it'd work. Three weeks later I'm a believer.",
    reviewer: "Jordan M., verified buyer",
    ugcHandle: "@everydayjade",
    ugcCaption: "honestly obsessed, not going back 🤍",
    memeTop: `me explaining why I bought<br/>3 bottles of ${brand}:`,
    notesTitle: "why I stopped using 6 products",
    notesLines: ["they didn't work", "$200/mo is insane", `then I tried ${brand}—`],
    chatAsk: `ok what's the ${noun} everyone's posting??`,
    chatReply: `${brand}. ${price}. trust me 🙏`,
    chatFollow: "just ordered 2",
    tweetText: `unpopular opinion: ${brand} is the only ${noun} worth ${price}. that's the tweet.`,
    listTitle: "3 reasons it sells out",
    listItems: ["Works in 14 days", "One bottle does it all", "Costs less than coffee"],
    priceWas: "$78",
    priceSave: "Save 50% on your first set.",
    ...over,
  };
}

export const PRODUCTS: Record<string, Pack> = {
  lumen: defaultPack({ brand: "Lumen", noun: "serum", price: "$39", url: "lumenskin.co/products/vitamin-c-serum", accent: "#0f5c4a", name: "Lumen Vitamin C Serum" }),
  drift: defaultPack({
    brand: "Drift", noun: "spray", price: "$28", url: "drift.co/magnesium-sleep", accent: "#13182b", name: "Drift Magnesium Sleep Spray",
    hook: "Asleep before the doom-scroll.", claim: "Sleep, finally — no pills.", cta: "Try Drift",
    transform: "Spray. Breathe. Out by 10.", compareTitle: "Drift vs. melatonin gummies",
    compareBullets: ["No morning fog", "Non-habit forming", "Works in 20 min"],
    statNum: "8.1h", statLine: "average sleep after one week.", reviews: "3,400 reviews",
    testimonial: "First thing in years that knocks me out without grogginess.",
    notesTitle: "things that finally fixed my sleep", notesLines: ["no screens (lol)", "magnesium", "Drift before bed"],
    listTitle: "why it sells out nightly", listItems: ["Topical magnesium", "Lavender, not chemicals", "Out in 20 minutes"],
  }),
  cadence: defaultPack({
    brand: "Cadence", noun: "gel", price: "$32", url: "runcadence.com/recovery-gel", accent: "#c2502f", name: "Cadence Recovery Gel",
    hook: "Tomorrow's legs, today.", claim: "Recover like you rested.", cta: "Shop gel",
    transform: "Rub in. Run again sooner.", compareTitle: "Cadence vs. the ice bath",
    compareBullets: ["No 5am plunge", "Menthol + arnica", "Pocket-sized"],
    statNum: "2x", statLine: "faster perceived recovery.", reviews: "900 reviews",
    listTitle: "why runners stash it", listItems: ["Menthol cooling", "Arnica recovery", "Fits a race belt"],
  }),
};

// Preview: resolve a sample by URL, else derive a brand from the domain.
// TODO(production): wire to /api/scrape + /api/generate-briefs for real copy.
export async function generateProductPack(url: string): Promise<Pack> {
  const clean = url.replace(/^https?:\/\//, "");
  const sample = Object.values(PRODUCTS).find((p) => p.url && clean.startsWith(p.url));
  if (sample) return sample;
  const host = (url.match(/(?:https?:\/\/)?([^/]+)/) || [])[1] || "yourstore.com";
  const brand = host
    .replace(/^www\./, "")
    .split(".")[0]
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return defaultPack({ brand, url: clean });
}

let _uid = 1;
export function makeSet(d: Pack, count: number, startFrom = 0): AdItem[] {
  const out: AdItem[] = [];
  for (let i = 0; i < count; i++) {
    const fw = FRAMEWORKS[(startFrom + i) % FRAMEWORKS.length];
    const pal = PALETTES[(startFrom + i) % PALETTES.length];
    out.push({
      id: "ad-" + _uid++,
      fw: fw.n,
      cat: fw.c,
      layout: fw.layout,
      pal,
      rating: 0,
      version: 1,
      status: "pending",
      html: LAYOUTS[fw.layout](d, pal),
    });
  }
  return out;
}
