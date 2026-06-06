"use client";

// Training Floor pricing, ported from the design handoff. (The mock Auth screen
// was removed with the /tf preview; the real app uses tf-auth-form.tsx with
// real Supabase auth.)
import { Btn, IconBtn, Badge, Icon } from "@/components/tf/ui";
import { CREDIT_PACKS, type Pack } from "@/content/credit-packs";

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
        {credits > 0 ? (
          <span className={`pg-credits ${credits < 60 ? "low" : ""}`}><span className="coin" /><b>{credits}</b></span>
        ) : (
          <span style={{ width: 44 }} />
        )}
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
            <p className="sub" style={{ marginTop: 14 }}>Free to write briefs. Credits are required for image generation. 1 credit = 1 generated ad, screenshot concepts render free. Buy a pack, top up whenever, credits never expire.</p>
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
