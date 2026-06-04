import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateScripts } from "@/lib/video/generate-scripts";

export const runtime = "nodejs";
export const maxDuration = 120;

const bodySchema = z.object({
  format: z.enum([
    "ugc",
    "claymation",
    "cartoon",
    "lofi",
    "talking_head",
    "cinematic",
  ]),
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

  if (!parsed.data.product.product_name && !parsed.data.product.description) {
    return NextResponse.json(
      { error: "missing_product", message: "Add a product name or description first." },
      { status: 422 },
    );
  }

  try {
    const scripts = await generateScripts(
      parsed.data.format,
      parsed.data.product,
    );
    return NextResponse.json({ scripts });
  } catch (err) {
    console.error("[video/generate-scripts]", err);
    return NextResponse.json(
      { error: "generation_failed", message: "Could not write the scripts. Try again." },
      { status: 500 },
    );
  }
}
