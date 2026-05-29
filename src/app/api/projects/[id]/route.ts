import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as Record<
    string,
    unknown
  > | null;
  if (!body) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const allowed: Record<string, unknown> = {};
  for (const key of [
    "name",
    "client_name",
    "product_url",
    "product_data",
    "logo_url",
  ]) {
    if (key in body) allowed[key] = body[key];
  }

  const { error } = await supabase
    .from("projects")
    .update(allowed)
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
