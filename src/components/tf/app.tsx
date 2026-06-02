"use client";

// Training Floor — App state machine, generation engine, shell.
// Ported from the design handoff (pg-app.jsx). This is a self-contained
// client app that drives the whole redesign for preview.
//
// TODO(production): replace the local/mock state + timers with the real
// backend — Supabase auth, /api/scrape + /api/generate-briefs, /api/generate
// (real Gemini images), /api/refine, /api/competitor-spy, /api/recreate, and
// real credits. The screens + look are final; the data layer is the next wire-up.
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Icon, Sheet, ToastHost, Btn, Stars, type Toast } from "@/components/tf/ui";
import {
  makeSet,
  defaultPack,
  PRODUCTS,
  PALETTES,
  LAYOUTS,
  type AdItem,
  type TFProject,
} from "@/lib/tf/data";
import { AdCreative, RefinePanel } from "@/components/tf/cards";
import { Landing, NewProject, Dashboard, Account, type NewProjectData } from "@/components/tf/screens";
import { Pricing, Auth } from "@/components/tf/marketing";
import { Workspace } from "@/components/tf/workspace";

type View =
  | "landing"
  | "login"
  | "signup"
  | "pricing"
  | "new"
  | "workspace"
  | "home"
  | "account";

function StatusBar() {
  return (
    <div className="pg-status">
      <span>9:41</span>
      <span className="sb-r">
        <span className="bar">
          <i style={{ height: 4 }} />
          <i style={{ height: 6 }} />
          <i style={{ height: 8 }} />
          <i />
        </span>
        <span style={{ fontFamily: "var(--mono)", fontSize: 11 }}>5G</span>
        <span className="bat" />
      </span>
    </div>
  );
}

function BottomNav({ view, go, onNew }: { view: View; go: (v: View) => void; onNew: () => void }) {
  return (
    <div className="pg-bottomnav">
      <button className={`pg-navtab ${view === "home" ? "is-on" : ""}`} onClick={() => go("home")}>
        <span className="dot" />
        <Icon name="home" size={20} />
        Gym
      </button>
      <div className="pg-navtab pg-navtab--fab">
        <button className="pg-fab" onClick={onNew}>
          <Icon name="plus" size={24} sw={2.4} />
        </button>
      </div>
      <button className={`pg-navtab ${view === "account" ? "is-on" : ""}`} onClick={() => go("account")}>
        <span className="dot" />
        <Icon name="user" size={20} />
        Account
      </button>
    </div>
  );
}

function DeskSidebar({
  view,
  go,
  onNew,
  credits,
  onPricing,
}: {
  view: View;
  go: (v: View) => void;
  onNew: () => void;
  credits: number;
  onPricing: () => void;
}) {
  const items: { v: View; label: string; icon: string }[] = [
    { v: "home", label: "Gym", icon: "home" },
    { v: "account", label: "Account", icon: "user" },
    { v: "pricing", label: "Pricing", icon: "bolt" },
  ];
  return (
    <aside className="pg-deskside">
      <div className="pg-side-mark">
        PAINT<span className="slash">/</span>GYM
      </div>
      <button className="pg-side-new" onClick={onNew}>
        <Icon name="plus" size={18} sw={2.4} />
        New project
      </button>
      <nav className="pg-side-nav">
        {items.map((it) => (
          <button
            key={it.v}
            className={`pg-side-link ${view === it.v ? "is-on" : ""}`}
            onClick={() => (it.v === "pricing" ? onPricing() : go(it.v))}
          >
            <Icon name={it.icon} size={18} />
            {it.label}
          </button>
        ))}
      </nav>
      <div className="pg-side-foot">
        <div className={`pg-side-credits ${credits < 60 ? "low" : ""}`} onClick={onPricing}>
          <div className="cc">
            <span className="coin" />
            <b>{credits}</b> credits
          </div>
          <span className="buy">Top up →</span>
        </div>
        <div className="pg-side-user">
          <div className="av" />
          <div>
            <b>jade</b>
            <small>everydaystudio.co</small>
          </div>
        </div>
      </div>
    </aside>
  );
}

