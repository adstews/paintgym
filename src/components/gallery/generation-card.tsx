"use client";

import { useState } from "react";
import Image from "next/image";
import {
  CircleCheckIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
  SparklesIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RatingControls } from "./rating-controls";
import { RefineDialog } from "./refine-dialog";
import type { CSSProperties } from "react";
import type { Generation, QaStatus } from "@/lib/types";

interface Props {
  conceptName: string;
  latest: Generation;
  attempts: Generation[];
  onRegenerate: () => Promise<void>;
  onReReview: () => Promise<void>;
  onOverride: () => Promise<void>;
  onUnlock?: () => Promise<void>;
  onRatingChange: (next: Generation) => void;
  onRefined: (next: Generation, newBalance?: number) => void;
}

interface QaPresentation {
  label: string;
  Icon: typeof CircleCheckIcon;
  tone: "pass" | "warn" | "fail" | "neutral";
}

const QA_PRESENTATION: Record<QaStatus, QaPresentation> = {
  passed: { label: "QA passed", Icon: CircleCheckIcon, tone: "pass" },
  minor: { label: "Minor issues", Icon: TriangleAlertIcon, tone: "warn" },
  major: { label: "Major issues", Icon: OctagonXIcon, tone: "fail" },
  overridden: { label: "Accepted", Icon: CircleCheckIcon, tone: "pass" },
  pending: { label: "QA pending", Icon: Loader2Icon, tone: "neutral" },
  reviewing: { label: "Reviewing", Icon: Loader2Icon, tone: "neutral" },
  rewriting: { label: "Rewriting", Icon: Loader2Icon, tone: "neutral" },
};

const TONE_STYLE: Record<QaPresentation["tone"], CSSProperties> = {
  pass: { background: "var(--pop)", color: "var(--pop-ink)" },
  warn: { background: "var(--amber)", color: "#fff" },
  fail: { background: "var(--red)", color: "#fff" },
  neutral: { background: "var(--ink)", color: "#fff" },
};

const cornerBadge: CSSProperties = {
  position: "absolute",
  fontFamily: "var(--mono)",
  fontSize: 8.5,
  fontWeight: 700,
  letterSpacing: ".04em",
  textTransform: "uppercase",
  padding: "3px 6px",
  borderRadius: 2,
};

