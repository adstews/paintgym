import Link from "next/link";
import type { ReactNode } from "react";

const NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Blog" },
  { href: "/faq", label: "FAQ" },
  { href: "/tools/hook-generator", label: "Free tools" },
];

const FOOTER_TOOLS = [
  { href: "/tools/hook-generator", label: "Hook generator" },
  { href: "/tools/concept-picker", label: "Concept picker" },
  { href: "/tools/url-scraper", label: "URL scraper" },
  { href: "/tools/brief-preview", label: "Brief preview" },
];

// Full-width marketing wrapper. Reuses the landing shell so these pages match
// the homepage and go edge-to-edge on desktop.
export function MarketingShell({
  active,
  children,
}: {
  active?: string;
  children: ReactNode;
}) {
  return (
    <div className="pg-stage pg-stage--landing">
      <div className="pg-phone">
        <div className="pg-screen">
          <div className="pg-app">
            <div className="pg-scroll">
              <nav className="pg-land-nav">
                <Link
                  href="/"
                  className="pg-wordmark"
                  style={{ textDecoration: "none" }}
                >
                  PAINT<span className="slash">/</span>GYM
                </Link>
                <div className="pg-mkt-links">
                  {NAV.map((n) => (
                    <Link
                      key={n.href}
                      href={n.href}
                      className={active === n.href ? "is-active" : ""}
                    >
                      {n.label}
                    </Link>
                  ))}
                  <Link
                    href="/signup"
                    className="pg-btn pg-btn--pop pg-btn--sm pg-mkt-nav-cta"
                  >
                    Start free
                  </Link>
                </div>
              </nav>

              {children}

              <footer className="pg-section" style={{ paddingBottom: 8 }}>
                <div
                  className="pg-faq"
                  style={{ background: "#fff", padding: 20 }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 24,
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ maxWidth: 280 }}>
                      <div className="pg-wordmark" style={{ fontSize: 18 }}>
                        PAINT<span className="slash">/</span>GYM
                      </div>
                      <p
                        style={{
                          fontSize: 13,
                          color: "var(--muted)",
                          marginTop: 8,
                          lineHeight: 1.5,
                        }}
                      >
                        AI ad creatives in minutes. One product link becomes a
                        wall of static ads across 35 proven concepts.
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: 40, flexWrap: "wrap" }}>
                      <FooterCol
                        title="Product"
                        links={[
                          { href: "/how-it-works", label: "How it works" },
                          { href: "/pricing", label: "Pricing" },
                          { href: "/blog", label: "Blog" },
                          { href: "/faq", label: "FAQ" },
                        ]}
                      />
                      <FooterCol title="Free tools" links={FOOTER_TOOLS} />
                      <FooterCol
                        title="Get started"
                        links={[
                          { href: "/signup", label: "Sign up" },
                          { href: "/login", label: "Log in" },
                        ]}
                      />
                    </div>
                  </div>
                </div>
                <div className="pg-land-foot">
                  PAINTGYM © 2026 · a gym for your ad creative
                </div>
              </footer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div>
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: 10,
          letterSpacing: ".12em",
          textTransform: "uppercase",
          color: "var(--muted)",
          marginBottom: 10,
        }}
      >
        {title}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {links.map((l) => (
          <Link
            key={l.href + l.label}
            href={l.href}
            style={{
              fontSize: 13,
              color: "var(--ink-2)",
              textDecoration: "none",
            }}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
