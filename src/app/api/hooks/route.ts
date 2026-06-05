import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Hook } from "@/lib/hooks";

export const runtime = "nodejs";

// Return the active hook bank (universal hooks have concept_id = null). The user
// picks one before Claude writes a brief so the opening leads with a proven hook.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("hooks")
    .select("*")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) {
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
  return NextResponse.json({ hooks: (data ?? []) as Hook[] });
}
