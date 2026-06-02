"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CREDIT_PACKS } from "@/lib/types";
import type { UserProfile } from "@/lib/types";

interface Props {
  profile: UserProfile;
  lockedCount: number;
  onProfileChange: (profile: UserProfile) => void;
  onUnlockAll?: () => Promise<void>;
}

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

function perCreditPrice(cents: number, credits: number): string {
  return `$${(cents / 100 / credits).toFixed(2)} per credit`;
}

export function CreditsPanel({
  profile,
  lockedCount,
  onUnlockAll,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [buying, setBuying] = useState<string | null>(null);
  const [unlockingAll, setUnlockingAll] = useState(false);

  async function buyPack(packId: string) {
    setBuying(packId);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pack: packId }),
      });
      const json = await res.json();
      if (!res.ok || !json.url) {
        throw new Error(json.message ?? json.error ?? "Checkout failed");
      }
      window.location.assign(json.url as string);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setBuying(null);
    }
  }

  async function handleUnlockAll() {
    if (!onUnlockAll) return;
    setUnlockingAll(true);
    try {
      await onUnlockAll();
    } finally {
      setUnlockingAll(false);
    }
  }

  return (
    <div className="pg-form-card" style={{ marginTop: 0 }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={cn(
              "pg-badge",
              profile.credit_balance > 0 ? "pg-badge--pop" : "pg-badge--red",
            )}
          >
            {profile.credit_balance} credit{profile.credit_balance === 1 ? "" : "s"}
          </span>
          {!profile.has_purchased && profile.credit_balance > 0 && (
            <span className="pg-badge pg-badge--outline">Free trial</span>
          )}
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            One credit per image generation.
            {lockedCount > 0
              ? ` ${lockedCount} legacy image${lockedCount === 1 ? "" : "s"} need${lockedCount === 1 ? "s" : ""} unlocking.`
              : ""}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {onUnlockAll && lockedCount > 0 && (
            <button
              className="pg-btn pg-btn--outline pg-btn--sm"
              onClick={handleUnlockAll}
              disabled={unlockingAll}
            >
              {unlockingAll ? "Unlocking..." : `Unlock legacy (${lockedCount})`}
            </button>
          )}
          <button
            className="pg-btn pg-btn--pop pg-btn--sm"
            onClick={() => setDialogOpen(true)}
          >
            Buy credits
          </button>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              <span className="pg-h2">Buy credits</span>
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            One credit per image generation. Credits never expire. Failed
            renders never cost a credit.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CREDIT_PACKS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => buyPack(p.id)}
                disabled={buying !== null}
                className={cn(
                  "pg-pack",
                  p.most_popular && "pop",
                  buying === p.id && "opacity-60",
                )}
                style={{
                  position: "relative",
                  flexDirection: "column",
                  alignItems: "flex-start",
                  textAlign: "left",
                  marginBottom: 0,
                }}
              >
                {p.most_popular && (
                  <span
                    className="pg-badge pg-badge--ink"
                    style={{ position: "absolute", top: -10, right: 12 }}
                  >
                    Most popular
                  </span>
                )}
                <div
                  className="pg-mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: ".08em",
                    textTransform: "uppercase",
                    color: "var(--muted)",
                  }}
                >
                  {p.label}
                </div>
                <h4 style={{ marginTop: 4 }}>{p.credits} credits</h4>
                <div className="price">{formatPrice(p.amount_cents)}</div>
                <small style={{ marginTop: 8 }}>
                  {perCreditPrice(p.amount_cents, p.credits)}
                </small>
              </button>
            ))}
          </div>
          <p className="pg-mono" style={{ fontSize: 10, color: "var(--muted)", letterSpacing: ".04em" }}>
            Secure checkout powered by Stripe. Credits arrive in your balance
            seconds after the payment confirms.
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
