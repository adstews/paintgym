import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { reviewImageSchema } from "@/lib/validators/schemas";
import { reviewGeneration } from "@/lib/qa/review-generation";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = reviewImageSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const outcome = await reviewGeneration(
    supabase,
    parsed.data.generation_id,
    user.id,
  );
  if (outcome.not_found) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (outcome.missing_image) {
    return NextResponse.json(
      { error: "missing_image", generations: outcome.generations },
      { status: 422 },
    );
  }
  if (outcome.error) {
    return NextResponse.json(
      { error: outcome.error, generations: outcome.generations },
      { status: 500 },
    );
  }

  return NextResponse.json({
    generations: outcome.generations,
    ...(outcome.rewrite_error ? { rewrite_error: outcome.rewrite_error } : {}),
  });
}
