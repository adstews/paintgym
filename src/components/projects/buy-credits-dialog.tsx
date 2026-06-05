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

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

function perCreditPrice(cents: number, credits: number): string {
  return `$${(cents / 100 / credits).toFixed(2)} per credit`;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  intro?: string;
}

// Shared credit-pack purchase dialog. Used by the credits panel and by the
// image-generation paywall (which opens it for users with no credits).
export function BuyCreditsDialog({
  open,
  onOpenChange,
  title = "Buy credits",
  intro = "One credit per image generation. Credits never expire. Failed renders never cost a credit.",
}: Props) {
  const [buying, setBuying] = useState<string | null>(null);

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            <span className="pg-h2">{title}</span>
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          {intro}
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
        <p
          className="pg-mono"
          style={{ fontSize: 10, color: "var(--muted)", letterSpacing: ".04em" }}
        >
          Secure checkout powered by Stripe. Credits arrive in your balance
          seconds after the payment confirms.
        </p>
      </DialogContent>
    </Dialog>
  );
}
