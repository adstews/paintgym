import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { projectCreateSchema } from "@/lib/validators/schemas";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ data });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = projectCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const product_url =
    parsed.data.product_url && parsed.data.product_url.length > 0
      ? parsed.data.product_url
      : null;

  const { data, error } = await supabase
    .from("projects")
    .insert({
      name: parsed.data.name,
      client_name: parsed.data.client_name ?? null,
      product_url,
      user_id: user.id,
    })
    .select("id")
    .single();
  if (error || !data) {
    return NextResponse.json(
      { error: "create_failed", message: error?.message },
      { status: 500 },
    );
  }

  if (product_url) {
    void (async () => {
      try {
        const { scrapeProduct } = await import("@/lib/scrape");
        const product_data = await scrapeProduct(product_url);
        await supabase
          .from("projects")
          .update({
            product_data,
            product_name: product_data.name ?? null,
            product_description: product_data.description ?? null,
            price_point: product_data.price ?? null,
          })
          .eq("id", data.id)
          .eq("user_id", user.id);
      } catch {
        // Background scrape is best-effort; user can retry from the project page.
      }
    })();
  }

  return NextResponse.json({ id: data.id });
}
