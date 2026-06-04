"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Icon } from "@/components/tf/ui";
import { toast } from "sonner";
import type { Generation } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: Generation;
  conceptName: string;
  onRefined: (next: Generation, newBalance?: number) => void;
}

export function RefineDialog({
  open,
  onOpenChange,
  source,
  conceptName,
  onRefined,
}: Props) {
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);
  // Brief is collapsed by default so the modal stays focused on the feedback.
  const [briefOpen, setBriefOpen] = useState(false);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setFeedback("");
      setLoading(false);
      setBriefOpen(false);
    }
    onOpenChange(next);
  }

  const previewUrl = source.is_unlocked
    ? source.image_url
    : (source.watermarked_url ?? source.image_url);

  async function handleRefine() {
    if (!feedback.trim()) {
      toast.error("Tell Claude what you want changed");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          generation_id: source.id,
          user_feedback: feedback.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 402) {
          toast.error(json.message ?? "Out of credits");
        } else {
          throw new Error(json.message ?? json.error ?? "Refine failed");
        }
        return;
      }
      onRefined(json.generation as Generation, json.new_balance);
      toast.success("New version ready");
      handleOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Refine failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={
          // Mobile: full-screen sheet. Desktop: centered 700–900px panel.
          "max-w-none gap-0 rounded-none p-0 w-screen h-[100dvh] top-0 left-0 translate-x-0 translate-y-0 " +
          "sm:h-auto sm:max-h-[90vh] sm:w-[min(900px,94vw)] sm:min-w-[700px] sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2"
        }
        style={{
          background: "var(--paper)",
          color: "var(--ink)",
          border: "1.5px solid var(--ink)",
        }}
      >
        <div className="flex h-full flex-col sm:h-auto sm:max-h-[90vh]">
          {/* Header */}
          <div
            className="flex items-center justify-between gap-3 px-4 py-3 sm:px-5"
            style={{ borderBottom: "1.5px solid var(--ink)" }}
          >
            <DialogTitle
              className="flex items-center gap-2 truncate"
              style={{
                fontFamily: "var(--display)",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "-.01em",
                fontSize: 16,
              }}
            >
              <Icon name="sparkle" size={18} style={{ color: "var(--pop-deep)" }} />
              <span className="truncate">Refine {conceptName}</span>
            </DialogTitle>
            <button
              type="button"
              aria-label="Close"
              onClick={() => handleOpenChange(false)}
              className="flex shrink-0 items-center justify-center"
              style={{
                width: 34,
                height: 34,
                border: "1.5px solid var(--ink)",
                background: "#fff",
                borderRadius: 4,
              }}
            >
              <Icon name="x" size={18} />
            </button>
          </div>

          {/* Body (scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5">
            <div className="grid gap-5 sm:grid-cols-[300px_minmax(0,1fr)]">
              {/* Left: current image + collapsible brief */}
              <div>
                <div
                  className="relative mx-auto w-full max-w-[320px] h-[38vh] sm:h-auto sm:w-[300px] sm:aspect-[4/5]"
                  style={{
                    background: "#000",
                    border: "1.5px solid var(--ink)",
                    borderRadius: 4,
                    overflow: "hidden",
                  }}
                >
                  {previewUrl ? (
                    <Image
                      src={previewUrl}
                      alt={`${conceptName} current`}
                      fill
                      sizes="(min-width:640px) 300px, 90vw"
                      className="object-contain"
                      unoptimized
                    />
                  ) : (
                    <div
                      className="flex h-full w-full items-center justify-center"
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 10,
                        textTransform: "uppercase",
                        color: "#fff",
                      }}
                    >
                      No image
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setBriefOpen((v) => !v)}
                  className="pg-mono mt-3 inline-flex items-center gap-1"
                  style={{
                    fontSize: 10.5,
                    letterSpacing: ".06em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                    background: "none",
                    border: 0,
                    cursor: "pointer",
                    textDecorationLine: "underline",
                    textUnderlineOffset: 2,
                  }}
                >
                  {briefOpen ? "Hide brief" : "Show brief"}
                </button>

                {briefOpen && (
                  <>
                    <pre
                      className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap p-2"
                      style={{
                        fontFamily: "var(--mono)",
                        fontSize: 11,
                        lineHeight: 1.5,
                        color: "var(--ink-2)",
                        background: "#fff",
                        border: "1.5px solid var(--line)",
                        borderRadius: 3,
                      }}
                    >
                      {source.prompt_text}
                    </pre>
                    {source.refinement_feedback && (
                      <p
                        className="mt-2 p-2"
                        style={{
                          fontFamily: "var(--mono)",
                          fontSize: 11,
                          lineHeight: 1.5,
                          color: "var(--ink-2)",
                          background: "#fff",
                          border: "1.5px solid var(--line)",
                          borderRadius: 3,
                        }}
                      >
                        Previous feedback: {source.refinement_feedback}
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Right: feedback form */}
              <div>
                <label htmlFor="refine-feedback" className="pg-field-label">
                  What would you change?
                </label>
                <textarea
                  id="refine-feedback"
                  className="pg-input pg-textarea"
                  rows={6}
                  style={{ minHeight: 132 }}
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="make the text bigger, simplify the layout, change the color scheme, drop the model and lead with the product, lean into the brand voice more..."
                  disabled={loading}
                />
                <p
                  className="mt-2"
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: 10.5,
                    letterSpacing: ".02em",
                    color: "var(--muted)",
                  }}
                >
                  Be concrete. Claude rewrites the brief from scratch with your
                  feedback in mind, then renders a fresh version. Costs 0.5
                  credits.
                </p>
              </div>
            </div>
          </div>

          {/* Footer (sticky) */}
          <div
            className="flex flex-col-reverse gap-2 p-4 sm:flex-row sm:items-center sm:justify-end sm:px-5"
            style={{ borderTop: "1.5px solid var(--ink)", background: "#fff" }}
          >
            <button
              type="button"
              className="pg-btn pg-btn--ghost"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
              style={{ justifyContent: "center" }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="pg-btn pg-btn--pop"
              onClick={handleRefine}
              disabled={loading || !feedback.trim()}
              style={{
                justifyContent: "center",
                gap: 8,
                flex: 1,
              }}
            >
              {loading ? (
                <Icon
                  name="refresh"
                  size={17}
                  style={{ animation: "pg-spin .8s linear infinite" }}
                />
              ) : (
                <Icon name="sparkle" size={17} />
              )}
              {loading ? "Refining..." : "Generate refined version · 0.5 credits"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
