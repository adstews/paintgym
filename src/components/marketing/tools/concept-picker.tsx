"use client";

import { useState } from "react";
import Link from "next/link";
import { CONCEPTS, type AdConcept, type ConceptGoal } from "@/content/concepts";
import { EmailCapture } from "@/components/marketing/email-capture";

interface Option {
  label: string;
  goals?: ConceptGoal[];
  traits?: string[];
}
interface Question {
  q: string;
  options: Option[];
}

const QUESTIONS: Question[] = [
  {
    q: "What kind of product are you selling?",
    options: [
      { label: "Beauty or skincare", traits: ["ugc", "proof", "premium"] },
      { label: "Supplement or wellness", traits: ["proof", "transformation"] },
      { label: "Gadget or tech", traits: ["clean", "value"] },
      { label: "Apparel or lifestyle", traits: ["ugc", "native", "premium"] },
    ],
  },
  {
    q: "Who is your target audience?",
    options: [
      { label: "Gen Z (under 27)", traits: ["native", "humor", "ugc"] },
      { label: "Millennials (27 to 42)", traits: ["ugc", "proof", "value"] },
      { label: "Gen X and older (43+)", traits: ["proof", "clean", "premium"] },
    ],
  },
  {
    q: "Where does your price sit?",
    options: [
      { label: "Budget friendly", traits: ["value", "promo"] },
      { label: "Mid-range", traits: ["value", "proof"] },
      { label: "Premium", traits: ["premium", "clean", "story"] },
    ],
  },
  {
    q: "What is the main goal of these ads?",
    options: [
      { label: "Awareness (cold prospecting)", goals: ["awareness"] },
      { label: "Conversion (drive sales)", goals: ["conversion"] },
      { label: "Retargeting (warm shoppers)", goals: ["retargeting"] },
    ],
  },
  {
    q: "How would you describe your brand voice?",
    options: [
      { label: "Bold and confident", traits: ["bold", "premium"] },
      { label: "Playful and funny", traits: ["humor", "native"] },
      { label: "Trustworthy and clear", traits: ["proof", "clean"] },
      { label: "Warm and personal", traits: ["story", "ugc"] },
    ],
  },
];

function recommend(selected: Option[]): AdConcept[] {
  const goalWeight: Record<string, number> = {};
  const traitWeight: Record<string, number> = {};
  for (const o of selected) {
    for (const g of o.goals ?? []) goalWeight[g] = (goalWeight[g] ?? 0) + 1;
    for (const t of o.traits ?? []) traitWeight[t] = (traitWeight[t] ?? 0) + 1;
  }
  return [...CONCEPTS]
    .map((c) => {
      let score = 0;
      for (const g of c.goals) score += (goalWeight[g] ?? 0) * 2;
      for (const t of c.traits) score += traitWeight[t] ?? 0;
      return { c, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((x) => x.c);
}

export function ConceptPickerTool() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Option[]>([]);

  const choose = (opt: Option) => {
    const next = [...answers];
    next[step] = opt;
    setAnswers(next);
    setStep((s) => s + 1);
  };

  const reset = () => {
    setStep(0);
    setAnswers([]);
  };

  const done = step >= QUESTIONS.length;
  const picks = done ? recommend(answers) : [];

  return (
    <>
      <section className="pg-section">
        <div className="pg-tool-card">
          {!done ? (
            <div className="pg-quiz">
              <div className="pg-quiz-progress">
                Question {step + 1} of {QUESTIONS.length}
              </div>
              <div className="pg-quiz-q">{QUESTIONS[step].q}</div>
              <div className="pg-quiz-opts">
                {QUESTIONS[step].options.map((o) => (
                  <button
                    key={o.label}
                    type="button"
                    className="pg-quiz-opt"
                    onClick={() => choose(o)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              {step > 0 && (
                <button
                  type="button"
                  className="pg-btn pg-btn--ghost pg-btn--sm"
                  onClick={() => setStep((s) => s - 1)}
                  style={{ alignSelf: "flex-start" }}
                >
                  ← Back
                </button>
              )}
            </div>
          ) : (
            <div>
              <div className="pg-quiz-progress">Your top 5 concepts</div>
              <div
                className="pg-quiz-q"
                style={{ marginTop: 4, marginBottom: 14 }}
              >
                Start with these frameworks
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {picks.map((c, i) => (
                  <div className="pg-conceptcard" key={c.slug}>
                    <div className="rank">#{i + 1}</div>
                    <div className="t">{c.name}</div>
                    <div className="d">{c.description}</div>
                    <div className="why">{c.whyItWorks}</div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="pg-btn pg-btn--outline pg-btn--sm"
                onClick={reset}
                style={{ marginTop: 14 }}
              >
                Start over
              </button>
            </div>
          )}
        </div>
      </section>

      {done && (
        <section className="pg-section">
          <EmailCapture
            source="concept-picker"
            heading="Get your full concept report"
            sub="We will email all five recommendations plus the other 30 concepts and how to use them."
            cta="Email my report"
            payload={{ picks: picks.map((p) => p.slug) }}
          />
        </section>
      )}

      <div className="pg-land-cta">
        <h3>Generate all 49 concepts for your product</h3>
        <div className="pg-cta-row">
          <Link href="/signup" className="pg-btn pg-btn--pop pg-btn--md">
            Try Paintgym free
          </Link>
          <Link
            href="/blog/35-static-ad-concepts-that-convert-on-meta"
            className="pg-btn pg-btn--outline pg-btn--md"
          >
            See all 49
          </Link>
        </div>
      </div>
    </>
  );
}
