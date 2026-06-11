"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Icon } from "@/components/tf/ui";
import { toast } from "sonner";
import type { Generation } from "@/lib/types";
import type { ReviewItem } from "@/components/gallery/review-mode";

interface Props {
  items: ReviewItem[];
  onClose: () => void;
  onRatingChange: (next: Generation) => void;
}

type SwipeAction = "like" | "nope" | "skip";

// Distance (px) the top card must travel before a release commits the swipe.
const COMMIT = 90;
// Distance at which the colored overlay reaches full opacity.
const FULL = 120;
// How long the fly-off animation runs before we advance the deck.
const EXIT_MS = 300;
// How many cards are kept in the DOM (top + peeking cards behind it).
const STACK_DEPTH = 3;

// Swipe right rates a clear winner, swipe left buries a dud. Tuned to the
// 1-5 rating scale from migration 0010.
const LIKE_RATING = 5;
const NOPE_RATING = 1;

function qaTone(status: Generation["qa_status"]): {
  label: string;
  cls: string;
} | null {
  switch (status) {
    case "passed":
      return { label: "QA passed", cls: "is-pass" };
    case "minor":
      return { label: "QA · minor", cls: "is-warn" };
    case "major":
      return { label: "QA · major", cls: "is-fail" };
    case "overridden":
      return { label: "QA overridden", cls: "is-warn" };
    case "reviewing":
    case "rewriting":
      return { label: "QA reviewing", cls: "is-neutral" };
    default:
      return null;
  }
}

