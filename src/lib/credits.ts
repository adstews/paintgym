import { createAdminClient } from "@/lib/supabase/admin";
import {
  CREDIT_PACKS,
  FREE_GENERATION_LIMIT,
  FREE_PROJECT_LIMIT,
  INITIAL_FREE_CREDITS,
  UNLOCK_ALL_DISCOUNT,
} from "@/lib/types";
import type { CreditPack, UserProfile } from "@/lib/types";

// All credit + tier logic runs through the admin client. RLS would block
// cross-table aggregates and the user_profiles write path needs to be
// idempotent on first sign-in for users that predated the trigger.

export interface ProfileWithUsage extends UserProfile {
  generation_count: number;
  project_count: number;
}

export async function ensureProfile(userId: string): Promise<UserProfile> {
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("user_profiles")
    .select("user_id, credit_balance, stripe_customer_id")
    .eq("user_id", userId)
    .single();
  if (existing) {
    const { count } = await admin
      .from("credit_purchases")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    return {
      user_id: existing.user_id,
      credit_balance: existing.credit_balance,
      stripe_customer_id: existing.stripe_customer_id ?? null,
      has_purchased: (count ?? 0) > 0,
    };
  }
  const { data: inserted, error } = await admin
    .from("user_profiles")
    .insert({ user_id: userId, credit_balance: INITIAL_FREE_CREDITS })
    .select("user_id, credit_balance, stripe_customer_id")
    .single();
  if (error || !inserted) {
    throw new Error(error?.message ?? "Failed to create profile");
  }
  return {
    user_id: inserted.user_id,
    credit_balance: inserted.credit_balance,
    stripe_customer_id: inserted.stripe_customer_id ?? null,
    has_purchased: false,
  };
}

export async function loadProfileWithUsage(
  userId: string,
): Promise<ProfileWithUsage> {
  const profile = await ensureProfile(userId);
  const admin = createAdminClient();
  const [{ count: genCount }, { count: projCount }] = await Promise.all([
    admin
      .from("generations")
      .select("id, projects!inner(user_id)", { count: "exact", head: true })
      .eq("projects.user_id", userId),
    admin
      .from("projects")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);
  return {
    ...profile,
    generation_count: genCount ?? 0,
    project_count: projCount ?? 0,
  };
}

export interface TierCheck {
  allowed: boolean;
  reason?: string;
}

export async function checkGenerationAllowed(
  userId: string,
  newGenerations = 1,
): Promise<TierCheck> {
  const usage = await loadProfileWithUsage(userId);
  if (usage.has_purchased) return { allowed: true };
  if (usage.generation_count + newGenerations > FREE_GENERATION_LIMIT) {
    return {
      allowed: false,
      reason: `Free preview limit reached (${FREE_GENERATION_LIMIT} generations). Buy credits to keep generating.`,
    };
  }
  return { allowed: true };
}

export async function checkProjectCreationAllowed(
  userId: string,
): Promise<TierCheck> {
  const usage = await loadProfileWithUsage(userId);
  if (usage.has_purchased) return { allowed: true };
  if (usage.project_count >= FREE_PROJECT_LIMIT) {
    return {
      allowed: false,
      reason: `Free tier is limited to ${FREE_PROJECT_LIMIT} project. Buy credits to unlock more.`,
    };
  }
  return { allowed: true };
}

export interface DeductResult {
  ok: boolean;
  new_balance?: number;
  reason?: string;
}

export async function deductCredits(
  userId: string,
  amount: number,
): Promise<DeductResult> {
  if (amount <= 0) return { ok: true, new_balance: 0 };
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("credit_balance")
    .eq("user_id", userId)
    .single();
  if (!profile) {
    return { ok: false, reason: "Profile missing" };
  }
  if (profile.credit_balance < amount) {
    return {
      ok: false,
      new_balance: profile.credit_balance,
      reason: "Insufficient credits",
    };
  }
  const next = profile.credit_balance - amount;
  const { error: updErr } = await admin
    .from("user_profiles")
    .update({ credit_balance: next, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (updErr) {
    return { ok: false, reason: updErr.message };
  }
  return { ok: true, new_balance: next };
}

export async function addCredits(
  userId: string,
  amount: number,
): Promise<number> {
  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("user_profiles")
    .select("credit_balance")
    .eq("user_id", userId)
    .single();
  const current = profile?.credit_balance ?? 0;
  const next = current + amount;
  await admin
    .from("user_profiles")
    .upsert(
      {
        user_id: userId,
        credit_balance: next,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  return next;
}

export function findPack(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}

export function computeUnlockAllCost(lockedCount: number): number {
  if (lockedCount <= 0) return 0;
  return Math.max(1, Math.ceil(lockedCount * UNLOCK_ALL_DISCOUNT));
}