export function GenerationCard({
  conceptName,
  latest,
  attempts,
  onRegenerate,
  onReReview,
  onOverride,
  onUnlock,
  onRatingChange,
  onRefined,
}: Props) {
  const [regenLoading, setRegenLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const [showAttempts, setShowAttempts] = useState(false);
  const [open, setOpen] = useState(false);
  const [issuesOpen, setIssuesOpen] = useState(false);
  const [refineOpen, setRefineOpen] = useState(false);

  const pinned =
    pinnedId !== null ? attempts.find((a) => a.id === pinnedId) : undefined;
  const selected = pinned ?? latest;
  const isInFlight =
    selected.status === "generating" ||
    selected.qa_status === "reviewing" ||
    selected.qa_status === "rewriting";
  const presentation = QA_PRESENTATION[selected.qa_status];
  const hasIssues = selected.qa_issues && selected.qa_issues.length > 0;
  const isFlagged =
    selected.qa_status === "minor" || selected.qa_status === "major";

  async function handleRegenerate() {
    setRegenLoading(true);
    try {
      await onRegenerate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Regenerate failed");
    } finally {
      setRegenLoading(false);
    }
  }

  async function handleReReview() {
    setReviewLoading(true);
    try {
      await onReReview();
    } finally {
      setReviewLoading(false);
    }
  }

  async function handleOverride() {
    setOverrideLoading(true);
    try {
      await onOverride();
    } finally {
      setOverrideLoading(false);
    }
  }

  async function handleUnlock() {
    if (!onUnlock) return;
    setUnlockLoading(true);
    try {
      await onUnlock();
    } finally {
      setUnlockLoading(false);
    }
  }

  const displayUrl = selected.is_unlocked
    ? selected.image_url
    : (selected.watermarked_url ?? selected.image_url);

  function handleDownload() {
    if (!selected.is_unlocked) {
      toast.error("Unlock this image to download a clean copy");
      return;
    }
    if (!selected.image_url) return;
    const a = document.createElement("a");
    a.href = selected.image_url;
    a.download = `${conceptName.toLowerCase().replace(/\s+/g, "-")}-v${selected.version}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  return (
    <>
      <div className="pg-adcard pg-card-in">
        <div className="pg-adcard-frame">
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => selected.image_url && setOpen(true)}
              style={{
                display: "block",
                width: "100%",
                border: 0,
                padding: 0,
                background: "none",
                cursor: selected.image_url ? "pointer" : "default",
              }}
            >
              <div className="pg-ad" style={{ background: "var(--paper)" }}>
                {isInFlight ? (
                  <div className="pg-ad-load">
                    <div className="ring" />
                    <div className="lbl">
                      {selected.status === "generating"
                        ? "repping…"
                        : selected.qa_status === "reviewing"
                          ? "reviewing…"
                          : "rewriting…"}
                    </div>
                  </div>
                ) : displayUrl ? (
                  <Image
                    src={displayUrl}
                    alt={conceptName}
                    fill
                    sizes="(min-width:1024px) 320px, (min-width:640px) 50vw, 100vw"
                    className="object-cover"
                    unoptimized
                  />
                ) : selected.status === "failed" ? (
                  <div className="pg-ad-err">
                    <TriangleAlertIcon className="size-5" aria-hidden />
                    <div className="lbl">rep failed</div>
                  </div>
                ) : (
                  <div className="pg-ad-load">
                    <div className="lbl">pending</div>
                  </div>
                )}

                {!isInFlight && (
                  <div
                    style={{
                      ...cornerBadge,
                      ...TONE_STYLE[presentation.tone],
                      right: 6,
                      top: 6,
                      border: "1.5px solid var(--ink)",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <presentation.Icon
                      className={cn("size-3", presentation.Icon === Loader2Icon && "animate-spin")}
                    />
                    {presentation.label}
                  </div>
                )}
                {selected.is_auto_rewrite && (
                  <div style={{ ...cornerBadge, left: 6, top: 6, background: "#fff", color: "var(--ink)", border: "1px solid var(--line-2)" }}>
                    rewrite #{selected.auto_rewrite_count}
                  </div>
                )}
                {!selected.is_unlocked && selected.image_url && (
                  <div style={{ ...cornerBadge, bottom: 6, left: 6, background: "#fff", color: "var(--ink)", border: "1px solid var(--line-2)" }}>
                    watermarked
                  </div>
                )}
                {selected.is_competitive && (
                  <div style={{ ...cornerBadge, bottom: 6, right: 6, background: "var(--ink)", color: "#fff" }}>
                    vs {selected.competitor_name ?? "Competitor"}
                  </div>
                )}
              </div>
            </button>
          </div>

          <div className="pg-ad-meta">
            <span className="pg-ad-fw">
              {conceptName}
              {selected.version > 1 ? ` · v${selected.version}` : ""}
            </span>
            {selected.image_url && !isInFlight ? (
              <RatingControls generation={selected} onUpdated={onRatingChange} />
            ) : (
              attempts.length > 1 && <span className="pg-ad-ver">{attempts.length} att</span>
            )}
          </div>

          {hasIssues && (
            <div style={{ marginTop: 6 }}>
              <button
                type="button"
                onClick={() => setIssuesOpen((v) => !v)}
                className="pg-mono"
                style={{ background: "none", border: 0, cursor: "pointer", fontSize: 9.5, color: "var(--muted)", textDecoration: "underline", textUnderlineOffset: 2 }}
              >
                {issuesOpen ? "hide issues" : `issues (${selected.qa_issues.length})`}
              </button>
              {issuesOpen && (
                <ul style={{ listStyle: "none", margin: "6px 0 0", padding: 8, border: "1px solid var(--line)", background: "var(--paper)", borderRadius: 2, fontSize: 11, display: "flex", flexDirection: "column", gap: 4 }}>
                  {selected.qa_issues.map((issue, i) => (
                    <li key={i} style={{ lineHeight: 1.35 }}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
            {!selected.is_unlocked && selected.image_url && onUnlock && (
              <button className="pg-btn pg-btn--pop pg-btn--sm" onClick={handleUnlock} disabled={unlockLoading || isInFlight}>
                {unlockLoading ? "…" : "Unlock · 1cr"}
              </button>
            )}
            <button className="pg-btn pg-btn--ghost pg-btn--sm" onClick={handleDownload} disabled={!selected.image_url || !selected.is_unlocked}>
              Download
            </button>
            <button className="pg-btn pg-btn--outline pg-btn--sm" onClick={handleRegenerate} disabled={regenLoading || isInFlight}>
              {regenLoading ? "…" : "Regenerate"}
            </button>
            {selected.image_url && !isInFlight && (
              <button className="pg-btn pg-btn--outline pg-btn--sm" onClick={() => setRefineOpen(true)} style={{ gap: 5 }}>
                <SparklesIcon className="size-3.5" aria-hidden />
                Refine
              </button>
            )}
            {isFlagged && selected.image_url && (
              <>
                <button className="pg-btn pg-btn--outline pg-btn--sm" onClick={handleReReview} disabled={reviewLoading || isInFlight}>
                  {reviewLoading ? "…" : "Re-review"}
                </button>
                <button className="pg-btn pg-btn--outline pg-btn--sm" onClick={handleOverride} disabled={overrideLoading || isInFlight}>
                  {overrideLoading ? "…" : "Override"}
                </button>
              </>
            )}
          </div>

          {selected.refined_from && (
            <div className="pg-mono" style={{ marginTop: 6, fontSize: 9, color: "var(--muted)" }}>
              refined from an earlier rep
            </div>
          )}

          {attempts.length > 1 && (
            <div style={{ marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setShowAttempts((v) => !v)}
                className="pg-mono"
                style={{ background: "none", border: 0, cursor: "pointer", fontSize: 9.5, color: "var(--muted)", textDecoration: "underline", textUnderlineOffset: 2 }}
              >
                {showAttempts ? "hide attempts" : "all attempts"}
              </button>
              {showAttempts && (
                <div className="pg-version-strip" style={{ marginTop: 8 }}>
                  {attempts.map((a) => (
                    <AttemptThumb
                      key={a.id}
                      attempt={a}
                      isSelected={a.id === selected.id}
                      onClick={() => setPinnedId(a.id === latest.id ? null : a.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <RefineDialog
        open={refineOpen}
        onOpenChange={setRefineOpen}
        source={selected}
        conceptName={conceptName}
        onRefined={onRefined}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {conceptName} (v{selected.version}
              {selected.is_auto_rewrite ? `, auto-rewrite ${selected.auto_rewrite_count}` : ""})
            </DialogTitle>
          </DialogHeader>
          {displayUrl && (
            <div className="space-y-3">
              <div className="relative w-full aspect-[4/5] bg-muted rounded-md overflow-hidden">
                <Image src={displayUrl} alt={conceptName} fill className="object-contain" unoptimized />
              </div>
              {hasIssues && (
                <div className="space-y-1 rounded-md border bg-muted/50 p-2 text-xs">
                  <div className="font-medium text-muted-foreground">QA issues</div>
                  <ul className="space-y-1">
                    {selected.qa_issues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <div className="text-xs font-medium text-muted-foreground">
                  Brief used for this attempt
                </div>
                <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-2 text-xs">
                  {selected.prompt_text}
                </pre>
              </div>
              {selected.refinement_feedback && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground">
                    Feedback that produced this version
                  </div>
                  <p className="mt-1 rounded-md border bg-muted/30 p-2 text-xs">
                    {selected.refinement_feedback}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

interface ThumbProps {
  attempt: Generation;
  isSelected: boolean;
  onClick: () => void;
}

function AttemptThumb({ attempt, isSelected, onClick }: ThumbProps) {
  const presentation = QA_PRESENTATION[attempt.qa_status];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`pg-vthumb ${isSelected ? "is-on" : ""}`}
      title={`v${attempt.version} - ${presentation.label}${attempt.refined_from ? " (refined)" : ""}`}
    >
      <div className="pg-ad" style={{ background: "var(--paper)" }}>
        {attempt.image_url && (
          <Image src={attempt.image_url} alt={`v${attempt.version}`} fill sizes="46px" className="object-cover" unoptimized />
        )}
      </div>
      <div className="vlab">v{attempt.version}</div>
    </button>
  );
}
