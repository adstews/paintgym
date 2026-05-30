"use client";

import { useState } from "react";
import { HeartIcon, StarIcon, MegaphoneIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
        className="flex items-center"
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
              disabled={isDisabled}
              onClick={() => handleStarClick(star)}
              onMouseEnter={() => setHover(star)}
              className={cn(
                "p-0.5 transition disabled:cursor-not-allowed disabled:opacity-50",
                "text-muted-foreground hover:text-amber-500",
                filled && "text-amber-500",
              )}
              aria-label={`Rate ${star} star${star === 1 ? "" : "s"}`}
              title={`${star} star${star === 1 ? "" : "s"}`}
            >
              <StarIcon
                className={cn("size-4", filled && "fill-current")}
                aria-hidden
              />
            </button>
          );
        })}
      </div>

      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={isDisabled}
        onClick={() => patch({ is_favorited: !generation.is_favorited })}
        className={cn(
          "h-7 gap-1 px-2 text-xs",
          generation.is_favorited && "text-rose-500",
        )}
        title={generation.is_favorited ? "Unfavorite" : "Favorite"}
      >
        <HeartIcon
          className={cn(
            "size-4",
            generation.is_favorited && "fill-current",
          )}
          aria-hidden
        />
        <span className="sr-only sm:not-sr-only">
          {generation.is_favorited ? "Favorited" : "Favorite"}
        </span>
      </Button>

      <Button
        type="button"
        size="sm"
        variant={generation.used_in_ad ? "default" : "ghost"}
        disabled={isDisabled}
        onClick={() => patch({ used_in_ad: !generation.used_in_ad })}
        className="h-7 gap-1 px-2 text-xs"
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
      </Button>
    </div>
  );
}
