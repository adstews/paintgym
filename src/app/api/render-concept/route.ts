import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderConceptToDataUrl } from "@/lib/html-render/render";
import { RENDER_SCHEMAS } from "@/lib/html-render/types";
import type { HtmlRenderType } from "@/lib/html-render/types";

export const runtime = "nodejs";
// Headless screenshot render — give it room for cold-start of chromium.
export const maxDuration = 120;

// Render one of the eight HTML concepts to a 1080x1350 PNG (data URL). Takes the
// concept type + the structured on-screen content Claude wrote. No image-model
// cost. Used directly by the generation pipeline; exposed here too so the
// renderer can be driven on its own.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await request.json().catch(() => null)) as {
    type?: string;
    content?: unknown;
  } | null;
  if (!body || typeof body.type !== "string") {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const type = body.type as HtmlRenderType;
  if (!(type in RENDER_SCHEMAS)) {
    return NextResponse.json({ error: "unknown_type" }, { status: 400 });
  }

  const parsed = RENDER_SCHEMAS[type].safeParse(body.content);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_content", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  try {
    const image_url = await renderConceptToDataUrl(type, parsed.data);
    return NextResponse.json({ image_url });
  } catch (err) {
    return NextResponse.json(
      {
        error: "render_failed",
        message: err instanceof Error ? err.message : "render failed",
      },
      { status: 502 },
    );
  }
}
