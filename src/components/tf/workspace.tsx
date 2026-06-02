"use client";

/* ============================================================
   Paintgym — WORKSPACE (Generate · Competitor Spy · Recreate)
   Ported from the design handoff (pg-workspace.jsx) to typed TSX.
   ============================================================ */
import { useState } from "react";
import { Btn, IconBtn, Chip, Segmented, Badge, Icon } from "@/components/tf/ui";
import { AdCreative, AdCard, Wall } from "@/components/tf/cards";
import type { AdItem, TFProject } from "@/lib/tf/data";

export interface WorkspaceProps {
  project: TFProject;
  credits: number;
  tab: "gen" | "spy" | "recreate";
  setTab: (t: "gen" | "spy" | "recreate") => void;
  ads: AdItem[];
  generating: boolean;
  doneCount: number;
  total: number;
  cols: number;
  setCols: (c: number) => void;
  fwFilter: string;
  setFwFilter: (f: string) => void;
  compareMode: boolean;
  setCompareMode: (b: boolean) => void;
  selected: string[];
  onClearCompare: () => void;
  onCompareOpen: () => void;
  onBack: () => void;
  onGenerate: () => void;
  onDownloadSet: () => void;
  onOpen: (ad: AdItem) => void;
  onRate: (ad: AdItem, v: number) => void;
  onQuick: (kind: string, ad: AdItem) => void;
  spying: boolean;
  spyAds: AdItem[];
  onSpy: (url: string) => void;
  recreating: boolean;
  recreateResult: AdItem[] | null;
  onRecreate: () => void;
}

function WsEmpty({ onGenerate }: { onGenerate: () => void }) {
  return (
    <div className="pg-empty" style={{ paddingTop: 48 }}>
      <div className="ix"><Icon name="grid" size={26} /></div>
      <h3>Empty wall</h3>
      <p>No reps yet. Generate your first set and the wall fills in live.</p>
      <Btn variant="pop" icon="bolt" onClick={onGenerate}>Generate first set</Btn>
    </div>
  );
}

type GenerateTabProps = Pick<
  WorkspaceProps,
  | "project"
  | "ads"
  | "generating"
  | "doneCount"
  | "total"
  | "cols"
  | "setCols"
  | "fwFilter"
  | "setFwFilter"
  | "selected"
  | "compareMode"
  | "setCompareMode"
  | "onOpen"
  | "onRate"
  | "onQuick"
  | "onGenerate"
  | "onDownloadSet"
>;

function GenerateTab({ project, ads, generating, doneCount, total, cols, setCols, fwFilter, setFwFilter,
  selected, compareMode, setCompareMode, onOpen, onRate, onQuick, onGenerate, onDownloadSet }: GenerateTabProps) {
  const cats = ["All", ...Array.from(new Set(ads.map(a => a.cat)))];
  const filtered = fwFilter === "All" ? ads : ads.filter(a => a.cat === fwFilter);

  if (ads.length === 0 && !generating) return <WsEmpty onGenerate={onGenerate} />;

  return (
    <>
      <div className="pg-ws-controls">
        {cats.map(c => <Chip key={c} active={fwFilter === c} onClick={() => setFwFilter(c)}>{c}</Chip>)}
        <span style={{ flex: 1 }} />
        <IconBtn name="eye" size={16} label="Compare"
          onClick={() => setCompareMode(!compareMode)}
          style={{ flex: "0 0 auto", width: 38, height: 38, background: compareMode ? "var(--pop)" : "var(--paper)", borderColor: "var(--ink)" }} />
        <IconBtn name="grid" size={16} label="Columns"
          onClick={() => setCols(cols === 2 ? 1 : 2)}
          style={{ flex: "0 0 auto", width: 38, height: 38 }} />
      </div>
      <div className="pg-genline">
        <span className="l">The wall · <b>SET {project.set || "01"}</b> · {generating ? "training…" : `${doneCount}/${total} reps`}</span>
        {generating
          ? <span className="l"><b>{doneCount}</b>/{total}</span>
          : <button className="pg-dl-btn" onClick={onDownloadSet}><Icon name="download" size={13} />Download set</button>}
      </div>
      <Wall ads={filtered} cols={cols} selected={selected} compareMode={compareMode}
        onOpen={onOpen} onRate={onRate} onQuick={onQuick} />
      <div style={{ height: 12 }} />
    </>
  );
}

