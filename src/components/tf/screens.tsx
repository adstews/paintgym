"use client";

// Training Floor screens — ported from the design handoff (pg-screens.jsx):
// Landing · NewProject (paste → scrape → form) · Dashboard · Account.
// Bespoke pg-* classes live globally; reuse the exact className strings.
import { useState, useEffect, type ReactNode } from "react";
import { Btn, IconBtn, Chip, Badge, Placeholder, Icon, Segmented } from "@/components/tf/ui";
import {
  type Pack,
  type TFProject,
  FRAMEWORKS,
  FW_CATS,
  PRODUCTS,
  defaultPack,
  generateProductPack,
} from "@/lib/tf/data";

// ---------------- LANDING ----------------
export function Landing({ onStart, onSkip }: { onStart: (u: string) => void; onSkip: () => void }) {
  const [url, setUrl] = useState("");
  const hotFw = ["One Core Idea", "Bold Claim", "Before & After", "Comparison Chart", "Meme", "Notes-app", "Chat Screenshot", "UGC Native", "Stat Drop", "Price Anchor", "Testimonial", "Tweet"];
  const go = () => onStart(url.trim() || "lumenskin.co/products/vitamin-c-serum");
  return (
    <div className="pg-scroll pg-landing">
      <div className="pg-land-nav">
        <span className="pg-wordmark">PAINT<span className="slash">/</span>GYM</span>
        <Btn variant="ghost" size="sm" onClick={onSkip}>Log in</Btn>
      </div>

      <div className="pg-hero">
        <div className="kick">35 frameworks · 4:5 ads · in minutes</div>
        <h1>BUILD<br />AD <span className="lime">VOLUME</span></h1>
        <p className="sub">Paste a product link. Paintgym trains a whole wall of ad concepts across 35 proven frameworks. Rate, refine, ship your PRs.</p>

        <div className="pg-pastebox">
          <div className="row">
            <Icon name="link" size={17} />
            <input placeholder="paste any product URL…" value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && go()} />
            <Btn variant="pop" size="sm" iconR="arrow" onClick={go}>Train</Btn>
          </div>
          <div className="hint">// no card required · 5 free reps to start</div>
        </div>

        <div className="pg-proof">
          <div className="av"><span /><span /><span /><span /></div>
          <small><b>2,400+</b> DTC founders &amp; marketers training daily</small>
        </div>
      </div>

      <div className="pg-section">
        <div className="pg-section-k"><b>How it works</b> · three reps</div>
        <div className="pg-steps">
          <div className="pg-step"><span className="num">01</span><div><h4>Paste</h4><p>Drop a product URL. We auto-pull the name, price, copy &amp; imagery.</p></div></div>
          <div className="pg-step"><span className="num">02</span><div><h4>Train</h4><p>Generate a wall of concepts across 35 frameworks &amp; formats.</p></div></div>
          <div className="pg-step"><span className="num">03</span><div><h4>Ship</h4><p>Rate, refine, version, and export high-res 4:5 ads.</p></div></div>
        </div>
      </div>

      <div className="pg-section">
        <div className="pg-section-k"><b>35 frameworks</b> · the full rack</div>
        <div className="pg-fwwall">
          {hotFw.map((f, i) => <span key={f} className={`fw ${i < 4 ? "hot" : ""}`}>{f}</span>)}
          <span className="fw">+23 more</span>
        </div>
      </div>

      <div className="pg-statband">
        <div className="big">18 ads / set</div>
        <p>One URL in. A wall of on-brand concepts out — the volume your media buyer actually needs.</p>
      </div>

      <div className="pg-land-cta">
        <h3>Stop guessing.<br />Start training.</h3>
        <div style={{ marginTop: 18 }}>
          <Btn variant="pop" icon="bolt" onClick={go} className="pg-btn--block">Start a free set</Btn>
        </div>
      </div>

      <div className="pg-land-foot">PAINTGYM © 2026 · a gym for your ad creative</div>
    </div>
  );
}

// ---------------- NEW PROJECT (paste → scrape → form) ----------------
const SCRAPE_STEPS = [
  { k: "name", label: "Product name", sub: "reading the page title" },
  { k: "price", label: "Price & offer", sub: "parsing pricing block" },
  { k: "copy", label: "Copy & claims", sub: "pulling description" },
  { k: "img", label: "Product imagery", sub: "grabbing 6 images" },
];

export type NewProjectData = {
  name: string;
  price: string;
  copy: string;
  brand: string;
  count: number;
  url: string;
  pack: Pack;
};

