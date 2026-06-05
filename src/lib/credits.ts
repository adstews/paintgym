import { createAdminClient } from "@/lib/supabase/admin";
import {
  CREDIT_PACKS,
  GENERATION_CREDIT_COST,
  INITIAL_FREE_CREDITS,
  REGEN_FREE_BUDGET,
  REGENERATION_CREDIT_COST,
  UNLOCK_ALL_DISCOUNT,
} from "@/lib/types";
import type { CreditPack, UserProfile } from "@/lib/types";

// All credit logic runs through the admin client. RLS would block the
// user_profiles upsert needed on first sign-in (for users that predated the
// auth trigger) and cross-table aggregates are admin-only.

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

export interface CreditCheck {
  allowed: boolean;
  reason?: string;
  balance: number;
  required: number;
}

// Ensures the user has at least `required` credits (a credit amount, which may
// be fractional for regenerations). The actual deduction happens after the
// generation succeeds via deductCredits.
export async function checkGenerationCredits(
  userId: string,
  required: number = GENERATION_CREDIT_COST,
): Promise<CreditCheck> {
  const profile = await ensureProfile(userId);
  if (profile.credit_balance < required) {
    return {
      allowed: false,
      balance: profile.credit_balance,
      required,
      reason: `Need ${required} credit${required === 1 ? "" : "s"} to generate. You have ${profile.credit_balance}. Buy more to keep going.`,
    };
  }
  return { allowed: true, balance: profile.credit_balance, required };
}

// First image of a concept/variant costs a full credit; any later version
// (regenerate, refine, retry) costs half. Version is 1-based and scoped to the
// concept/variant, so version > 1 means an image already existed.
export function generationCreditCost(version: number): number {
  return version > 1 ? REGENERATION_CREDIT_COST : GENERATION_CREDIT_COST;
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

// A free regeneration: atomically spend one unit of a project's regen_budget.
// Returns whether a free regen was applied and the budget left afterward. The
// decrement happens in a single SQL UPDATE (consume_regen_budget RPC) so a
// double-click cannot spend the same unit twice.
export interface RegenBudgetResult {
  used: boolean;
  remaining: number;
}

export async function consumeRegenBudget(
  projectId: string,
): Promise<RegenBudgetResult> {
  const admin = createAdminClient();
  const { data, error } = await admin.rpc("consume_regen_budget", {
    p_project_id: projectId,
  });
  // RPC returns the new budget when a unit was spent, or null when it was 0.
  if (!error && typeof data === "number") {
    return { used: true, remaining: data };
  }
  // Nothing consumed (budget was 0, or the RPC errored): report the current
  // value so callers can still surface "0 free regenerations remaining".
  const { data: row } = await admin
    .from("projects")
    .select("regen_budget")
    .eq("id", projectId)
    .single();
  return { used: false, remaining: (row?.regen_budget as number | undefined) ?? 0 };
}

// Reset a project's free-regeneration budget. Called when a full batch finishes
// so each completed batch ships with a fresh allotment of free regens.
export async function grantRegenBudget(
  projectId: string,
  amount: number = REGEN_FREE_BUDGET,
): Promise<number> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("projects")
    .update({ regen_budget: amount })
    .eq("id", projectId);
  // If the update failed (e.g. the regen_budget column does not exist yet on a
  // deploy that predates the migration), report 0 so the UI never advertises
  // free regenerations that were not actually persisted.
  return error ? 0 : amount;
}

export function findPack(id: string): CreditPack | undefined {
  return CREDIT_PACKS.find((p) => p.id === id);
}

export function computeUnlockAllCost(lockedCount: number): number {
  if (lockedCount <= 0) return 0;
  return Math.max(1, Math.ceil(lockedCount * UNLOCK_ALL_DISCOUNT));
}