export function TrainingFloorApp() {
  const [view, setView] = useState<View>("landing");
  const [projects, setProjects] = useState<TFProject[]>([]);
  const [active, setActive] = useState<TFProject | null>(null);
  const [ads, setAds] = useState<AdItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [credits, setCredits] = useState(248);
  const [startUrl, setStartUrl] = useState("");

  const [wsTab, setWsTab] = useState<"gen" | "spy" | "recreate">("gen");
  const [cols, setCols] = useState<number>(() =>
    typeof window !== "undefined" && window.matchMedia("(min-width:1000px)").matches ? 3 : 2,
  );
  const [fwFilter, setFwFilter] = useState("All");
  const [wide, setWide] = useState<boolean>(
    () => typeof window !== "undefined" && window.matchMedia("(min-width:1000px)").matches,
  );
  useEffect(() => {
    const m = window.matchMedia("(min-width:1000px)");
    const h = (e: MediaQueryListEvent) => {
      setWide(e.matches);
      setCols(e.matches ? 3 : 2);
    };
    m.addEventListener("change", h);
    return () => m.removeEventListener("change", h);
  }, []);

  const [compareMode, setCompareMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);

  const [refineAd, setRefineAd] = useState<AdItem | null>(null);
  const [refineBusy, setRefineBusy] = useState(false);

  const [spying, setSpying] = useState(false);
  const [spyAds, setSpyAds] = useState<AdItem[]>([]);
  const [recreating, setRecreating] = useState(false);
  const [recreateResult, setRecreateResult] = useState<AdItem[] | null>(null);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [pricingFrom, setPricingFrom] = useState<View>("home");
  const [pricingReason, setPricingReason] = useState("");
  const toast = useCallback((msg: string, tone?: Toast["tone"]) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((t) => [...t, { id, msg, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2400);
  }, []);

  const doneCount = ads.filter((a) => a.status === "done").length;

  const runGeneration = useCallback(
    (product: ReturnType<typeof defaultPack>, count: number, startFrom: number, prepend: boolean) => {
      const fresh = makeSet(product, count, startFrom).map((a) => ({ ...a, status: "loading" as const }));
      setAds((prev) => (prepend ? [...fresh, ...prev] : fresh));
      setGenerating(true);
      setCredits((c) => Math.max(0, c - count));
      fresh.forEach((ad, i) => {
        setTimeout(() => {
          const fail = i > 1 && Math.random() < 0.05;
          setAds((prev) =>
            prev.map((x) => (x.id === ad.id ? { ...x, status: fail ? "error" : "done" } : x)),
          );
          if (i === fresh.length - 1) setGenerating(false);
        }, 480 + i * 360);
      });
      return fresh;
    },
    [],
  );

  const createProject = (data: NewProjectData) => {
    const product = data.pack || defaultPack({ name: data.name, price: data.price, accent: data.brand });
    const proj: TFProject = {
      id: "p-" + Math.random().toString(36).slice(2),
      name: data.name,
      url: data.url,
      price: data.price,
      brand: data.brand,
      product,
      set: "01",
    };
    setActive(proj);
    setView("workspace");
    setWsTab("gen");
    setFwFilter("All");
    const fresh = runGeneration(product, data.count, 0, false);
    setTimeout(() => {
      setProjects((ps) => {
        if (ps.find((p) => p.id === proj.id)) return ps;
        return [
          { ...proj, adCount: data.count, bestRated: 0, preview: fresh.map((a) => ({ ...a, status: "done" as const })) },
          ...ps,
        ];
      });
    }, 600);
    toast(`Training ${data.count} reps…`);
  };

  const openProject = (p: TFProject) => {
    setActive(p);
    setView("workspace");
    setWsTab("gen");
    setFwFilter("All");
    const seed = makeSet(p.product || PRODUCTS.lumen, p.adCount || 12, 0).map((a) => ({ ...a, status: "done" as const }));
    setAds(seed);
  };

  const rate = (ad: AdItem, v: number) => {
    setAds((prev) => prev.map((x) => (x.id === ad.id ? { ...x, rating: v } : x)));
    if (refineAd && refineAd.id === ad.id) setRefineAd((r) => (r ? { ...r, rating: v } : r));
  };

  const regenerate = (ad: AdItem) => {
    setRefineBusy(true);
    setTimeout(() => {
      const prod = active?.product || PRODUCTS.lumen;
      const newPal = PALETTES[(PALETTES.indexOf(ad.pal) + 3 + PALETTES.length) % PALETTES.length];
      const nextHtml = LAYOUTS[ad.layout](prod, newPal);
      setAds((prev) =>
        prev.map((x) => {
          if (x.id !== ad.id) return x;
          const hist = (x.history || [x]).concat();
          const updated: AdItem = { ...x, pal: newPal, html: nextHtml, version: x.version + 1, status: "done" };
          updated.history = [...hist, { ...updated }];
          return updated;
        }),
      );
      setRefineBusy(false);
      setRefineAd((r) => {
        if (!r || r.id !== ad.id) return r;
        const hist = r.history || [r];
        const updated: AdItem = { ...r, pal: newPal, html: nextHtml, version: r.version + 1 };
        updated.history = [...hist, { ...updated }];
        return updated;
      });
    }, 1100);
  };

  const quick = (kind: string, ad: AdItem) => {
    if (kind === "refine") {
      setRefineAd({ ...ad, history: ad.history || [ad] });
    } else if (kind === "version") {
      regenerate(ad);
      toast("New version queued", "ok");
    } else if (kind === "retry") {
      setAds((prev) => prev.map((x) => (x.id === ad.id ? { ...x, status: "loading" } : x)));
      setTimeout(
        () => setAds((prev) => prev.map((x) => (x.id === ad.id ? { ...x, status: "done" } : x))),
        900,
      );
    } else if (kind === "select") {
      setSelected((s) => (s.includes(ad.id) ? s.filter((x) => x !== ad.id) : s.length < 4 ? [...s, ad.id] : s));
    } else if (kind === "recreate") {
      startRecreate();
    }
  };

  const runSpy = (url: string) => {
    if (!url) {
      toast("Paste a competitor URL", "err");
      return;
    }
    setSpying(true);
    setSpyAds([]);
    setTimeout(() => {
      setSpyAds(makeSet(PRODUCTS.drift, 4, 6).map((a) => ({ ...a, status: "done" as const })));
      setSpying(false);
    }, 1600);
  };

  const startRecreate = () => {
    setWsTab("recreate");
    setRecreating(true);
    setRecreateResult(null);
    setTimeout(() => {
      setRecreateResult(makeSet(active?.product || PRODUCTS.lumen, 3, 10).map((a) => ({ ...a, status: "done" as const })));
      setRecreating(false);
      toast("Recreated 3 takes", "ok");
    }, 2000);
  };

  const download = () => toast("Saved 1080×1350 PNG", "ok");
  const buy = (pack: { c: number }) => {
    setCredits((c) => c + pack.c);
    toast(`+${pack.c} credits added`, "ok");
  };
  const openPricing = (reason: string) => {
    setPricingReason(reason || "");
    setPricingFrom(view);
    setView("pricing");
  };
  const buyFromPricing = (pack: { c: number }) => {
    setCredits((c) => c + pack.c);
    toast(`+${pack.c} credits added`, "ok");
    setView(pricingFrom || "home");
  };
  const clearCompare = () => {
    setCompareMode(false);
    setSelected([]);
  };

  const compareAds = ads.filter((a) => selected.includes(a.id));

  let screen: ReactNode;
  if (view === "landing") {
    screen = (
      <Landing
        onStart={(u) => {
          setStartUrl(u);
          setView("new");
        }}
        onSkip={() => setView("login")}
      />
    );
  } else if (view === "login" || view === "signup") {
    screen = (
      <Auth
        mode={view}
        onAuth={() => setView("home")}
        onSwitch={() => setView(view === "login" ? "signup" : "login")}
        onBack={() => setView("landing")}
      />
    );
  } else if (view === "pricing") {
    screen = (
      <Pricing
        credits={credits}
        reason={pricingReason}
        onBuy={buyFromPricing}
        onBack={() => setView(pricingFrom || "home")}
      />
    );
  } else if (view === "new") {
    screen = (
      <NewProject
        initialUrl={startUrl}
        onCreate={createProject}
        onCancel={() => setView(projects.length ? "home" : "landing")}
        pushToast={(msg, tone) => toast(msg, tone as Toast["tone"])}
      />
    );
  } else if (view === "workspace" && active) {
    screen = (
      <Workspace
        project={active}
        credits={credits}
        tab={wsTab}
        setTab={setWsTab}
        ads={ads}
        generating={generating}
        doneCount={doneCount}
        total={ads.length}
        cols={cols}
        setCols={setCols}
        fwFilter={fwFilter}
        setFwFilter={setFwFilter}
        compareMode={compareMode}
        setCompareMode={setCompareMode}
        selected={selected}
        onClearCompare={clearCompare}
        onCompareOpen={() => setCompareOpen(true)}
        onBack={() => setView("home")}
        onGenerate={() => runGeneration(active.product, 9, ads.length, true)}
        onDownloadSet={() => openPricing("Buy credits to export your full set in high-res")}
        onOpen={(ad) => setRefineAd({ ...ad, history: ad.history || [ad] })}
        onRate={rate}
        onQuick={quick}
        spying={spying}
        spyAds={spyAds}
        onSpy={runSpy}
        recreating={recreating}
        recreateResult={recreateResult}
        onRecreate={startRecreate}
      />
    );
  } else {
    const navEl = <BottomNav view={view} go={setView} onNew={() => setView("new")} />;
    screen =
      view === "account" ? (
        <Account credits={credits} onBuy={buy} onSeePlans={() => openPricing("")} nav={navEl} />
      ) : (
        <Dashboard projects={projects} credits={credits} onOpen={openProject} onNew={() => setView("new")} nav={navEl} />
      );
  }

  const showSidebar = wide && !["landing", "login", "signup"].includes(view);
  return (
    <div className={`pg-stage ${showSidebar ? "has-side" : ""}`}>
      {showSidebar && (
        <DeskSidebar view={view} go={setView} onNew={() => setView("new")} credits={credits} onPricing={() => openPricing("")} />
      )}
      <div className="pg-phone">
        <div className="pg-screen">
          <div className="pg-app">
            <StatusBar />
            <div
              className={"pg-viewport pg-view-" + view}
              style={{ flex: 1, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column" }}
            >
              {screen}
            </div>
          </div>

          <Sheet open={!!refineAd} onClose={() => setRefineAd(null)} title={refineAd ? refineAd.fw : ""} tall>
            {refineAd && (
              <RefinePanel
                ad={refineAd}
                busy={refineBusy}
                onRate={rate}
                onRegen={(ad) => regenerate(ad)}
                onDownload={download}
                onClose={() => setRefineAd(null)}
              />
            )}
          </Sheet>

          <Sheet open={compareOpen} onClose={() => setCompareOpen(false)} title="Compare reps" tall>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: compareAds.length > 2 ? "1fr 1fr" : `repeat(${compareAds.length || 1},1fr)`,
                gap: 10,
              }}
            >
              {compareAds.map((ad) => (
                <div key={ad.id}>
                  <div style={{ border: "1.5px solid var(--ink)", boxShadow: "var(--shadow-sm)" }}>
                    <AdCreative ad={ad} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 7 }}>
                    <span className="pg-ad-fw">{ad.fw}</span>
                    <Stars value={ad.rating} size={13} onChange={(v) => rate(ad, v)} />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16 }}>
              <Btn
                variant="pop"
                icon="download"
                className="pg-btn--block"
                onClick={() => {
                  toast("Exported selected ads", "ok");
                  setCompareOpen(false);
                  clearCompare();
                }}
              >
                Export selected
              </Btn>
            </div>
          </Sheet>

          <ToastHost toasts={toasts} />
        </div>
      </div>
    </div>
  );
}
