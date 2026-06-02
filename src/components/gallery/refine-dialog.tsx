"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Btn, Icon, Badge } from "@/components/tf/ui";
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

  function handleOpenChange(next: boolean) {
    if (!next) {
      setFeedback("");
      setLoading(false);
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
        className="max-w-4xl"
        style={{
          background: "var(--paper)",
          color: "var(--ink)",
          border: "1.5px solid var(--ink)",
          borderRadius: 0,
        }}
      >
        <DialogHeader>
          <DialogTitle
            className="flex items-center gap-2"
            style={{
              fontFamily: "var(--display)",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "-.01em",
            }}
          >
            <Icon name="sparkle" size={18} style={{ color: "var(--pop-deep)" }} />
            Refine {conceptName}
          </DialogTitle>
          <DialogDescription style={{ color: "var(--muted)" }}>
            Describe what you would change. Claude rewrites the brief from
            scratch with your feedback in mind, then Gemini renders a fresh
            version. Costs 1 credit.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div>
            <div className="pg-refine-ad">
              <div className="pg-ad">
                {previewUrl ? (
                  <Image
                    src={previewUrl}
                    alt={`${conceptName} current`}
                    fill
                    sizes="(min-width:1024px) 400px, 100vw"
                    className="object-contain"
                    unoptimized
                  />
                ) : (
                  <div
                    className="flex h-full w-full items-center justify-center"
                    style={{
                      fontFamily: "var(--mono)",
                      fontSize: 10,
                      letterSpacing: ".04em",
                      textTransform: "uppercase",
                      color: "var(--muted)",
                    }}
                  >
                    No image
                  </div>
                )}
              </div>
            </div>
            <div className="pg-refine-meta">
              <Badge tone="outline">Current image</Badge>
            </div>

            <div className="pg-div">
              <span>Brief that produced this image</span>
            </div>
            <pre
              className="max-h-40 overflow-auto whitespace-pre-wrap p-2"
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
              <>
                <div className="pg-div">
                  <span>Feedback used to produce this version</span>
                </div>
                <p
                  className="p-2"
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
                  {source.refinement_feedback}
                </p>
              </>
            )}
          </div>

          <div>
            <div className="pg-div" style={{ marginTop: 0 }}>
              <span>Refine</span>
            </div>
            <label htmlFor="refine-feedback" className="pg-field-label">
              What would you change?
            </label>
            <textarea
              id="refine-feedback"
              className="pg-input pg-textarea"
              rows={8}
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
              Be concrete. Claude takes your feedback literally and rewrites
              the brief; vague feedback produces vague briefs.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Btn
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Btn>
          <Btn
            type="button"
            variant="pop"
            onClick={handleRefine}
            disabled={loading || !feedback.trim()}
          >
            {loading ? (
              <Icon name="refresh" size={17} style={{ animation: "pg-spin .8s linear infinite" }} />
            ) : (
              <Icon name="sparkle" size={17} />
            )}
            {loading ? "Refining..." : "Generate refined version"}
          </Btn>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