type SpyTabProps = Pick<WorkspaceProps, "onSpy" | "spying" | "spyAds" | "onQuick">;

function SpyTab({ onSpy, spying, spyAds, onQuick }: SpyTabProps) {
  const [url, setUrl] = useState("");
  return (
    <div className="pg-pad" style={{ paddingTop: 16 }}>
      <div className="pg-mono pg-muted" style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>// spy on a competitor&apos;s live ads</div>
      <div className="pg-pastebox">
        <div className="row">
          <Icon name="target" size={17} />
          <input placeholder="competitor URL or @handle…" value={url} onChange={(e) => setUrl(e.target.value)} />
          <Btn variant="pop" size="sm" iconR="arrow" onClick={() => onSpy(url)}>Spy</Btn>
        </div>
        <div className="hint">// pulls their active Meta ads · recreate any in your brand</div>
      </div>

      {spying && (
        <div className="pg-scrape" style={{ marginTop: 18 }}>
          <div className="pg-scrape-row active"><div className="ic"><div className="mini-ring" /></div><div className="tx">Scanning ad library<small>finding active creatives</small></div></div>
        </div>
      )}

      {!spying && spyAds.length === 0 && (
        <div className="pg-empty" style={{ paddingTop: 40 }}>
          <div className="ix"><Icon name="eye" size={24} /></div>
          <h3>See their playbook</h3>
          <p>Paste a competitor and pull the ads they&apos;re actively running — then recreate the winners.</p>
        </div>
      )}

      {!spying && spyAds.length > 0 && (
        <>
          <div className="pg-genline" style={{ padding: "16px 0 4px" }}>
            <span className="l"><b>{spyAds.length}</b> live competitor ads</span>
          </div>
          <div className="pg-wall cols-2" style={{ padding: "4px 0 16px" }}>
            {spyAds.map(ad => (
              <div key={ad.id} className="pg-adcard">
                <div className="pg-adcard-frame">
                  <div style={{ position: "relative" }}>
                    <AdCreative ad={ad} />
                    <div className="pg-ad-quick" style={{ opacity: 1 }}>
                      <button onClick={() => onQuick("recreate", ad)}><Icon name="wand" size={11} />Recreate</button>
                    </div>
                  </div>
                  <div className="pg-ad-meta"><span className="pg-ad-fw">competitor · running</span><Badge tone="outline">live</Badge></div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

type RecreateTabProps = {
  onRecreate: () => void;
  recreating: boolean;
  result: AdItem[] | null;
  onOpen: (ad: AdItem) => void;
};

function RecreateTab({ onRecreate, recreating, result, onOpen }: RecreateTabProps) {
  return (
    <div className="pg-pad" style={{ paddingTop: 16 }}>
      <div className="pg-mono pg-muted" style={{ fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 10 }}>// recreate from an example you love</div>
      <div style={{ border: "1.5px dashed var(--ink)", borderRadius: 4, padding: 24, textAlign: "center", background: "#fff" }}>
        <div style={{ width: 46, height: 46, margin: "0 auto 12px", border: "1.5px solid var(--ink)", borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="image" size={20} />
        </div>
        <div style={{ fontFamily: "var(--headline)", fontWeight: 800, fontSize: 15 }}>Drop an example ad</div>
        <p className="pg-muted" style={{ fontSize: 12.5, margin: "4px auto 14px", maxWidth: "26ch" }}>Upload a screenshot or paste a link. We rebuild its structure with your product.</p>
        <Btn variant="outline" icon="plus" onClick={() => onRecreate()}>Upload example</Btn>
      </div>

      {recreating && (
        <div className="pg-scrape" style={{ marginTop: 18 }}>
          <div className="pg-scrape-row done"><div className="ic"><Icon name="check" size={14} sw={3} /></div><div className="tx">Read the layout<small>headline · product · CTA</small></div></div>
          <div className="pg-scrape-row active"><div className="ic"><div className="mini-ring" /></div><div className="tx">Rebuilding with Lumen<small>swapping copy &amp; imagery</small></div></div>
        </div>
      )}

      {result && !recreating && (
        <>
          <div className="pg-div"><span>Recreated · 3 takes</span></div>
          <div className="pg-wall cols-2" style={{ padding: 0 }}>
            {result.map(ad => (
              <AdCard key={ad.id} ad={ad} selected={false} compareMode={false}
                onOpen={onOpen} onRate={() => { }} onQuick={() => { }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function Workspace(props: WorkspaceProps) {
  const { project, tab, setTab, onBack, credits, generating, ads, doneCount, total,
    compareMode, selected, onClearCompare, onCompareOpen, onGenerate } = props;

  return (
    <div className="pg-app">
      {/* header */}
      <div className="pg-ws-head">
        <div className="pg-ws-top">
          <IconBtn name="back" label="Back" onClick={onBack} style={{ width: 38, height: 38, flex: "0 0 auto" }} />
          <span className="url"><span className="live" /><span>{project.url}</span></span>
          <span className={`pg-credits ${credits < 60 ? "low" : ""}`} style={{ flex: "0 0 auto" }}><span className="coin" /><b>{credits}</b></span>
        </div>
        <div className="pg-ws-title">
          <h2>{project.name}</h2>
        </div>
        <div className="pg-ws-stats">
          <span className="pg-pricepill">{project.price}</span>
          <span className="pg-ws-stat"><b>35</b> frameworks</span>
          <span className="pg-ws-stat"><b>{doneCount}</b> trained</span>
          {project.brand && <span className="pg-brand-sw" style={{ background: project.brand, width: 18, height: 18 }} />}
        </div>
        <div className="pg-ws-tabs">
          <Segmented value={tab} onChange={(v) => setTab(v as "gen" | "spy" | "recreate")}
            options={[{ v: "gen", label: "Generate", icon: "grid" }, { v: "spy", label: "Spy", icon: "target" }, { v: "recreate", label: "Recreate", icon: "wand" }]} />
        </div>
      </div>

      {/* body */}
      <div className="pg-scroll" style={{ position: "relative" }}>
        {tab === "gen" && <GenerateTab {...props} />}
        {tab === "spy" && <SpyTab spying={props.spying} spyAds={props.spyAds} onSpy={props.onSpy} onQuick={props.onQuick} />}
        {tab === "recreate" && <RecreateTab recreating={props.recreating} result={props.recreateResult} onRecreate={props.onRecreate} onOpen={props.onOpen} />}
      </div>

      {/* dock / compare bar */}
      {compareMode ? (
        <div className="pg-dock">
          <span className="pg-mono" style={{ fontSize: 12 }}><b style={{ color: "var(--ink)" }}>{selected.length}</b> <span className="pg-muted">selected to compare</span></span>
          <span style={{ flex: 1 }} />
          <Btn variant="ghost" size="sm" onClick={onClearCompare}>Cancel</Btn>
          <Btn variant="pop" size="sm" icon="eye" disabled={selected.length < 2} onClick={onCompareOpen}>Compare {selected.length}</Btn>
        </div>
      ) : tab === "gen" && ads.length > 0 ? (
        <div className="pg-dock">
          <IconBtn name="sliders" label="Set options" />
          <Btn variant="pop" icon="bolt" className="pg-btn--block" disabled={generating} onClick={onGenerate}>
            {generating ? "Training…" : "Generate next set"}
          </Btn>
        </div>
      ) : null}
    </div>
  );
}
