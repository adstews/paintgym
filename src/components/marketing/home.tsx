import Link from "next/link";

/**
 * Paintgym public homepage — full redesign (light theme).
 *
 * Aesthetic: clean, confident, "performance creative, not a platform." Warm
 * off-white canvas, ink text, heavy Archivo display type, Space Mono labels.
 * Bright lime (#c2f536) is the signature — used as FILLS (buttons, marquee,
 * dots, the strike bar, hover rings) where dark text sits on top and it pops.
 * A deeper lime-green (#4d7c0f) carries accent TEXT and stats so it stays
 * legible on white and reads as growth/positive.
 *
 * Self-styled light theme (explicit colors) so it's independent of the
 * shadcn .dark class. Server component — all motion is CSS (globals.css .rd-*).
 * CTAs route to /signup; the secondary CTA jumps to #wall.
 */

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

type Tile = { name: string; fmt: string; from: string; to: string };

// Soft pastel tints — a varied but cohesive wall of creative on white.
const CONCEPT_ROWS: { label: string; tag: string; tiles: Tile[] }[] = [
  {
    label: "Native & Messaging",
    tag: "feels organic, not paid",
    tiles: [
      { name: "iMessage Thread", fmt: "4:5 · STATIC", from: "#e7f0ff", to: "#d2e2ff" },
      { name: "Reddit Post", fmt: "4:5 · STATIC", from: "#ffece1", to: "#ffd9c4" },
      { name: "Notes App", fmt: "4:5 · STATIC", from: "#f4f1e8", to: "#e7e2d3" },
      { name: "Google Search", fmt: "4:5 · STATIC", from: "#eaf3ff", to: "#d6eaff" },
      { name: "Tweet Drop", fmt: "4:5 · STATIC", from: "#e9f6ff", to: "#d4edff" },
      { name: "Texting Receipt", fmt: "4:5 · STATIC", from: "#eef2f6", to: "#dbe5ee" },
      { name: "FaceTime", fmt: "4:5 · STATIC", from: "#e6f4ec", to: "#d0ebdb" },
    ],
  },
  {
    label: "Proof & Reviews",
    tag: "borrowed credibility",
    tiles: [
      { name: "5-Star Review", fmt: "4:5 · STATIC", from: "#fff4d9", to: "#ffe7ad" },
      { name: "Press Quote", fmt: "4:5 · STATIC", from: "#f1f1f4", to: "#e2e2ea" },
      { name: "As Seen In", fmt: "4:5 · STATIC", from: "#f7ecff", to: "#ead4ff" },
      { name: "Testimonial", fmt: "4:5 · STATIC", from: "#e6f6ef", to: "#cfeada" },
      { name: "Star-Rating Wall", fmt: "4:5 · STATIC", from: "#fff2cf", to: "#ffe49f" },
      { name: "Founder Note", fmt: "4:5 · STATIC", from: "#f5efe6", to: "#e9dcc8" },
      { name: "UGC Selfie", fmt: "4:5 · STATIC", from: "#ffe9f2", to: "#ffd2e2" },
    ],
  },
  {
    label: "Bold & Direct",
    tag: "no hiding the offer",
    tiles: [
      { name: "Bold Claim", fmt: "4:5 · STATIC", from: "#f4f7d6", to: "#e7efa6" },
      { name: "Stat Drop", fmt: "4:5 · STATIC", from: "#e3f7ef", to: "#cdedda" },
      { name: "Myth vs Fact", fmt: "4:5 · STATIC", from: "#f6e9f9", to: "#ead0f0" },
      { name: "Price Anchor", fmt: "4:5 · STATIC", from: "#ffe9e6", to: "#ffd2ca" },
      { name: "Guarantee Seal", fmt: "4:5 · STATIC", from: "#e6f3f7", to: "#d0e7f0" },
      { name: "Discount Stamp", fmt: "4:5 · STATIC", from: "#fff0dd", to: "#ffdfb6" },
      { name: "Big Promise", fmt: "4:5 · STATIC", from: "#eef5dc", to: "#dcebb6" },
    ],
  },
  {
    label: "Product & Transformation",
    tag: "show the result",
    tiles: [
      { name: "Before & After", fmt: "4:5 · STATIC", from: "#e6f4f7", to: "#cfe7ef" },
      { name: "Side-by-Side", fmt: "4:5 · STATIC", from: "#f1edf7", to: "#e0d4ef" },
      { name: "Ingredient Hero", fmt: "4:5 · STATIC", from: "#eef6dd", to: "#daebb8" },
      { name: "Flat Lay", fmt: "4:5 · STATIC", from: "#f6efe2", to: "#eaddc6" },
      { name: "Packaging Hero", fmt: "4:5 · STATIC", from: "#e9f1fa", to: "#d3e3f3" },
      { name: "Comparison Chart", fmt: "4:5 · STATIC", from: "#f0f0f2", to: "#e0e0e6" },
      { name: "Lifestyle Hero", fmt: "4:5 · STATIC", from: "#fdebf0", to: "#f6d2de" },
    ],
  },
];

