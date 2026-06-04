import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const bodySchema = z.object({
  name: z.string().min(1),
  format: z.enum([
    "ugc",
    "claymation",
    "cartoon",
    "lofi",
    "talking_head",
    "cinematic",
  ]),
  project_id: z.string().uuid().nullable().optional(),
  product_details: z.record(z.string(), z.unknown()).optional(),
});

// Create a video project. Used when the user saves their format choice and
// product details so scripts and scenes can hang off a real row.
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
    .from("video_projects")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      format: parsed.data.format,
      project_id: parsed.data.project_id ?? null,
      product_details: parsed.data.product_details ?? {},
    })
    .select("*")
    .single();

  if (error) {
    console.error("[video/projects] insert", error);
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }

  return NextResponse.json({ video_project: data });
}

// List the user's video projects, newest first.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("video_projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "load_failed" }, { status: 500 });
  }
  return NextResponse.json({ video_projects: data ?? [] });
}
