"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { HeartIcon } from "lucide-react";
import { Icon } from "@/components/tf/ui";
import { toast } from "sonner";
import type { ConceptVariant, Generation } from "@/lib/types";

export interface ReviewItem {
  generation: Generation;
  conceptName: string;
  conceptId: string;
  variant: ConceptVariant;
}

interface Props {
  items: ReviewItem[];
  startIndex?: number;
  onClose: () => void;
  onRatingChange: (next: Generation) => void;
  onRefined: (next: Generation, newBalance?: number) => void;
  onRegenerate: (conceptId: string, variant: ConceptVariant) => Promise<void>;
}

// Full-screen swipe review (item 13). One image at a time, swipe left / right
// arrow to advance, with rating, favorite, quick refine, regenerate and scrap
// inline. Tuned for mobile touch.
export function ReviewMode({
  items,
  startIndex = 0,
  onClose,
  onRatingChange,
  onRefined,
  onRegenerate,
}: Props) {
  const [order, setOrder] = useState(() => items.map((_, i) => i));
  const [pos, setPos] = useState(() =>
    Math.min(Math.max(startIndex, 0), Math.max(items.length - 1, 0)),
  );
  const [dir, setDir] = useState<1 | -1>(1);
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState(false);
  const touchStart = useRef<number | null>(null);

  const total = order.length;
  const current = total > 0 ? items[order[pos]] : null;

  const go = useCallback(
    (delta: 1 | -1) => {
      setDir(delta);
      setFeedback("");
      setPos((p) => Math.min(Math.max(p + delta, 0), total - 1));
    },
    [total],
  );

  // Keyboard: arrows to move, Esc to close.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  // Lock body scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  if (!current) {
    return (
      <div className="pg-review">
        <div className="pg-review-top">
          <span className="counter">Review</span>
          <button className="pg-review-close" onClick={onClose} aria-label="Close review">
            <Icon name="x" size={20} />
          </button>
        </div>
        <div className="pg-review-stage" style={{ color: "#fff" }}>
          Nothing to review.
        </div>
      </div>
    );
  }

  const gen = current.generation;
  const displayUrl = gen.is_unlocked
    ? gen.image_url
    : (gen.watermarked_url ?? gen.image_url);
  const activeRating = gen.rating ?? 0;

  async function patchRating(body: {
    rating?: number | null;
    is_favorited?: boolean;
  }) {
    setBusy(true);
    try {
      const res = await fetch(`/api/generations/${gen.id}/rating`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? json.error ?? "Save failed");
      onRatingChange(json.generation as Generation);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleRefine() {
    if (!feedback.trim()) {
      toast.error("Type what you want changed first");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/refine", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          generation_id: gen.id,
          user_feedback: feedback.trim(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message ?? json.error ?? "Refine failed");
      }
      onRefined(json.generation as Generation, json.new_balance);
      toast.success("New version ready");
      setFeedback("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Refine failed");
    } finally {
      setBusy(false);
    }
  }

  async function handleRegenerate() {
    setBusy(true);
    try {
      await onRegenerate(current!.conceptId, current!.variant);
      toast.success("Regenerating");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Regenerate failed");
    } finally {
      setBusy(false);
    }
  }

  function handleScrap() {
    // Remove from this review session and advance. Non-destructive — the image
    // stays in the gallery; this just clears it out of the review queue.
    setOrder((o) => {
      const next = o.filter((_, i) => i !== pos);
      setPos((p) => Math.min(p, Math.max(next.length - 1, 0)));
      return next;
    });
    toast("Scrapped from review");
  }

  function handleDownload() {
    if (!gen.is_unlocked) {
      toast.error("Unlock this image to download a clean copy");
      return;
    }
    if (!gen.image_url) return;
    const a = document.createElement("a");
    a.href = gen.image_url;
    a.download = `${current!.conceptName.toLowerCase().replace(/\s+/g, "-")}-v${gen.version}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function onTouchStart(e: React.TouchEvent) {
    touchStart.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStart.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStart.current;
    touchStart.current = null;
    if (Math.abs(dx) < 70) return;
    // Swipe left -> next, swipe right -> previous.
    if (dx < 0) go(1);
    else go(-1);
  }

  return (
    <div className="pg-review" role="dialog" aria-modal="true" aria-label="Review images">
      <div className="pg-review-top">
        <span className="counter">
          {pos + 1} of {total}
        </span>
        <button className="pg-review-close" onClick={onClose} aria-label="Close review">
          <Icon name="x" size={20} />
        </button>
      </div>

      <div className="pg-review-stage">
        <button
          className="pg-review-arrow left"
          onClick={() => go(-1)}
          disabled={pos === 0}
          aria-label="Previous"
        >
          <Icon name="chevL" size={22} />
        </button>

        <div
          className="pg-review-card"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <div
            key={`${gen.id}:${pos}`}
            className="pg-review-img pg-review-swipe"
            style={{ ["--from" as string]: dir === 1 ? "40px" : "-40px" }}
          >
            {displayUrl ? (
              <Image
                src={displayUrl}
                alt={current.conceptName}
                fill
                sizes="(min-width:1000px) 520px, 100vw"
                className="object-contain"
                unoptimized
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center"
                style={{ color: "#888", fontFamily: "var(--mono)", fontSize: 12 }}
              >
                {gen.status === "generating" ? "rendering..." : "no image"}
              </div>
            )}
          </div>
        </div>

        <button
          className="pg-review-arrow right"
          onClick={() => go(1)}
          disabled={pos >= total - 1}
          aria-label="Next"
        >
          <Icon name="chevR" size={22} />
        </button>
      </div>

      <div className="pg-review-bottom">
        <div className="title">
          {current.conceptName}
          {gen.version > 1 ? ` · v${gen.version}` : ""}
        </div>

        <div className="pg-review-rate">
          <div className="pg-stars" role="group" aria-label="Star rating">
            {[1, 2, 3, 4, 5].map((star) => {
              const filled = activeRating >= star;
              return (
                <button
                  key={star}
                  type="button"
                  className="pg-star-btn"
                  disabled={busy}
                  onClick={() =>
                    patchRating({ rating: gen.rating === star ? null : star })
                  }
                  aria-label={`Rate ${star}`}
                >
                  <Icon
                    name="star"
                    size={26}
                    sw={1.5}
                    style={{
                      color: filled ? "var(--pop-deep)" : "var(--ink)",
                      fill: filled ? "var(--pop)" : "transparent",
                      opacity: filled ? 1 : 0.3,
                    }}
                  />
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="pg-btn pg-btn--outline pg-btn--sm"
            style={gen.is_favorited ? { color: "var(--red)", borderColor: "var(--red)" } : undefined}
            disabled={busy}
            onClick={() => patchRating({ is_favorited: !gen.is_favorited })}
          >
            <HeartIcon
              className={gen.is_favorited ? "size-4 fill-current" : "size-4"}
              aria-hidden
            />
            {gen.is_favorited ? "Favorited" : "Favorite"}
          </button>
        </div>

        <div className="pg-review-feedback">
          <input
            className="pg-input"
            placeholder="Quick feedback, then Refine"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRefine();
            }}
          />
          <button
            type="button"
            className="pg-btn pg-btn--pop pg-btn--sm"
            disabled={busy || !feedback.trim()}
            onClick={handleRefine}
          >
            Refine
          </button>
        </div>

        <div className="pg-review-actions">
          <button
            type="button"
            className="pg-btn pg-btn--outline pg-btn--sm"
            onClick={handleDownload}
            disabled={!gen.image_url || !gen.is_unlocked}
          >
            <Icon name="download" size={15} />
            Download
          </button>
          <button
            type="button"
            className="pg-btn pg-btn--outline pg-btn--sm"
            onClick={handleRegenerate}
            disabled={busy}
          >
            <Icon name="refresh" size={15} />
            Regenerate
          </button>
          <button
            type="button"
            className="pg-btn pg-btn--outline pg-btn--sm"
            onClick={handleScrap}
            disabled={busy}
          >
            <Icon name="trash" size={15} />
            Scrap
          </button>
        </div>
      </div>
    </div>
  );
}
