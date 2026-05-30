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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { RatingControls } from "./rating-controls";
import { RefineDialog } from "./refine-dialog";
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
  overridden: { label: "Accepted by you", Icon: CircleCheckIcon, tone: "pass" },
  pending: { label: "QA pending", Icon: Loader2Icon, tone: "neutral" },
  reviewing: { label: "Reviewing...", Icon: Loader2Icon, tone: "neutral" },
  rewriting: { label: "Rewriting...", Icon: Loader2Icon, tone: "neutral" },
};

const TONE_CLASSES: Record<QaPresentation["tone"], string> = {
  pass: "bg-emerald-500/90 text-white",
  warn: "bg-amber-500/90 text-white",
  fail: "bg-red-600/90 text-white",
  neutral: "bg-foreground/70 text-background",
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

  // Show the user-pinned attempt if they explicitly clicked one and it still
  // exists; otherwise show the latest. This avoids an effect-driven setState.
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
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <button
            type="button"
            onClick={() => selected.image_url && setOpen(true)}
            className="block w-full aspect-[4/5] bg-muted relative group"
          >
            {isInFlight ? (
              <>
                <Skeleton className="absolute inset-0" />
                <span className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                  {selected.status === "generating"
                    ? "Generating..."
                    : selected.qa_status === "reviewing"
                      ? "Reviewing..."
                      : "Rewriting..."}
                </span>
              </>
            ) : displayUrl ? (
              <Image
                src={displayUrl}
                alt={conceptName}
                fill
                sizes="(min-width:1024px) 320px, (min-width:640px) 50vw, 100vw"
                className="object-cover group-hover:scale-[1.02] transition"
                unoptimized
              />
            ) : selected.status === "failed" ? (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-destructive">
                Generation failed
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                Pending
              </div>
            )}

            <div
              className={cn(
                "absolute right-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium shadow-sm backdrop-blur-sm",
                TONE_CLASSES[presentation.tone],
              )}
            >
              <presentation.Icon
                className={cn(
                  "size-3.5",
                  presentation.Icon === Loader2Icon && "animate-spin",
                )}
              />
              <span>{presentation.label}</span>
            </div>
            {selected.is_auto_rewrite && (
              <div className="absolute left-2 top-2 rounded-full bg-background/90 px-2 py-1 text-xs font-medium text-foreground shadow-sm">
                Auto-rewrite #{selected.auto_rewrite_count}
              </div>
            )}
            {!selected.is_unlocked && selected.image_url && (
              <div className="absolute bottom-2 left-2 rounded-full bg-background/90 px-2 py-1 text-xs font-medium text-foreground shadow-sm">
                Watermarked preview
              </div>
            )}
            {selected.is_competitive && (
              <div className="absolute bottom-2 right-2 rounded-full bg-foreground/90 px-2 py-1 text-xs font-semibold text-background shadow-sm">
                vs {selected.competitor_name ?? "Competitor"}
              </div>
            )}
          </button>
        </CardContent>

        <CardFooter className="flex flex-col gap-2 p-3">
          <div className="flex w-full items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-medium truncate">{conceptName}</span>
              <Badge variant="outline" className="shrink-0">
                v{selected.version}
              </Badge>
              {attempts.length > 1 && (
                <Badge variant="secondary" className="shrink-0">
                  {attempts.length} attempts
                </Badge>
              )}
            </div>
          </div>

          {hasIssues && (
            <div className="w-full space-y-1">
              <button
                type="button"
                onClick={() => setIssuesOpen((v) => !v)}
                className="text-left text-xs font-medium text-muted-foreground underline decoration-dotted"
              >
                {issuesOpen ? "Hide issues" : `Show issues (${selected.qa_issues.length})`}
              </button>
              {issuesOpen && (
                <ul className="space-y-1 rounded-md border bg-muted/50 p-2 text-xs">
                  {selected.qa_issues.map((issue, i) => (
                    <li key={i} className="leading-snug">
                      {issue}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex w-full flex-wrap gap-1">
            {!selected.is_unlocked && selected.image_url && onUnlock && (
              <Button
                size="sm"
                onClick={handleUnlock}
                disabled={unlockLoading || isInFlight}
              >
                {unlockLoading ? "..." : "Unlock (1 credit)"}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDownload}
              disabled={!selected.image_url || !selected.is_unlocked}
            >
              Download
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleRegenerate}
              disabled={regenLoading || isInFlight}
            >
              {regenLoading ? "..." : "Regenerate"}
            </Button>
            {selected.image_url && !isInFlight && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setRefineOpen(true)}
                className="gap-1"
              >
                <SparklesIcon className="size-3.5" aria-hidden />
                Refine
              </Button>
            )}
            {isFlagged && selected.image_url && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReReview}
                  disabled={reviewLoading || isInFlight}
                >
                  {reviewLoading ? "..." : "Re-review"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleOverride}
                  disabled={overrideLoading || isInFlight}
                >
                  {overrideLoading ? "..." : "Override"}
                </Button>
              </>
            )}
          </div>

          {selected.image_url && !isInFlight && (
            <div className="w-full border-t pt-2">
              <RatingControls
                generation={selected}
                onUpdated={onRatingChange}
              />
              {selected.refined_from && (
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Refined from an earlier version
                </div>
              )}
            </div>
          )}

          {attempts.length > 1 && (
            <div className="w-full">
              <button
                type="button"
                onClick={() => setShowAttempts((v) => !v)}
                className="text-xs font-medium text-muted-foreground underline decoration-dotted"
              >
                {showAttempts ? "Hide attempts" : "All attempts"}
              </button>
              {showAttempts && (
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  {attempts.map((a) => (
                    <AttemptThumb
                      key={a.id}
                      attempt={a}
                      isSelected={a.id === selected.id}
                      onClick={() =>
                        setPinnedId(a.id === latest.id ? null : a.id)
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </CardFooter>
      </Card>

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
                <Image
                  src={displayUrl}
                  alt={conceptName}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
              {hasIssues && (
                <div className="space-y-1 rounded-md border bg-muted/50 p-2 text-xs">
                  <div className="font-medium text-muted-foreground">
                    QA issues
                  </div>
                  <ul className="space-y-1">
                    {selected.qa_issues.map((issue, i) => (
                      <li key={i}>{issue}</li>
                    ))}
                  </ul>
                </div>
              )}
              <Separator />
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
  const refined = Boolean(attempt.refined_from);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-muted",
        isSelected
          ? "border-foreground ring-2 ring-foreground/60"
          : "border-border hover:border-foreground/40",
      )}
      title={
        refined
          ? `v${attempt.version} - ${presentation.label} (refined)`
          : `v${attempt.version} - ${presentation.label}`
      }
    >
      {attempt.image_url ? (
        <Image
          src={attempt.image_url}
          alt={`v${attempt.version}`}
          fill
          sizes="64px"
          className="object-cover"
          unoptimized
        />
      ) : (
        <Skeleton className="absolute inset-0" />
      )}
      <span
        className={cn(
          "absolute bottom-0 left-0 right-0 px-1 text-[10px] font-medium leading-tight",
          TONE_CLASSES[presentation.tone],
        )}
      >
        v{attempt.version}
      </span>
    </button>
  );
}
