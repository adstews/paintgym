"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { BuyCreditsDialog } from "./buy-credits-dialog";
import type { UserProfile } from "@/lib/types";

interface Props {
  profile: UserProfile;
  lockedCount: number;
  onProfileChange: (profile: UserProfile) => void;
  onUnlockAll?: () => Promise<void>;
}

export function CreditsPanel({
  profile,
  lockedCount,
  onUnlockAll,
}: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [unlockingAll, setUnlockingAll] = useState(false);

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
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            Briefs are free. One credit per generated image (screenshot concepts
            are free).
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

      <BuyCreditsDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
