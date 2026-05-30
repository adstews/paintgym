import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { adminConceptPatchSchema } from "@/lib/validators/schemas";

export const runtime = "nodejs";

interface Ctx {
  params: Promise<{ id: string }>;
}

async function requireAdmin(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isAdminEmail(user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return null;
}

export async function PATCH(request: Request, ctx: Ctx) {
  const denial = await requireAdmin();
  if (denial) return denial;
  const { id } = await ctx.params;

  const parsed = adminConceptPatchSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("concepts")
    .update(parsed.data)
    .eq("id", id)
    .eq("is_default", true)
    .select("*")
    .single();
  if (error || !data) {
    return NextResponse.json(
      { error: "update_failed", message: error?.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ concept: data });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const denial = await requireAdmin();
  if (denial) return denial;
  const { id } = await ctx.params;

  const admin = createAdminClient();

  // Generations reference concepts with on delete restrict. Check up front so
  // we can return a helpful error rather than a raw foreign-key violation.
  const { count } = await admin
    .from("generations")
    .select("id", { count: "exact", head: true })
    .eq("concept_id", id);

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      {
        error: "in_use",
        message: `Cannot delete: ${count} generation${count === 1 ? "" : "s"} reference this concept. Deactivate it instead.`,
      },
      { status: 409 },
    );
  }

  const { error } = await admin
    .from("concepts")
    .delete()
    .eq("id", id)
    .eq("is_default", true);
  if (error) {
    return NextResponse.json(
      { error: "delete_failed", message: error.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ ok: true });
}
