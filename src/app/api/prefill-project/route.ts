import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractProductDataFromHtml, fetchSiteHtml } from "@/lib/scrape";
import { extractBrand } from "@/lib/brand-extract";
import { prefillProjectFields } from "@/lib/anthropic/prefill-project";
import { prefillRequestSchema } from "@/lib/validators/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

// Powers the new-project wizard's step 1. Crawls the submitted URL, then asks
// Claude to pre-fill every brief field so the user can click Next through the
// rest of the wizard. Reuses the same scraper + brand extractor as /api/scrape;
// the only new piece is the Claude copy pass. Never persists anything — the
// wizard creates the project at the end.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = prefillRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { url } = parsed.data;

  let html: string;
  try {
    html = await fetchSiteHtml(url);
  } catch (err) {
    return NextResponse.json(
      {
        error: "scrape_failed",
        message: err instanceof Error ? err.message : "Could not load that page",
      },
      { status: 502 },
    );
  }

  const product = extractProductDataFromHtml(html, url);
  const brand = extractBrand(html);

  const { fields, degraded } = await prefillProjectFields({
    url,
    product,
    textSample: brand.text_sample,
  });

  const images = product.images ?? [];

  return NextResponse.json({
    fields,
    brand_colors: brand.colors,
    brand_fonts: brand.fonts,
    images,
    product_image: images[0] ?? null,
    product_data: product,
    degraded,
  });
}
