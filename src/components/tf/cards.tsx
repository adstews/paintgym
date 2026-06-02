"use client";

/* ============================================================
   Paintgym — AD CARD · WALL · REFINE panel
   Ported from the design handoff (pg-cards.jsx) to typed TSX.
   ============================================================ */
import { useState } from "react";
import { Icon, Btn, Badge, Skeleton, Stars, Chip } from "@/components/tf/ui";
import type { AdItem, Pack, Palette } from "@/lib/tf/data";

// `Pack` and `Palette` are part of the public surface of an `AdItem`
// (ad.pal is a Palette, the creative html is rendered from a Pack); they are
// re-exported as part of the typed contract for consumers of this module.
export type { Pack, Palette };

export function AdCreative({ ad }: { ad: AdItem }) {
  return (
    <div className="pg-ad" style={{ background: ad.pal.bg }}>
      <div
        className="pg-ad-creative"
        style={{ color: ad.pal.ink }}
        dangerouslySetInnerHTML={{ __html: ad.html }}
      />
    </div>
  );
}

interface AdCardProps {
  ad: AdItem;
  selected: boolean;
  compareMode: boolean;
  onOpen: (ad: AdItem) => void;
  onRate: (ad: AdItem, v: number) => void;
  onQuick: (kind: string, ad: AdItem) => void;
}

export function AdCard({ ad, selected, compareMode, onOpen, onRate, onQuick }: AdCardProps) {
  // loading skeleton card
  if (ad.status === "loading" || ad.status === "pending") {
    return (
      <div className="pg-adcard" style={{ cursor: "default" }}>
        <div className="pg-adcard-frame">
          <div className="pg-ad" style={{ background: "var(--paper)" }}>
            <div className="pg-ad-load">
              <div className="ring" />
              <div className="lbl">repping…</div>
            </div>
          </div>
          <div className="pg-ad-meta">
            <Skeleton style={{ width: "54%", height: 9 }} />
            <Skeleton style={{ width: 50, height: 9 }} />
          </div>
        </div>
      </div>
    );
  }
  if (ad.status === "error") {
    return (
      <div className="pg-adcard">
        <div className="pg-adcard-frame">
          <div className="pg-ad">
            <div className="pg-ad-err">
              <Icon name="warn" size={22} />
              <div className="lbl">rep failed</div>
              <Btn
                variant="outline"
                size="sm"
                icon="refresh"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuick("retry", ad);
                }}
                style={{ borderColor: "var(--red)", color: "var(--red)" }}
              >
                Retry
              </Btn>
            </div>
          </div>
          <div className="pg-ad-meta">
            <span className="pg-ad-fw">{ad.fw}</span>
            <Badge tone="red">error</Badge>
          </div>
        </div>
      </div>
    );
  }
  // done
  return (
    <div
      className={`pg-adcard pg-card-in ${selected ? "is-sel" : ""}`}
      onClick={() => (compareMode ? onQuick("select", ad) : onOpen(ad))}
    >
      <div className="pg-adcard-check">
        <Icon name="check" size={13} sw={3} />
      </div>
      <div className="pg-adcard-frame">
        <div style={{ position: "relative" }}>
          <AdCreative ad={ad} />
          {!compareMode && (
            <div className="pg-ad-quick">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onQuick("refine", ad);
                }}
              >
                <Icon name="sparkle" size={11} />
                Refine
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onQuick("version", ad);
                }}
              >
                <Icon name="layers" size={11} />
                Version
              </button>
            </div>
          )}
        </div>
        <div className="pg-ad-meta">
          <span className="pg-ad-fw">
            {ad.fw}
            {ad.version > 1 ? ` · v${ad.version}` : ""}
          </span>
          <Stars value={ad.rating} size={13} onChange={(v) => onRate(ad, v)} />
        </div>
      </div>
    </div>
  );
}

interface WallProps {
  ads: AdItem[];
  cols: number;
  selected: string[];
  compareMode: boolean;
  onOpen: (ad: AdItem) => void;
  onRate: (ad: AdItem, v: number) => void;
  onQuick: (kind: string, ad: AdItem) => void;
}

export function Wall({ ads, cols, selected, compareMode, onOpen, onRate, onQuick }: WallProps) {
  return (
    <div className={`pg-wall cols-${cols}`}>
      {ads.map((ad) => (
        <AdCard
          key={ad.id}
          ad={ad}
          selected={selected.includes(ad.id)}
          compareMode={compareMode}
          onOpen={onOpen}
          onRate={onRate}
          onQuick={onQuick}
        />
      ))}
    </div>
  );
}

// ---- refine bottom-sheet body ----
interface RefinePanelProps {
  ad: AdItem;
  onRate: (ad: AdItem, v: number) => void;
  onRegen: (ad: AdItem, opts: { prompt: string; tags: string[] }) => void;
  onDownload: (ad: AdItem) => void;
  onClose: () => void;
  busy: boolean;
}

export function RefinePanel({ ad, onRate, onRegen, onDownload, busy }: RefinePanelProps) {
  const [prompt, setPrompt] = useState("");
  const tags = [
    "Bigger headline",
    "More urgency",
    "Swap product shot",
    "Punchier hook",
    "Add price",
    "Less text",
    "New color",
    "Add social proof",
  ];
  const [picked, setPicked] = useState<string[]>([]);
  const toggle = (t: string) =>
    setPicked((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));
  const versions: AdItem[] = ad.history || [ad];

  return (
    <div>
      <div className="pg-refine-ad">
        <AdCreative ad={ad} />
      </div>
      <div className="pg-refine-meta">
        <Badge tone="ink">{ad.fw}</Badge>
        <Badge tone="outline">v{ad.version}</Badge>
        <Badge tone="ghost">4:5 · 1080×1350</Badge>
      </div>

      <div className="pg-refine-rate">
        <span className="lab">How&apos;s this rep?</span>
        <Stars value={ad.rating} size={26} onChange={(v) => onRate(ad, v)} />
      </div>

      {versions.length > 1 && (
        <>
          <div className="pg-div">
            <span>Version history</span>
          </div>
          <div className="pg-version-strip">
            {versions.map((v, i) => (
              <div
                key={i}
                className={`pg-vthumb ${i === versions.length - 1 ? "is-on" : ""}`}
              >
                <AdCreative ad={v} />
                <div className="vlab">v{i + 1}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="pg-div">
        <span>Refine this rep</span>
      </div>
      <div className="pg-quicktags">
        {tags.map((t) => (
          <Chip key={t} active={picked.includes(t)} onClick={() => toggle(t)}>
            {t}
          </Chip>
        ))}
      </div>
      <div style={{ marginTop: 14 }}>
        <label className="pg-field-label">Or tell it what to change</label>
        <textarea
          className="pg-input pg-textarea"
          placeholder="e.g. make the claim bolder, drop the price, warmer background…"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </div>

      <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
        <Btn variant="outline" icon="download" onClick={() => onDownload(ad)} className="pg-btn--block">
          Download
        </Btn>
        <Btn
          variant="pop"
          icon="sparkle"
          disabled={busy}
          onClick={() => onRegen(ad, { prompt, tags: picked })}
          className="pg-btn--block"
        >
          {busy ? "Repping…" : "Regenerate"}
        </Btn>
      </div>
      <div style={{ height: 8 }} />
    </div>
  );
}