// Tinder-style swipe deck for rating generated ads on mobile. Swipe right to
// rate it a winner (5), left to bury it (1), up to skip without rating. Drag
// tracks the finger 1:1 via the card ref (no per-move re-render) so it stays
// smooth; React state only changes when the deck advances.
export function SwipeReview({ items, onClose, onRatingChange }: Props) {
  const [index, setIndex] = useState(0);
  const [tally, setTally] = useState({ like: 0, nope: 0, skip: 0 });

  const cardRef = useRef<HTMLDivElement | null>(null);
  const likeRef = useRef<HTMLDivElement | null>(null);
  const nopeRef = useRef<HTMLDivElement | null>(null);
  const skipRef = useRef<HTMLDivElement | null>(null);

  const drag = useRef<{ active: boolean; x: number; y: number; id: number }>({
    active: false,
    x: 0,
    y: 0,
    id: -1,
  });
  // Locked while a card flies off so we ignore further input mid-animation.
  const locked = useRef(false);

  const total = items.length;
  const done = Math.min(index, total);

  function setOverlay(ref: React.RefObject<HTMLDivElement | null>, o: number) {
    if (ref.current) ref.current.style.opacity = String(o);
  }

  const resetOverlays = useCallback(() => {
    setOverlay(likeRef, 0);
    setOverlay(nopeRef, 0);
    setOverlay(skipRef, 0);
  }, []);

  const paint = useCallback(
    (dx: number, dy: number) => {
      const card = cardRef.current;
      if (!card) return;
      const rot = Math.max(-14, Math.min(14, dx * 0.05));
      card.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg)`;
      // Whichever axis is dominant drives its overlay.
      if (Math.abs(dy) > Math.abs(dx) && dy < 0) {
        setOverlay(skipRef, Math.min(1, -dy / FULL));
        setOverlay(likeRef, 0);
        setOverlay(nopeRef, 0);
      } else {
        setOverlay(skipRef, 0);
        setOverlay(likeRef, dx > 0 ? Math.min(1, dx / FULL) : 0);
        setOverlay(nopeRef, dx < 0 ? Math.min(1, -dx / FULL) : 0);
      }
    },
    [],
  );

  const saveRating = useCallback(
    async (gen: Generation, rating: number) => {
      try {
        const res = await fetch(`/api/generations/${gen.id}/rating`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ rating }),
        });
        const json = await res.json();
        if (!res.ok)
          throw new Error(json.message ?? json.error ?? "Save failed");
        onRatingChange(json.generation as Generation);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Rating not saved");
      }
    },
    [onRatingChange],
  );

  // Animate the top card off-screen, record the action, then advance the deck.
  const commit = useCallback(
    (action: SwipeAction) => {
      if (locked.current) return;
      const item = items[index];
      if (!item) return;
      locked.current = true;
      drag.current.active = false;

      const card = cardRef.current;
      if (card) {
        card.style.transition = `transform ${EXIT_MS}ms cubic-bezier(.4,0,.2,1)`;
        const offX =
          action === "like" ? 600 : action === "nope" ? -600 : 0;
        const offY = action === "skip" ? -800 : -40;
        const rot = action === "like" ? 18 : action === "nope" ? -18 : 0;
        card.style.transform = `translate(${offX}px, ${offY}px) rotate(${rot}deg)`;
      }
      if (action === "like") setOverlay(likeRef, 1);
      else if (action === "nope") setOverlay(nopeRef, 1);
      else setOverlay(skipRef, 1);

      if (action === "like") void saveRating(item.generation, LIKE_RATING);
      else if (action === "nope") void saveRating(item.generation, NOPE_RATING);

      setTally((t) => ({ ...t, [action]: t[action] + 1 }));

      window.setTimeout(() => {
        setIndex((i) => i + 1);
        locked.current = false;
      }, EXIT_MS);
    },
    [index, items, saveRating],
  );

  // Snap the card back to center when a drag is released short of the threshold.
  const snapBack = useCallback(() => {
    const card = cardRef.current;
    if (card) {
      card.style.transition = "transform .25s cubic-bezier(.2,.9,.3,1)";
      card.style.transform = "translate(0,0) rotate(0)";
    }
    resetOverlays();
  }, [resetOverlays]);

  function onPointerDown(e: React.PointerEvent) {
    if (locked.current) return;
    const card = cardRef.current;
    if (!card) return;
    card.setPointerCapture(e.pointerId);
    card.style.transition = "none";
    drag.current = { active: true, x: e.clientX, y: e.clientY, id: e.pointerId };
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d.active || e.pointerId !== d.id) return;
    paint(e.clientX - d.x, e.clientY - d.y);
  }

  function onPointerUp(e: React.PointerEvent) {
    const d = drag.current;
    if (!d.active || e.pointerId !== d.id) return;
    d.active = false;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dy) > Math.abs(dx) && dy < -COMMIT) commit("skip");
    else if (dx > COMMIT) commit("like");
    else if (dx < -COMMIT) commit("nope");
    else snapBack();
  }

  // Keyboard: arrows mirror the swipes, Esc closes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") commit("like");
      else if (e.key === "ArrowLeft") commit("nope");
      else if (e.key === "ArrowUp") commit("skip");
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [commit, onClose]);

  // Lock body scroll while open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const finished = index >= total;
  // Cards still in the deck: the top one plus a couple peeking behind it.
  const stack = items.slice(index, index + STACK_DEPTH);

  return (
    <div
      className="pg-swipe"
      role="dialog"
      aria-modal="true"
      aria-label="Swipe review"
    >
      <div className="pg-swipe-top">
        <span className="counter">
          {finished ? `${total} of ${total}` : `${done} of ${total}`} reviewed
        </span>
        <button
          className="pg-swipe-close"
          onClick={onClose}
          aria-label="Close swipe review"
        >
          <Icon name="x" size={20} />
        </button>
      </div>

      <div className="pg-swipe-progress" aria-hidden>
        <span
          style={{ width: `${total ? (done / total) * 100 : 0}%` }}
        />
      </div>

      <div className="pg-swipe-stage">
        {finished ? (
          <div className="pg-swipe-done">
            <Icon name="check" size={40} />
            <div className="h">All caught up</div>
            <div className="sub">
              {tally.like} kept · {tally.nope} buried · {tally.skip} skipped
            </div>
            <button
              type="button"
              className="pg-btn pg-btn--pop pg-btn--sm"
              onClick={onClose}
            >
              Back to gallery
            </button>
          </div>
        ) : (
          stack
            .map((item, i) => {
              const isTop = i === 0;
              const gen = item.generation;
              const displayUrl = gen.is_unlocked
                ? gen.image_url
                : (gen.watermarked_url ?? gen.image_url);
              const tone = qaTone(gen.qa_status);
              return (
                <div
                  key={gen.id}
                  ref={isTop ? cardRef : undefined}
                  className={`pg-swipe-card${isTop ? " is-top" : ""}`}
                  style={{
                    zIndex: STACK_DEPTH - i,
                    transform: isTop
                      ? undefined
                      : `translateY(${i * 10}px) scale(${1 - i * 0.04})`,
                  }}
                  onPointerDown={isTop ? onPointerDown : undefined}
                  onPointerMove={isTop ? onPointerMove : undefined}
                  onPointerUp={isTop ? onPointerUp : undefined}
                  onPointerCancel={isTop ? onPointerUp : undefined}
                >
                  {isTop && (
                    <>
                      <div className="pg-swipe-badge like" ref={likeRef}>
                        Keep
                      </div>
                      <div className="pg-swipe-badge nope" ref={nopeRef}>
                        Nope
                      </div>
                      <div className="pg-swipe-badge skip" ref={skipRef}>
                        Skip
                      </div>
                    </>
                  )}
                  <div className="pg-swipe-img">
                    {displayUrl ? (
                      <Image
                        src={displayUrl}
                        alt={item.conceptName}
                        fill
                        sizes="(min-width:1000px) 460px, 100vw"
                        className="object-contain"
                        draggable={false}
                        unoptimized
                      />
                    ) : (
                      <div className="pg-swipe-empty">
                        {gen.status === "generating"
                          ? "rendering…"
                          : "no image"}
                      </div>
                    )}
                  </div>
                  <div className="pg-swipe-meta">
                    <div className="name">
                      {item.conceptName}
                      {gen.version > 1 ? ` · v${gen.version}` : ""}
                    </div>
                    {tone && (
                      <span className={`pg-swipe-qa ${tone.cls}`}>
                        {tone.label}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
            .reverse()
        )}
      </div>

      {!finished && (
        <div className="pg-swipe-controls">
          <button
            type="button"
            className="pg-swipe-btn nope"
            onClick={() => commit("nope")}
            aria-label="Reject (rate 1)"
          >
            <Icon name="x" size={26} />
          </button>
          <button
            type="button"
            className="pg-swipe-btn skip"
            onClick={() => commit("skip")}
            aria-label="Skip"
          >
            <Icon name="chevR" size={24} />
          </button>
          <button
            type="button"
            className="pg-swipe-btn like"
            onClick={() => commit("like")}
            aria-label="Keep (rate 5)"
          >
            <Icon name="star" size={24} />
          </button>
        </div>
      )}
    </div>
  );
}