export function NewProject({
  initialUrl,
  onCreate,
  onCancel,
  pushToast,
}: {
  initialUrl: string;
  onCreate: (data: NewProjectData) => void;
  onCancel: () => void;
  pushToast: (msg: string, tone?: string) => void;
}) {
  const [phase, setPhase] = useState<"url" | "scrape" | "form">(initialUrl ? "scrape" : "url");
  const [url, setUrl] = useState(initialUrl || "");
  const [stepIdx, setStepIdx] = useState(0);
  const [pack, setPack] = useState<Pack | null>(null);
  const [ready, setReady] = useState(false);
  const [name, setName] = useState(PRODUCTS.lumen.name);
  const [price, setPrice] = useState(PRODUCTS.lumen.price);
  const [copy, setCopy] = useState(PRODUCTS.lumen.copy);
  const [brand, setBrand] = useState(PRODUCTS.lumen.accent as string);
  const [count, setCount] = useState(18);
  const [fwSel, setFwSel] = useState<string[]>(() => FRAMEWORKS.slice(0, 18).map((f) => f.n));
  const [cat, setCat] = useState<string>("All");

  // scrape: kick Claude + run the animation
  useEffect(() => {
    if (phase !== "scrape") return;
    setStepIdx(0); setReady(false); setPack(null);
    const clean = url.replace(/^https?:\/\//, "");
    const sample = Object.values(PRODUCTS).find((p) => p.url && clean.startsWith(p.url));
    if (sample) { setPack(sample); }
    else { generateProductPack(url).then(setPack).catch(() => setPack(defaultPack({ url: clean }))); }
    let i = 0;
    const t = setInterval(() => {
      i++; setStepIdx(i);
      if (i >= SCRAPE_STEPS.length) { clearInterval(t); setReady(true); }
    }, 600);
    return () => clearInterval(t);
  }, [phase]);

  // advance to form once both the animation AND Claude are done
  useEffect(() => {
    if (phase === "scrape" && ready && pack) {
      setName(pack.name || ""); setPrice(pack.price || "$39");
      setCopy(pack.copy || ""); setBrand(pack.accent || "#0f5c4a");
      const t = setTimeout(() => setPhase("form"), 280);
      return () => clearTimeout(t);
    }
  }, [ready, pack, phase]);

  const toggleFw = (n: string) => setFwSel((s) => s.includes(n) ? s.filter((x) => x !== n) : [...s, n]);
  const visFw = FRAMEWORKS.filter((f) => cat === "All" || f.c === cat);
  const brandSwatches = [brand, "#0f5c4a", "#e9466b", "#2b50e6", "#111", "#c2502f"].filter((c, i, a) => a.indexOf(c) === i).slice(0, 5);

  if (phase === "url") {
    return (
      <div className="pg-app">
        <div className="pg-topbar">
          <IconBtn name="back" label="Back" onClick={onCancel} />
          <span className="pg-wordmark" style={{ fontSize: 15 }}>NEW PROJECT</span>
          <span style={{ width: 44 }} />
        </div>
        <div className="pg-scroll pg-pad">
          <div className="pg-h2">Paste a<br />product URL</div>
          <p className="pg-muted" style={{ fontSize: 14, marginTop: 10 }}>We&apos;ll pull everything we need to start training.</p>
          <div className="pg-pastebox" style={{ marginTop: 22 }}>
            <div className="row">
              <Icon name="link" size={17} />
              <input placeholder="https://yourstore.com/product…" value={url}
                onChange={(e) => setUrl(e.target.value)} autoFocus />
            </div>
          </div>
          <div style={{ marginTop: 18 }}>
            <Btn variant="pop" icon="bolt" className="pg-btn--block"
              onClick={() => { setUrl(url || (PRODUCTS.lumen.url as string)); setPhase("scrape"); }}>Pull product</Btn>
          </div>
          <div className="pg-div"><span>or try a sample</span></div>
          <div className="pg-chiprow">
            {Object.values(PRODUCTS).map((p) => (
              <Chip key={p.brand} onClick={() => { setUrl(p.url as string); setPhase("scrape"); }}>{p.name}</Chip>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "scrape") {
    return (
      <div className="pg-app">
        <div className="pg-topbar">
          <span style={{ width: 44 }} />
          <span className="pg-wordmark" style={{ fontSize: 15 }}>PULLING PRODUCT</span>
          <span style={{ width: 44 }} />
        </div>
        <div className="pg-scroll pg-pad">
          <div className="pg-ws-top url" style={{ marginBottom: 4 }}>
            <span className="live" style={{ width: 6, height: 6, borderRadius: 9, background: "var(--pop-deep)", display: "inline-block", marginRight: 6 }} />
            <span className="pg-mono" style={{ fontSize: 11, color: "var(--muted)" }}>{url}</span>
          </div>
          <div className="pg-h2" style={{ marginTop: 14 }}>Reading the<br />storefront…</div>
          <div className="pg-scrape">
            {SCRAPE_STEPS.map((s, i) => {
              const st = i < stepIdx ? "done" : i === stepIdx ? "active" : "pending";
              return (
                <div key={s.k} className={`pg-scrape-row ${st}`}>
                  <div className="ic">{st === "done" ? <Icon name="check" size={14} sw={3} /> : st === "active" ? <div className="mini-ring" /> : <Icon name="link" size={13} />}</div>
                  <div className="tx">{s.label}<small>{st === "done" ? "done" : s.sub}</small></div>
                </div>
              );
            })}
            {ready && (
              <div className={`pg-scrape-row ${pack ? "done" : "active"}`}>
                <div className="ic">{pack ? <Icon name="check" size={14} sw={3} /> : <div className="mini-ring" />}</div>
                <div className="tx">Writing ad angles<small>{pack ? "done" : "thinking up hooks…"}</small></div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // form phase
  return (
    <div className="pg-app">
      <div className="pg-topbar">
        <IconBtn name="back" label="Back" onClick={onCancel} />
        <span className="pg-wordmark" style={{ fontSize: 15 }}>SET UP THE SET</span>
        <span style={{ width: 44 }} />
      </div>
      <div className="pg-scroll" style={{ padding: "16px 16px 8px" }}>
        <Badge tone="pop"><Icon name="check" size={11} sw={3} /> Product pulled</Badge>
        <div className="pg-form-card" style={{ marginTop: 12 }}>
          <div className="pg-form-row">
            <label className="pg-field-label">Product name</label>
            <input className="pg-input" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="pg-grid2">
            <div className="pg-form-row">
              <label className="pg-field-label">Price</label>
              <input className="pg-input" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="pg-form-row">
              <label className="pg-field-label">Brand color</label>
              <div className="pg-brandkit">
                {brandSwatches.map((c) => (
                  <div key={c} className={`pg-brand-sw ${brand === c ? "is-on" : ""}`} style={{ background: c }} onClick={() => setBrand(c)} />
                ))}
              </div>
            </div>
          </div>
          <div className="pg-form-row">
            <label className="pg-field-label">Key copy</label>
            <textarea className="pg-input pg-textarea" value={copy} onChange={(e) => setCopy(e.target.value)} />
          </div>
          <div>
            <label className="pg-field-label">Product imagery · 6 pulled</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 6 }}>
              {[0, 1, 2, 3, 4, 5].map((i) => <Placeholder key={i} label={i === 5 ? "+1" : ""} ratio="1/1" />)}
            </div>
          </div>
        </div>

        <div className="pg-control-block">
          <div className="lab"><span>Frameworks</span><b>{fwSel.length} selected</b></div>
          <div className="pg-chiprow mb12">
            {FW_CATS.map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}
          </div>
          <div className="pg-fwpick">
            {visFw.map((f) => <Chip key={f.n} active={fwSel.includes(f.n)} onClick={() => toggleFw(f.n)}>{f.n}</Chip>)}
          </div>
        </div>

        <div className="pg-control-block">
          <div className="lab"><span>Set size</span><b>{count} ads · {count} credits</b></div>
          <Segmented options={[{ v: 9, label: "9" }, { v: 18, label: "18" }, { v: 35, label: "Full 35" }]} value={count}
            onChange={(v) => { setCount(Number(v)); setFwSel(FRAMEWORKS.slice(0, Number(v)).map((f) => f.n)); }} />
        </div>
        <div style={{ height: 6 }} />
      </div>
      <div className="pg-dock">
        <div style={{ flex: 1 }}>
          <div className="pg-mono" style={{ fontSize: 10, color: "var(--muted)" }}>SET 01</div>
          <div className="pg-mono" style={{ fontSize: 13, fontWeight: 700 }}>{count} reps · {count} credits</div>
        </div>
        <Btn variant="pop" icon="bolt"
          onClick={() => onCreate({ name, price, copy, brand, count, url: url.replace(/^https?:\/\//, ""), pack: Object.assign({}, pack || defaultPack({}), { name, price, copy, accent: brand }) })}>
          Generate set</Btn>
      </div>
    </div>
  );
}

// ---------------- DASHBOARD ----------------
export function Dashboard({
  projects,
  onOpen,
  onNew,
  credits,
  nav,
}: {
  projects: TFProject[];
  onOpen: (p: TFProject) => void;
  onNew: () => void;
  credits: number;
  nav: ReactNode;
}) {
  return (
    <div className="pg-app">
      <div className="pg-topbar">
        <span className="pg-wordmark">PAINT<span className="slash">/</span>GYM</span>
        <span className={`pg-credits ${credits < 60 ? "low" : ""}`}><span className="coin" /><b>{credits}</b> credits</span>
      </div>
      {projects.length === 0 ? (
        <div className="pg-scroll">
          <div className="pg-empty">
            <div className="ix"><Icon name="dumbbell" size={28} /></div>
            <h3>Empty gym</h3>
            <p>No projects yet. Paste a product URL and train your first wall of ads.</p>
            <Btn variant="pop" icon="plus" onClick={onNew}>New project</Btn>
          </div>
        </div>
      ) : (
        <div className="pg-scroll">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 16px 0" }}>
            <div>
              <div className="pg-h2" style={{ fontSize: 22 }}>Your gym</div>
              <div className="pg-mono pg-muted" style={{ fontSize: 11, marginTop: 4 }}>{projects.length} projects · {projects.reduce((a, p) => a + (p.adCount || 0), 0)} ads trained</div>
            </div>
            <IconBtn name="plus" label="New" onClick={onNew} style={{ background: "var(--pop)", borderColor: "var(--ink)" }} />
          </div>
          <div className="pg-dash-grid">
            {projects.map((p) => (
              <div key={p.id} className="pg-proj" onClick={() => onOpen(p)}>
                <div className="cover">
                  {(p.preview || []).slice(0, 4).map((ad, i) => (
                    <div key={i} className="mini" style={{ background: ad.pal.bg }}>
                      <div className="pg-ad-creative" style={{ color: ad.pal.ink, transform: "scale(.86)", transformOrigin: "top left" }} dangerouslySetInnerHTML={{ __html: ad.html }} />
                    </div>
                  ))}
                </div>
                <div className="meta">
                  <h4>{p.name}</h4>
                  <div className="row">
                    <small>{p.adCount} ads</small>
                    <Badge tone="outline">{p.bestRated || 0}★ best</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {nav}
    </div>
  );
}

// ---------------- ACCOUNT ----------------
export function Account({
  credits,
  onBuy,
  onSeePlans,
  nav,
}: {
  credits: number;
  onBuy: (p: { n: string; c: number; p: string; pop?: boolean }) => void;
  onSeePlans: () => void;
  nav: ReactNode;
}) {
  const packs = [
    { n: "Starter", c: 50, p: "$39" },
    { n: "Plus", c: 110, p: "$69" },
    { n: "Pro", c: 300, p: "$149", pop: true },
    { n: "Agency", c: 750, p: "$299" },
  ];
  return (
    <div className="pg-app">
      <div className="pg-topbar">
        <span className="pg-wordmark" style={{ fontSize: 16 }}>ACCOUNT</span>
        <span style={{ width: 44 }} />
      </div>
      <div className="pg-scroll pg-pad">
        <div className="pg-acct-balance">
          <div className="l">Credit balance</div>
          <div className="n">{credits}</div>
          <div className="pg-mono" style={{ fontSize: 11, color: "rgba(255,255,255,.6)", marginTop: 6 }}>1 credit = 1 generated ad</div>
        </div>

        <div className="pg-div"><span>Top up — credit packs</span></div>
        {packs.map((p) => (
          <div key={p.n} className={`pg-pack ${p.pop ? "pop" : ""}`} onClick={() => onBuy(p)}>
            <div>
              <h4>{p.n} {p.pop && <Badge tone="pop">Best value</Badge>}</h4>
              <small>{p.c} credits · ${(parseInt(p.p.slice(1)) / p.c).toFixed(2)}/ad</small>
            </div>
            <span className="price">{p.p}</span>
          </div>
        ))}
        <Btn variant="outline" className="pg-btn--block" iconR="arrow" onClick={onSeePlans} style={{ marginTop: 4 }}>Compare all plans</Btn>

        <div className="pg-div"><span>Settings</span></div>
        <div className="pg-row-item"><Icon name="user" size={18} /><div className="tx">Profile<small>jade@everydaystudio.co</small></div><Icon name="chevR" size={16} /></div>
        <div className="pg-row-item"><Icon name="image" size={18} /><div className="tx">Brand kit<small>1 brand · Lumen</small></div><Icon name="chevR" size={16} /></div>
        <div className="pg-row-item"><Icon name="download" size={18} /><div className="tx">Export defaults<small>4:5 · PNG · high-res</small></div><Icon name="chevR" size={16} /></div>
        <div style={{ height: 20 }} />
      </div>
      {nav}
    </div>
  );
}
