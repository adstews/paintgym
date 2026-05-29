import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { scrapeProduct } from "@/lib/scrape";
import { scrapeRequestSchema } from "@/lib/validators/schemas";

export const runtime = "nodejs";

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
    const data = await scrapeProduct(url);

    if (project_id) {
      const updates: Record<string, unknown> = {
        product_url: url,
        product_data: data,
      };
      if (data.name) updates.product_name = data.name;
      if (data.description) updates.product_description = data.description;
      if (data.price) updates.price_point = data.price;

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

    return NextResponse.json({ data });
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
