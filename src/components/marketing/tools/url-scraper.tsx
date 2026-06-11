"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";

interface ScrapeResult {
  data: {
    name: string | null;
    price: string | null;
    description: string | null;
    features: string[];
    images: string[];
  };
  brand: {
    colors: { label: string; hex: string }[];
    fonts: { role: string; family: string }[];
  };
}

export function UrlScraperTool() {
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScrapeResult | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!url || busy) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/tools/scrape", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message ?? "Could not scrape that URL.");
      } else {
        setResult(json as ScrapeResult);
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
              <label className="pg-field-label" htmlFor="url">
                Product URL
              </label>
              <input
                id="url"
                type="url"
                className="pg-input"
                placeholder="https://yourbrand.com/products/best-seller"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
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
              <span className="pg-tool-note">3 free scrapes per day</span>
              <button
                type="submit"
                className="pg-btn pg-btn--pop pg-btn--md"
                disabled={busy}
              >
                {busy ? "Reading the page" : "Scrape product"}
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

        {result && (
          <div className="pg-result">
            <h4>What Paintgym extracted</h4>
            <Row label="Product" value={result.data.name ?? "Not found"} />
            <Row label="Price" value={result.data.price ?? "Not found"} />
            <Row
              label="Description"
              value={result.data.description ?? "Not found"}
            />
            {result.data.features.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div className="pg-field-label">Features</div>
                <ul className="pg-prose" style={{ paddingLeft: 18 }}>
                  {result.data.features.map((f, i) => (
                    <li key={i} style={{ fontSize: 14 }}>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.brand.colors.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div className="pg-field-label">Brand colors</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {result.brand.colors.map((c) => (
                    <div
                      key={c.hex}
                      title={`${c.label} ${c.hex}`}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 4,
                        border: "1.5px solid var(--ink)",
                        background: c.hex,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
            {result.data.images.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <div className="pg-field-label">Images</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {result.data.images.slice(0, 4).map((src) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={src}
                      src={src}
                      alt=""
                      style={{
                        width: 64,
                        height: 64,
                        objectFit: "cover",
                        borderRadius: 4,
                        border: "1.5px solid var(--line)",
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="pg-land-cta">
        <h3>Now generate 49 ad creatives from this data</h3>
        <div className="pg-cta-row">
          <Link href="/signup" className="pg-btn pg-btn--pop pg-btn--md">
            Try Paintgym free
          </Link>
          <Link
            href="/how-it-works"
            className="pg-btn pg-btn--outline pg-btn--md"
          >
            How it works
          </Link>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div className="pg-field-label">{label}</div>
      <div className="body">{value}</div>
    </div>
  );
}
