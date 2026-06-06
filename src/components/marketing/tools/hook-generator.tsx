"use client";

import { useState } from "react";
import Link from "next/link";
import { HOOKS, fillHook } from "@/content/hooks";
import { EmailCapture } from "@/components/marketing/email-capture";

const CATEGORIES = [
  "skincare",
  "supplement",
  "coffee",
  "protein powder",
  "candle",
  "water bottle",
  "pet food",
  "cookware",
  "headphones",
  "sunglasses",
  "tea",
  "shampoo",
  "mattress",
  "running shoe",
  "perfume",
  "cleaning spray",
];

function pickFive(seed: number): typeof HOOKS {
  // Seeded PRNG so "generate more" reshuffles deterministically per click.
  let s = seed * 9301 + 49297;
  const rand = () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
  const arr = [...HOOKS];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.slice(0, 5);
}

export function HookGeneratorTool() {
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [seed, setSeed] = useState(1);

  const hooks = pickFive(seed);

  return (
    <>
      <section className="pg-section">
        <div className="pg-tool-card">
          <label className="pg-field-label" htmlFor="cat">
            Product category
          </label>
          <select
            id="cat"
            className="pg-input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 14,
            }}
          >
            <span className="pg-tool-note">5 of 20 proven hooks, filled in</span>
            <button
              type="button"
              className="pg-btn pg-btn--outline pg-btn--sm"
              onClick={() => setSeed((s) => s + 1)}
            >
              Generate more
            </button>
          </div>
        </div>

        <div className="pg-hooklist" style={{ marginTop: 16 }}>
          {hooks.map((h, i) => (
            <div className="pg-hookcard" key={`${seed}-${i}`}>
              <div className="h">
                {fillHook(h.template, category, category)}
              </div>
              <div className="why">{h.whyItWorks}</div>
              <div className="cat">{h.category.replace(/_/g, " ")}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="pg-section">
        <EmailCapture
          source="hook-generator"
          heading="Get all 20 hooks plus the 35 ad concepts"
          sub="We will email the full hook bank and the complete concept library."
          cta="Send the bank"
          payload={{ category }}
        />
      </section>

      <div className="pg-land-cta">
        <h3>Turn these hooks into ads</h3>
        <div className="pg-cta-row">
          <Link href="/signup" className="pg-btn pg-btn--pop pg-btn--md">
            Try Paintgym free
          </Link>
          <Link
            href="/tools/brief-preview"
            className="pg-btn pg-btn--outline pg-btn--md"
          >
            Preview a brief
          </Link>
        </div>
      </div>
    </>
  );
}
