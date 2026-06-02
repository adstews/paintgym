"use client";

/* ============================================================
   Paintgym — MARKETING: Pricing · Auth
   ============================================================ */
import { useState } from "react";
import { Btn, IconBtn, Badge, Icon } from "@/components/tf/ui";

type Pack = {
  n: string;
  c: number;
  p: number;
  pop?: boolean;
  blurb: string;
  feats: string[];
};

export const CREDIT_PACKS: Pack[] = [
  { n: "Starter", c: 50, p: 39, blurb: "Test the waters", feats: ["50 ad credits", "All 35 frameworks", "4:5 high-res export"] },
  { n: "Plus", c: 110, p: 69, blurb: "For steady testing", feats: ["110 ad credits", "Competitor Spy", "Recreate-from-example"] },
  { n: "Pro", c: 300, p: 149, pop: true, blurb: "Most popular", feats: ["300 ad credits", "Brand kits", "Priority generation", "Version history"] },
  { n: "Agency", c: 750, p: 299, blurb: "Volume for clients", feats: ["750 ad credits", "Multiple brands", "Team seats", "White-label export"] },
];

export function Pricing({
  onBuy,
  onBack,
  credits,
  reason,
}: {
  onBuy: (pk: Pack) => void;
  onBack: () => void;
  credits: number;
  reason?: string;
}) {
  return (
    <div className="pg-app">
      <div className="pg-topbar">
        <IconBtn name="back" label="Back" onClick={onBack} />
        <span className="pg-wordmark" style={{ fontSize: 15 }}>PRICING</span>
        <span className={`pg-credits ${credits < 60 ? "low" : ""}`}><span className="coin" /><b>{credits}</b></span>
      </div>
      <div className="pg-scroll">
        <div className="pg-pad" style={{ paddingBottom: 6 }}>
          {reason && (
            <div className="pg-pricing-flag">
              <Icon name="bolt" size={15} /><span>{reason}</span>
            </div>
          )}
          <div className="pg-hero" style={{ padding: "10px 0 0" }}>
            <div className="kick">credit packs · no subscription</div>
            <h1 style={{ fontSize: "clamp(38px,11vw,50px)" }}>TRAIN MORE.<br /><span className="lime">PAY LESS.</span></h1>
            <p className="sub" style={{ marginTop: 14 }}>1 credit = 1 generated ad. Buy a pack, train at volume, top up whenever. Credits never expire.</p>
          </div>
        </div>

        <div className="pg-pricecards">
          {CREDIT_PACKS.map((pk) => (
            <div key={pk.n} className={`pg-pricecard ${pk.pop ? "pop" : ""}`}>
              <div className="pc-top">
                <div>
                  <div className="pc-name">{pk.n} {pk.pop && <Badge tone="pop">Best value</Badge>}</div>
                  <div className="pc-blurb">{pk.blurb}</div>
                </div>
                <div className="pc-price">
                  <span className="amt">${pk.p}</span>
                  <span className="per">${(pk.p / pk.c).toFixed(2)}/ad</span>
                </div>
              </div>
              <div className="pc-credits"><b>{pk.c}</b> credits</div>
              <ul className="pc-feats">
                {pk.feats.map((f) => <li key={f}><Icon name="check" size={13} sw={3} />{f}</li>)}
              </ul>
              <Btn variant={pk.pop ? "pop" : "outline"} className="pg-btn--block" icon={pk.pop ? "bolt" : undefined}
                onClick={() => onBuy(pk)}>Buy {pk.n}</Btn>
            </div>
          ))}
        </div>

        <div className="pg-section" style={{ paddingTop: 28 }}>
          <div className="pg-section-k"><b>Common questions</b></div>
          <div className="pg-faq">
            {([
              ["Do credits expire?", "Never. Buy once, use whenever — no monthly reset."],
              ["What's a credit?", "One credit generates one 4:5 ad. Refining or versioning a rep also costs one."],
              ["Can I download everything?", "Yes — every ad exports as a high-res 1080×1350 PNG. Bulk export is one tap."],
              ["Refunds?", "Unused packs are refundable within 14 days, no questions."],
            ] as const).map(([q, a]) => (
              <div key={q} className="pg-faq-row">
                <div className="q">{q}</div>
                <div className="a">{a}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="pg-land-foot">PAINTGYM © 2026 · credits never expire</div>
      </div>
    </div>
  );
}

export function Auth({
  mode,
  onAuth,
  onSwitch,
  onBack,
}: {
  mode: "login" | "signup";
  onAuth: () => void;
  onSwitch: () => void;
  onBack: () => void;
}) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const signup = mode === "signup";
  return (
    <div className="pg-app">
      <div className="pg-topbar">
        <IconBtn name="back" label="Back" onClick={onBack} />
        <span className="pg-wordmark">PAINT<span className="slash">/</span>GYM</span>
        <span style={{ width: 44 }} />
      </div>
      <div className="pg-scroll pg-pad" style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ marginTop: 18 }}>
          <div className="kick pg-mono" style={{ fontSize: 10.5, letterSpacing: ".12em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 22, height: 1.5, background: "var(--ink)" }} />{signup ? "5 free reps · no card" : "welcome back"}
          </div>
          <div className="pg-h2" style={{ fontSize: 34 }}>{signup ? <>Start<br />training.</> : <>Back on<br />the floor.</>}</div>
        </div>

        <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label className="pg-field-label">Email</label>
            <input className="pg-input" type="email" placeholder="you@brand.co" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="pg-field-label">Password</label>
            <input className="pg-input" type="password" placeholder="••••••••" value={pw} onChange={(e) => setPw(e.target.value)} />
          </div>
          {!signup && <a className="pg-mono" style={{ fontSize: 11, color: "var(--muted)", alignSelf: "flex-end", textDecoration: "underline", cursor: "pointer" }}>forgot password?</a>}
        </div>

        <div style={{ marginTop: 22 }}>
          <Btn variant="pop" icon="bolt" className="pg-btn--block" onClick={() => onAuth()}>
            {signup ? "Create account" : "Log in"}</Btn>
        </div>

        <div className="pg-div" style={{ marginTop: 22 }}><span>or</span></div>
        <Btn variant="outline" className="pg-btn--block" onClick={() => onAuth()}>Continue with Google</Btn>

        <div style={{ marginTop: "auto", paddingTop: 26, textAlign: "center" }}>
          <span className="pg-mono" style={{ fontSize: 12, color: "var(--muted)" }}>
            {signup ? "Already training? " : "New here? "}
            <a style={{ color: "var(--ink)", textDecoration: "underline", cursor: "pointer", fontWeight: 700 }}
              onClick={onSwitch}>{signup ? "Log in" : "Create an account"}</a>
          </span>
        </div>
        <div style={{ height: 12 }} />
      </div>
    </div>
  );
}
