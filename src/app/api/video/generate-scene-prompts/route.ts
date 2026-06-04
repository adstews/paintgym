import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateScenePrompts } from "@/lib/video/generate-scene-prompts";

export const runtime = "nodejs";
export const maxDuration = 120;

const sceneSchema = z.object({
  scene_number: z.number(),
  timecode: z.string(),
  label: z.string(),
  description: z.string(),
  duration_seconds: z.number().optional(),
});

const bodySchema = z.object({
  format: z.enum([
    "ugc",
    "claymation",
    "cartoon",
    "lofi",
    "talking_head",
    "cinematic",
  ]),
  scenes: z.array(sceneSchema).min(1),
  product: z.object({
    product_name: z.string().optional(),
    product_url: z.string().optional(),
    description: z.string().optional(),
    audience: z.string().optional(),
    benefits: z.string().optional(),
    price: z.string().optional(),
  }),
});

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

  try {
    const prompts = await generateScenePrompts(
      parsed.data.format,
      parsed.data.scenes,
      parsed.data.product,
    );
    return NextResponse.json({ prompts });
  } catch (err) {
    console.error("[video/generate-scene-prompts]", err);
    return NextResponse.json(
      { error: "generation_failed", message: "Could not write the scene prompts. Try again." },
      { status: 500 },
    );
  }
}
