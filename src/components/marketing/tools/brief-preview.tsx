"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

interface Brief {
  brief_text: string;
  summary: string;
  key_points: string[];
}

export function BriefPreviewTool() {
  const [productName, setProductName] = useState("");
  const [whatItDoes, setWhatItDoes] = useState("");
  const [keyBenefit, setKeyBenefit] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [brief, setBrief] = useState<Brief | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    setBrief(null);
    try {
      const res = await fetch("/api/tools/brief", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productName, whatItDoes, keyBenefit }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message ?? "Could not write the brief. Try again.");
      } else {
        setBrief(json.brief as Brief);
      }
    } catch {
      setError("Network error. Try again.");
    }
    setBusy(false);
  };

  return (
    <>
      <section className="pg-section">
        <div className="pg-tool-card">
          <form className="pg-tool-form" onSubmit={submit}>
            <div>
              <label className="pg-field-label" htmlFor="pn">
                Product name
              </label>
              <input
                id="pn"
                className="pg-input"
                placeholder="e.g. Drift Cold Brew"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                required
                maxLength={120}
              />
            </div>
            <div>
              <label className="pg-field-label" htmlFor="wd">
                What it does
              </label>
              <input
                id="wd"
                className="pg-input"
                placeholder="e.g. Ready-to-drink cold brew coffee concentrate"
                value={whatItDoes}
                onChange={(e) => setWhatItDoes(e.target.value)}
                required
                maxLength={400}
              />
            </div>
            <div>
              <label className="pg-field-label" htmlFor="kb">
                One key benefit
              </label>
              <input
                id="kb"
                className="pg-input"
                placeholder="e.g. Smoother than any drip coffee, zero bitterness"
                value={keyBenefit}
                onChange={(e) => setKeyBenefit(e.target.value)}
                required
                maxLength={300}
              />
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span className="pg-tool-note">
                1 free brief per day, written by Claude
              </span>
              <button
                type="submit"
                className="pg-btn pg-btn--pop pg-btn--md"
                disabled={busy}
              >
                {busy ? "Writing the brief" : "Write my brief"}
              </button>
            </div>
          </form>

          {error && (
            <div
              className="pg-tool-note"
              style={{ color: "var(--red)", marginTop: 14 }}
            >
              {error}
            </div>
          )}
        </div>

        {brief && (
          <>
            <div className="pg-result">
              <h4>Bold Claim brief</h4>
              <div className="body">{brief.brief_text}</div>
              <div style={{ marginTop: 14 }}>
                <div className="pg-field-label">At a glance</div>
                <div className="body">{brief.summary}</div>
              </div>
              <div style={{ marginTop: 14 }}>
                <div className="pg-field-label">Key decisions</div>
                <ul className="pg-prose" style={{ paddingLeft: 18 }}>
                  {brief.key_points.map((k, i) => (
                    <li key={i} style={{ fontSize: 14 }}>
                      {k}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div
              style={{
                marginTop: 16,
                border: "1.5px solid var(--ink)",
                borderRadius: 4,
                background: "var(--paper)",
                aspectRatio: "4/5",
                maxWidth: 280,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                padding: 24,
                backgroundImage:
                  "repeating-linear-gradient(45deg, rgba(20,20,20,0.04) 0 12px, transparent 12px 24px)",
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                  }}
                >
                  Image preview
                </div>
                <div
                  style={{
                    fontFamily: "var(--headline)",
                    fontWeight: 800,
                    fontSize: 16,
                    marginTop: 8,
                  }}
                >
                  Sign up to generate the image
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      <div className="pg-land-cta">
        <h3>Generate all 49 briefs and images</h3>
        <div className="pg-cta-row">
          <Link href="/signup" className="pg-btn pg-btn--pop pg-btn--md">
            Try Paintgym free
          </Link>
          <Link href="/pricing" className="pg-btn pg-btn--outline pg-btn--md">
            See pricing
          </Link>
        </div>
      </div>
    </>
  );
}
