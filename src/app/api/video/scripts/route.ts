import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const sceneSchema = z.object({
  scene_number: z.number(),
  timecode: z.string(),
  label: z.string(),
  description: z.string(),
  duration_seconds: z.number().optional(),
});

const bodySchema = z.object({
  video_project_id: z.string().uuid(),
  hook_text: z.string(),
  full_script: z.string(),
  scene_breakdown: z.array(sceneSchema),
  angle: z
    .enum([
      "problem_agitation",
      "transformation",
      "product_demo",
      "social_proof",
      "lifestyle_aspiration",
    ])
    .nullable()
    .optional(),
  is_favorite: z.boolean().optional(),
});

// Save a script under a video project. RLS confirms the project belongs to the
// caller, so a forged video_project_id is rejected by the insert policy.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("video_scripts")
    .insert({
      video_project_id: parsed.data.video_project_id,
      hook_text: parsed.data.hook_text,
      full_script: parsed.data.full_script,
      scene_breakdown: parsed.data.scene_breakdown,
      angle: parsed.data.angle ?? null,
      is_favorite: parsed.data.is_favorite ?? true,
    })
    .select("*")
    .single();

  if (error) {
    console.error("[video/scripts] insert", error);
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ script: data });
}
