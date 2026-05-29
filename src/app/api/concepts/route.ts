import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { conceptUpsertSchema } from "@/lib/validators/schemas";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { data, error } = await supabase
    .from("concepts")
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = conceptUpsertSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("concepts")
    .insert({
      ...parsed.data,
      user_id: user.id,
      is_default: false,
    })
    .select("id")
    .single();
  if (error || !data) {
    return NextResponse.json(
      { error: "create_failed", message: error?.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ id: data.id });
}