const VERTICALS = [
  "Small ecom",
  "8-figure ecom",
  "Medspas",
  "Supplements",
  "Pet",
  "Food & bev",
  "Beauty",
  "Apparel",
  "Home",
];

// NOTE: placeholder case studies. Nick swaps in the real ad creative + verified
// stats later — the gradient "AD PREVIEW" tile and these numbers are stand-ins.
type CaseStudy = {
  brand: string;
  vertical: string;
  stat: string;
  statLabel: string;
  result: string;
  meta: string;
  from: string;
  to: string;
};

const CASES: CaseStudy[] = [
  {
    brand: "Torchbearer Sauces",
    vertical: "Hot Sauce · DTC",
    stat: "3.8×",
    statLabel: "blended ROAS",
    result: "Pickle Goblin sold out twice after the Reddit + Bold Claim set went live.",
    meta: "$120K scaled · 60 days",
    from: "#a8260f",
    to: "#5e1207",
  },
  {
    brand: "Mythical Meats",
    vertical: "Specialty Food · DTC",
    stat: "$410K",
    statLabel: "new revenue",
    result: "Scaled cold from $1K/day on iMessage + Before/After creative.",
    meta: "4.1× ROAS · Q2 2026",
    from: "#9a6512",
    to: "#553505",
  },
  {
    brand: "Get Headstrong",
    vertical: "Supplements · DTC",
    stat: "−42%",
    statLabel: "cost per acquisition",
    result: "Founder Note + Stat Drop concepts halved CPA in under three weeks.",
    meta: "$85K/mo spend",
    from: "#0f6b80",
    to: "#06323d",
  },
  {
    brand: "Pawfy",
    vertical: "Pet · DTC",
    stat: "4.2×",
    statLabel: "ROAS at scale",
    result: "UGC Selfie + 5-Star Review wall became the top-spending creative in the account.",
    meta: "7-figure ad account",
    from: "#1d8a4f",
    to: "#0b3d22",
  },
];

const MARQUEE = [
  "REAL ADS",
  "NOT PROMPTS",
  "LIVE IN 20 MIN",
  "35 PROVEN CONCEPTS",
  "QA ON EVERY AD",
  "BUILT TO SCALE",
];

// Deeper lime-green for legible accent text / stats on white.
const LIME_INK = "#4d7c0f";

// ---------------------------------------------------------------------------
// Small building blocks
// ---------------------------------------------------------------------------

function Kicker({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="font-tfmono text-[11px] uppercase tracking-[0.32em]"
      style={{ color: LIME_INK }}
    >
      {children}
    </span>
  );
}

