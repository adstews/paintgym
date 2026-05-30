"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2Icon, SparklesIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SparklesIcon className="size-4" aria-hidden />
            Refine {conceptName}
          </DialogTitle>
          <DialogDescription>
            Describe what you would change. Claude rewrites the brief from
            scratch with your feedback in mind, then Gemini renders a fresh
            version. Costs 1 credit.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="space-y-2">
            <Label>Current image</Label>
            <div className="relative w-full aspect-[4/5] overflow-hidden rounded-md bg-muted">
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
                <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                  No image
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                Brief that produced this image
              </Label>
              <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/30 p-2 text-xs">
                {source.prompt_text}
              </pre>
            </div>
            {source.refinement_feedback && (
              <div>
                <Label className="text-xs text-muted-foreground">
                  Feedback used to produce this version
                </Label>
                <p className="mt-1 rounded-md border bg-muted/30 p-2 text-xs">
                  {source.refinement_feedback}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div>
              <Label htmlFor="refine-feedback">What would you change?</Label>
              <Textarea
                id="refine-feedback"
                rows={8}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="make the text bigger, simplify the layout, change the color scheme, drop the model and lead with the product, lean into the brand voice more..."
                disabled={loading}
                className="mt-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Be concrete. Claude takes your feedback literally and rewrites
              the brief; vague feedback produces vague briefs.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleRefine}
            disabled={loading || !feedback.trim()}
            className="gap-1"
          >
            {loading ? (
              <Loader2Icon className="size-4 animate-spin" aria-hidden />
            ) : (
              <SparklesIcon className="size-4" aria-hidden />
            )}
            {loading ? "Refining..." : "Generate refined version"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
