import { NextResponse } from "next/server";
import { z } from "zod";
import { extractProductDataFromHtml, fetchSiteHtml } from "@/lib/scrape";
import { extractBrand } from "@/lib/brand-extract";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 30;

const bodySchema = z.object({ url: z.string().url() });

// Public, unauthenticated product scraper for the /tools/url-scraper demo.
// Rate limited to 3 scrapes per IP per day.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_url" }, { status: 400 });
  }

  const ip = getClientIp(request);
  const rl = await checkRateLimit(ip, "scrape", 3);
  if (!rl.allowed) {
    return NextResponse.json(
      {
        error: "rate_limited",
        message:
          "You have used all 3 free scrapes for today. Sign up to scrape unlimited products.",
      },
      { status: 429 },
    );
  }

  try {
    const html = await fetchSiteHtml(parsed.data.url);
    const product = extractProductDataFromHtml(html, parsed.data.url);
    const brand = extractBrand(html);
    return NextResponse.json({
      data: {
        name: product.name ?? null,
        price: product.price ?? null,
        description: product.description ?? null,
        features: product.features ?? [],
        images: (product.images ?? []).slice(0, 6),
      },
      brand: {
        colors: brand.colors.slice(0, 6),
        fonts: brand.fonts.slice(0, 3),
      },
      remaining: rl.remaining,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "scrape_failed",
        message:
          err instanceof Error
            ? err.message
            : "Could not read that page. Try a direct product URL.",
      },
      { status: 502 },
    );
  }
}
