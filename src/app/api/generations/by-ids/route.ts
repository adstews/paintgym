import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generationsByIdsSchema } from "@/lib/validators/schemas";
import type { Generation } from "@/lib/types";

export const runtime = "nodejs";

// Fetch specific generation rows by id (item 6 — progressive image loading).
// The batch progress poll uses this to pull in generations that have finished
// rendering so each card can appear as soon as its job completes, instead of
// waiting for the long process-queue tick to return. RLS scopes rows to the
// caller's own projects.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = generationsByIdsSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { data } = await supabase
    .from("generations")
    .select("*")
    .in("id", parsed.data.ids);

  return NextResponse.json({ generations: (data ?? []) as Generation[] });
}
