import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  extractProductDataFromHtml,
  fetchSiteHtml,
} from "@/lib/scrape";
import { extractBrand } from "@/lib/brand-extract";
import { analyzeBrandVoice } from "@/lib/anthropic/analyze-brand-voice";
import { scrapeRequestSchema } from "@/lib/validators/schemas";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = scrapeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { url, project_id } = parsed.data;

  try {
    const html = await fetchSiteHtml(url);
    const productData = extractProductDataFromHtml(html, url);
    const brand = extractBrand(html);
    const brandVoicePromise = analyzeBrandVoice(brand.text_sample).catch(
      () => null,
    );
    const brandVoice = await brandVoicePromise;

    if (project_id) {
      const updates: Record<string, unknown> = {
        product_url: url,
        product_data: productData,
      };
      if (productData.name) updates.product_name = productData.name;
      if (productData.description)
        updates.product_description = productData.description;
      if (productData.price) updates.price_point = productData.price;
      if (brand.colors.length > 0) updates.brand_colors = brand.colors;
      if (brand.fonts.length > 0) updates.brand_fonts = brand.fonts;
      if (brandVoice) updates.brand_voice = brandVoice;

      const { error } = await supabase
        .from("projects")
        .update(updates)
        .eq("id", project_id)
        .eq("user_id", user.id);
      if (error) {
        return NextResponse.json(
          { error: "save_failed", message: error.message },
          { status: 500 },
        );
      }
    }

    return NextResponse.json({
      data: productData,
      brand: {
        colors: brand.colors,
        fonts: brand.fonts,
        voice: brandVoice,
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "scrape_failed",
        message: err instanceof Error ? err.message : "unknown",
      },
      { status: 502 },
    );
  }
}