function ConceptTile({ tile, idx }: { tile: Tile; idx: number }) {
  return (
    <div
      className="group relative w-[164px] shrink-0 sm:w-[188px]"
      style={{ aspectRatio: "4 / 5" }}
    >
      <div
        className="rd-grain relative flex h-full flex-col justify-between overflow-hidden rounded-xl p-3 shadow-sm ring-1 ring-black/10 transition-all duration-300 group-hover:-translate-y-1.5 group-hover:shadow-md group-hover:ring-[#4d7c0f]/50"
        style={{ backgroundImage: `linear-gradient(155deg, ${tile.from}, ${tile.to})` }}
      >
        <div className="relative z-10 flex items-start justify-between">
          <span className="font-tfmono text-[9px] uppercase tracking-[0.18em] text-black/45">
            {tile.fmt}
          </span>
          <span className="font-tfmono text-[9px] text-black/30">
            {String(idx + 1).padStart(2, "0")}
          </span>
        </div>
        {/* faux creative scaffolding */}
        <div className="relative z-10 space-y-1.5 opacity-50">
          <div className="h-1.5 w-3/4 rounded-full bg-black/25" />
          <div className="h-1.5 w-1/2 rounded-full bg-black/15" />
        </div>
        <div className="relative z-10">
          <div className="mb-2 h-px w-8" style={{ backgroundColor: LIME_INK }} />
          <p className="font-display text-[15px] font-extrabold leading-tight tracking-tight text-[#141414]">
            {tile.name}
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export function MarketingHome() {
  return (
    <div className="mktg min-h-screen w-full overflow-x-hidden bg-[#fafaf7] font-ui text-[#141414] antialiased selection:bg-pop selection:text-[#141414]">
      {/* ===== Nav ===== */}
      <header className="sticky top-0 z-50 border-b border-black/10 bg-[#fafaf7]/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/" className="font-display text-xl font-extrabold tracking-tight">
            PAINT<span style={{ color: LIME_INK }}>/</span>GYM
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/how-it-works"
              className="hidden font-tfmono text-xs uppercase tracking-widest text-black/55 transition-colors hover:text-black sm:block"
            >
              How it works
            </Link>
            <Link
              href="/pricing"
              className="hidden font-tfmono text-xs uppercase tracking-widest text-black/55 transition-colors hover:text-black sm:block"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 font-ui text-sm font-semibold text-black/70 transition-colors hover:text-black"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-pop px-4 py-2 font-ui text-sm font-bold text-[#141414] ring-1 ring-[#a6d916] transition-transform hover:-translate-y-0.5"
            >
              Start free
            </Link>
          </nav>
        </div>
      </header>

      {/* ===== Hero ===== */}
      <section className="rd-grid-light relative overflow-hidden border-b border-black/10">
        {/* lime haze */}
        <div
          className="rd-glow pointer-events-none absolute -top-44 left-1/2 h-[520px] w-[860px] -translate-x-1/2 rounded-full blur-[130px]"
          style={{ background: "radial-gradient(closest-side, rgba(194,245,54,0.55), transparent)" }}
        />

        <div className="relative z-10 mx-auto max-w-7xl px-5 pb-20 pt-20 sm:px-8 sm:pb-28 sm:pt-28">
          <div className="rd-fade-up max-w-4xl" style={{ animationDelay: "0ms" }}>
            <div className="mb-7 inline-flex max-w-full items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-1.5 shadow-sm">
              <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: LIME_INK }} />
              <span className="font-tfmono text-[10px] uppercase tracking-[0.12em] text-black/65 sm:text-[11px] sm:tracking-[0.24em]">
                Performance creative · not a platform
              </span>
            </div>
          </div>

          <h1
            className="rd-fade-up font-display text-[clamp(2.15rem,8.5vw,7rem)] font-extrabold uppercase leading-[0.92] tracking-[-0.02em] text-[#141414]"
            style={{ animationDelay: "80ms" }}
          >
            Not Another
            <br />
            AI Ad{" "}
            <span className="relative inline-block">
              <span className="text-black/25">Platform</span>
              <span className="absolute left-0 top-1/2 h-[6px] w-full -translate-y-1/2 bg-pop" />
            </span>
          </h1>

          <p
            className="rd-fade-up mt-7 max-w-2xl font-display text-2xl font-extrabold uppercase leading-[1.05] tracking-tight sm:text-3xl"
            style={{ animationDelay: "150ms", color: LIME_INK }}
          >
            Real ads. Ready to launch today.
          </p>

          <p
            className="rd-fade-up mt-6 max-w-2xl text-base leading-relaxed text-black/65 sm:text-xl"
            style={{ animationDelay: "220ms" }}
          >
            Paintgym hands you a wall of finished, on-brand static ads — briefs
            written, images rendered, every one QA&apos;d. Not access to a tool.
            Actual creative you can download and go live with in under{" "}
            <span className="font-semibold text-[#141414]">20 minutes</span>. And
            they work.
          </p>

          <div
            className="rd-fade-up mt-9 flex flex-col items-start gap-3 sm:flex-row sm:items-center"
            style={{ animationDelay: "300ms" }}
          >
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 rounded-xl bg-pop px-7 py-4 font-display text-base font-extrabold uppercase tracking-wide text-[#141414] shadow-[0_10px_30px_-8px_rgba(166,217,22,0.7)] ring-1 ring-[#a6d916] transition-transform hover:-translate-y-0.5"
            >
              Start a free set
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
            <a
              href="#wall"
              className="inline-flex items-center gap-2 rounded-xl border border-black/20 bg-white px-7 py-4 font-display text-base font-bold uppercase tracking-wide text-[#141414] transition-colors hover:border-black/40 hover:bg-black/[0.03]"
            >
              See the work ↓
            </a>
          </div>

          <p
            className="rd-fade-up mt-7 font-tfmono text-[12px] uppercase leading-relaxed tracking-[0.16em] text-black/45"
            style={{ animationDelay: "380ms" }}
          >
            {"// Built on the exact concepts scaling real accounts right now — "}
            <span style={{ color: LIME_INK }}>June 2026</span>. Small ecom,
            8-figure ecom, medspas, and dozens of verticals.
          </p>

          {/* hero stat strip */}
          <div
            className="rd-fade-up mt-12 grid max-w-2xl grid-cols-3 gap-px overflow-hidden rounded-2xl border border-black/10 bg-black/10 shadow-sm"
            style={{ animationDelay: "460ms" }}
          >
            {[
              { k: "< 20 min", v: "from link to live" },
              { k: "35", v: "proven concepts" },
              { k: "every ad", v: "agent QA'd" },
            ].map((s) => (
              <div key={s.k} className="bg-white px-4 py-5 text-center sm:px-6">
                <div
                  className="font-display text-2xl font-extrabold sm:text-3xl"
                  style={{ color: LIME_INK }}
                >
                  {s.k}
                </div>
                <div className="mt-1 font-tfmono text-[10px] uppercase tracking-[0.14em] text-black/50">
                  {s.v}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Marquee ===== */}
      <div className="overflow-hidden border-b border-black/10 bg-pop py-3.5 text-[#141414]">
        <div className="rd-marquee-track">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex shrink-0 items-center" aria-hidden={dup === 1}>
              {MARQUEE.map((m) => (
                <span key={m} className="flex items-center">
                  <span className="px-6 font-display text-sm font-extrabold uppercase tracking-wide">
                    {m}
                  </span>
                  <span className="text-base">●</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* ===== Ad wall gallery ===== */}
      <section id="wall" className="relative border-b border-black/10 bg-[#fafaf7] py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mb-12 max-w-3xl">
            <Kicker>The output</Kicker>
            <h2 className="mt-4 font-display text-[clamp(2rem,6vw,4rem)] font-extrabold uppercase leading-[0.95] tracking-tight text-[#141414]">
              A wall of creative,
              <br />
              not a blank canvas
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-black/60">
              Paste one product link. Paintgym trains an entire wall of static
              ads across{" "}
              <span className="font-semibold text-[#141414]">35 proven concepts</span>{" "}
              — the messaging hooks, proof formats, and bold-claim layouts that
              are actually scaling accounts today. Pick your winners. Ship.
            </p>
          </div>
        </div>

        {/* Netflix-style rows: full-bleed horizontal scroll */}
        <div className="space-y-10">
          {CONCEPT_ROWS.map((row) => (
            <div key={row.label}>
              <div className="mx-auto mb-3 flex max-w-7xl items-baseline justify-between px-5 sm:px-8">
                <h3 className="font-display text-lg font-extrabold uppercase tracking-tight text-[#141414]">
                  {row.label}
                </h3>
                <span className="font-tfmono text-[10px] uppercase tracking-[0.18em] text-black/40">
                  {row.tag}
                </span>
              </div>
              <div className="rd-scroll flex gap-3 overflow-x-auto px-5 pb-2 sm:px-8">
                {row.tiles.map((tile, i) => (
                  <ConceptTile key={tile.name} tile={tile} idx={i} />
                ))}
                {/* trailing "+more" tile */}
                <div className="flex w-[164px] shrink-0 items-center justify-center rounded-xl border border-dashed border-black/20 sm:w-[188px]">
                  <span className="font-tfmono text-[11px] uppercase tracking-widest text-black/40">
                    + more
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Case studies / receipts ===== */}
      <section className="relative border-b border-black/10 bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="mb-12 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <Kicker>Receipts</Kicker>
              <h2 className="mt-4 font-display text-[clamp(2rem,6vw,4rem)] font-extrabold uppercase leading-[0.95] tracking-tight text-[#141414]">
                Same concepts.
                <br />
                Real money.
              </h2>
            </div>
            <p className="max-w-sm text-base leading-relaxed text-black/60">
              These are the brands running Paintgym creative in live accounts.
              Skeptical is the right instinct — so here&apos;s the work and the
              numbers behind it.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {CASES.map((c) => (
              <article
                key={c.brand}
                className="group flex flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-md hover:ring-1 hover:ring-[#4d7c0f]/30"
              >
                {/* ad preview placeholder */}
                <div
                  className="rd-grain relative flex items-end overflow-hidden"
                  style={{
                    aspectRatio: "4 / 5",
                    backgroundImage: `linear-gradient(160deg, ${c.from}, ${c.to})`,
                  }}
                >
                  <div className="absolute right-3 top-3 z-10 rounded-md bg-black/30 px-2 py-1 font-tfmono text-[9px] uppercase tracking-[0.16em] text-white/85 backdrop-blur-sm">
                    Ad preview
                  </div>
                  <div className="relative z-10 p-4">
                    <div className="mb-2 h-px w-10 bg-pop" />
                    <p className="font-display text-xl font-extrabold uppercase leading-none tracking-tight text-white">
                      {c.brand}
                    </p>
                    <p className="mt-1 font-tfmono text-[10px] uppercase tracking-[0.14em] text-white/75">
                      {c.vertical}
                    </p>
                  </div>
                </div>

                {/* stat block */}
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-end gap-2">
                    <span
                      className="font-display text-4xl font-extrabold leading-none"
                      style={{ color: LIME_INK }}
                    >
                      {c.stat}
                    </span>
                    <span className="pb-1 font-tfmono text-[10px] uppercase tracking-[0.14em] text-black/50">
                      {c.statLabel}
                    </span>
                  </div>
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-black/70">
                    {c.result}
                  </p>
                  <p className="mt-4 border-t border-black/10 pt-3 font-tfmono text-[10px] uppercase tracking-[0.14em] text-black/40">
                    {c.meta}
                  </p>
                </div>
              </article>
            ))}
          </div>

          <p className="mt-6 font-tfmono text-[11px] uppercase tracking-[0.16em] text-black/35">
            {"// Live creative + verified stats land here as accounts report."}
          </p>
        </div>
      </section>

      {/* ===== Trust band ===== */}
      <section className="border-b border-black/10 bg-[#f3f3ee] py-10">
        <div className="mx-auto flex max-w-7xl flex-row flex-wrap items-center justify-center gap-x-5 gap-y-3 px-5 text-center sm:gap-x-10 sm:gap-y-4 sm:px-8">
          {VERTICALS.map((v) => (
            <span
              key={v}
              className="font-display text-base font-extrabold uppercase tracking-tight text-black/35 transition-colors hover:text-black/70"
            >
              {v}
            </span>
          ))}
        </div>
      </section>

      {/* ===== Final CTA ===== */}
      <section className="rd-grid-light relative overflow-hidden bg-[#f6f9e9]">
        <div
          className="rd-glow pointer-events-none absolute -bottom-44 left-1/2 h-[480px] w-[800px] -translate-x-1/2 rounded-full blur-[140px]"
          style={{ background: "radial-gradient(closest-side, rgba(194,245,54,0.6), transparent)" }}
        />
        <div className="relative z-10 mx-auto max-w-4xl px-5 py-24 text-center sm:px-8 sm:py-32">
          <Kicker>Stop renting tools</Kicker>
          <h2 className="mt-5 font-display text-[clamp(2.4rem,8vw,5.5rem)] font-extrabold uppercase leading-[0.92] tracking-tight text-[#141414]">
            Get the ads.
            <br />
            <span style={{ color: LIME_INK }}>Go live today.</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-black/65">
            Drop in a product link and walk away with a wall of finished ads in
            minutes. No card required to see your first set.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="group inline-flex items-center gap-2 rounded-xl bg-pop px-8 py-4 font-display text-lg font-extrabold uppercase tracking-wide text-[#141414] shadow-[0_14px_40px_-10px_rgba(166,217,22,0.8)] ring-1 ring-[#a6d916] transition-transform hover:-translate-y-0.5"
            >
              Start a free set
              <span className="transition-transform group-hover:translate-x-1">→</span>
            </Link>
            <Link
              href="/login"
              className="font-ui text-sm font-semibold text-black/60 underline-offset-4 transition-colors hover:text-black hover:underline"
            >
              Already training? Log in
            </Link>
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-black/10 bg-[#fafaf7] py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-5 px-5 sm:flex-row sm:px-8">
          <Link href="/" className="font-display text-lg font-extrabold tracking-tight">
            PAINT<span style={{ color: LIME_INK }}>/</span>GYM
          </Link>
          <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-tfmono text-[11px] uppercase tracking-widest text-black/45">
            <Link href="/how-it-works" className="transition-colors hover:text-black">
              How it works
            </Link>
            <Link href="/pricing" className="transition-colors hover:text-black">
              Pricing
            </Link>
            <Link href="/faq" className="transition-colors hover:text-black">
              FAQ
            </Link>
            <Link href="/blog" className="transition-colors hover:text-black">
              Blog
            </Link>
            <Link href="/login" className="transition-colors hover:text-black">
              Log in
            </Link>
          </nav>
          <span className="font-tfmono text-[11px] uppercase tracking-widest text-black/35">
            © 2026 · a gym for your ad creative
          </span>
        </div>
      </footer>
    </div>
  );
}
