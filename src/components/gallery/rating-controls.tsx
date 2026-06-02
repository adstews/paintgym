"use client";

import { useState } from "react";
import { HeartIcon, MegaphoneIcon } from "lucide-react";
import { Icon } from "@/components/tf/ui";
import { toast } from "sonner";
import type { Generation } from "@/lib/types";

interface Props {
  generation: Generation;
  onUpdated: (next: Generation) => void;
  disabled?: boolean;
}

export function RatingControls({ generation, onUpdated, disabled }: Props) {
  const [saving, setSaving] = useState(false);
  const [hover, setHover] = useState<number | null>(null);

  async function patch(body: {
    rating?: number | null;
    is_favorited?: boolean;
    used_in_ad?: boolean;
  }) {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/generations/${generation.id}/rating`,
        {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.message ?? json.error ?? "Save failed");
      }
      onUpdated(json.generation as Generation);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const activeRating = hover ?? generation.rating ?? 0;
  const isLocal = generation.id.startsWith("tmp-");
  const isDisabled = disabled || saving || isLocal;

  function handleStarClick(star: number) {
    if (isDisabled) return;
    const next = generation.rating === star ? null : star;
    patch({ rating: next });
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-x-2 gap-y-1">
      <div
        className="pg-stars"
        onMouseLeave={() => setHover(null)}
        role="group"
        aria-label="Star rating"
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = activeRating >= star;
          return (
            <button
              key={star}
              type="button"
              className="pg-star-btn"
              style={{
                cursor: isDisabled ? "not-allowed" : "pointer",
                opacity: isDisabled ? 0.5 : 1,
              }}
              disabled={isDisabled}
              onClick={() => handleStarClick(star)}
              onMouseEnter={() => setHover(star)}
              aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
              title={`${star} star${star === 1 ? "" : "s"}`}
            >
              <Icon
                name="star"
                size={16}
                sw={1.5}
                style={{
                  color: filled ? "var(--pop)" : "var(--ink)",
                  fill: filled ? "var(--pop)" : "transparent",
                  opacity: filled ? 1 : 0.25,
                }}
              />
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="pg-btn pg-btn--ghost pg-btn--sm"
        style={generation.is_favorited ? { color: "var(--red)" } : undefined}
        disabled={isDisabled}
        onClick={() => patch({ is_favorited: !generation.is_favorited })}
        title={generation.is_favorited ? "Unfavorite" : "Favorite"}
      >
        <HeartIcon
          className={generation.is_favorited ? "size-4 fill-current" : "size-4"}
          aria-hidden
        />
        <span className="sr-only sm:not-sr-only">
          {generation.is_favorited ? "Favorited" : "Favorite"}
        </span>
      </button>

      <button
        type="button"
        className={`pg-btn pg-btn--sm ${
          generation.used_in_ad ? "pg-btn--pop" : "pg-btn--ghost"
        }`}
        disabled={isDisabled}
        onClick={() => patch({ used_in_ad: !generation.used_in_ad })}
        title={
          generation.used_in_ad
            ? "Marked as used in ad"
            : "Mark as used in ad"
        }
      >
        <MegaphoneIcon className="size-4" aria-hidden />
        <span className="sr-only sm:not-sr-only">
          {generation.used_in_ad ? "Used in ad" : "Mark used"}
        </span>
      </button>
    </div>
  );
}
