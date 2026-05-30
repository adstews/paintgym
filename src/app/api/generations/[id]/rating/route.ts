import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ratingPatchSchema } from "@/lib/validators/schemas";
import type { Generation, Project } from "@/lib/types";

interface Ctx {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = ratingPatchSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { data: gen } = await supabase
    .from("generations")
    .select("id, project_id")
    .eq("id", id)
    .single();
  if (!gen) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: project } = await supabase
    .from("projects")
    .select("user_id")
    .eq("id", (gen as { project_id: string }).project_id)
    .single();
  if (!project || (project as Pick<Project, "user_id">).user_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const patch: {
    rating?: number | null;
    is_favorited?: boolean;
    used_in_ad?: boolean;
  } = {};
  if (parsed.data.rating !== undefined) patch.rating = parsed.data.rating;
  if (parsed.data.is_favorited !== undefined) {
    patch.is_favorited = parsed.data.is_favorited;
  }
  if (parsed.data.used_in_ad !== undefined) {
    patch.used_in_ad = parsed.data.used_in_ad;
  }

  const { data, error } = await supabase
    .from("generations")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();
  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "update_failed" },
      { status: 500 },
    );
  }
  return NextResponse.json({ generation: data as Generation });
}
