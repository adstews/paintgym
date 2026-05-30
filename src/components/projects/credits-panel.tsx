"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
    <Card>
      <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={profile.credit_balance > 0 ? "default" : "destructive"}>
            {profile.credit_balance} credit{profile.credit_balance === 1 ? "" : "s"}
          </Badge>
          {!profile.has_purchased && profile.credit_balance > 0 && (
            <Badge variant="outline">Free trial</Badge>
          )}
          <span className="text-xs text-muted-foreground">
            One credit per image generation.
            {lockedCount > 0
              ? ` ${lockedCount} legacy image${lockedCount === 1 ? "" : "s"} need${lockedCount === 1 ? "s" : ""} unlocking.`
              : ""}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {onUnlockAll && lockedCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleUnlockAll}
              disabled={unlockingAll}
            >
              {unlockingAll ? "Unlocking..." : `Unlock legacy (${lockedCount})`}
            </Button>
          )}
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            Buy credits
          </Button>
        </div>
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Buy credits</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
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
                  "relative rounded-lg border p-4 text-left transition hover:bg-accent",
                  p.most_popular && "border-foreground/60 ring-1 ring-foreground/40",
                  buying === p.id && "opacity-60",
                )}
              >
                {p.most_popular && (
                  <Badge className="absolute -top-2 right-3">
                    Most popular
                  </Badge>
                )}
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {p.label}
                </div>
                <div className="mt-1 text-xl font-semibold">
                  {p.credits} credits
                </div>
                <div className="text-sm">{formatPrice(p.amount_cents)}</div>
                <div className="mt-2 text-xs text-muted-foreground">
                  {perCreditPrice(p.amount_cents, p.credits)}
                </div>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Secure checkout powered by Stripe. Credits arrive in your balance
            seconds after the payment confirms.
          </p>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
