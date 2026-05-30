import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdminEmail } from "@/lib/admin";
import { adminConceptCreateSchema } from "@/lib/validators/schemas";
import type { Concept } from "@/lib/types";

export const runtime = "nodejs";

export interface ConceptWithUsage extends Concept {
  project_count: number;
  generation_count: number;
}

async function requireAdmin(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isAdminEmail(user.email)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const denial = await requireAdmin();
  if (denial) return denial;

  const admin = createAdminClient();

  const { data: concepts, error } = await admin
    .from("concepts")
    .select("*")
    .eq("is_default", true)
    .order("sort_order", { ascending: true });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: pcRows } = await admin
    .from("project_concepts")
    .select("concept_id, project_id, enabled")
    .eq("enabled", true);

  const { data: genRows } = await admin
    .from("generations")
    .select("concept_id");

  const projectCount = new Map<string, Set<string>>();
  for (const row of pcRows ?? []) {
    const id = (row as { concept_id: string; project_id: string }).concept_id;
    const pid = (row as { project_id: string }).project_id;
    const set = projectCount.get(id) ?? new Set<string>();
    set.add(pid);
    projectCount.set(id, set);
  }

  const generationCount = new Map<string, number>();
  for (const row of genRows ?? []) {
    const id = (row as { concept_id: string }).concept_id;
    generationCount.set(id, (generationCount.get(id) ?? 0) + 1);
  }

  const items: ConceptWithUsage[] = ((concepts ?? []) as Concept[]).map((c) => ({
    ...c,
    project_count: projectCount.get(c.id)?.size ?? 0,
    generation_count: generationCount.get(c.id) ?? 0,
  }));

  return NextResponse.json({ data: items });
}

export async function POST(request: Request) {
  const denial = await requireAdmin();
  if (denial) return denial;

  const parsed = adminConceptCreateSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("concepts")
    .insert({
      ...parsed.data,
      is_default: true,
      user_id: null,
    })
    .select("*")
    .single();
  if (error || !data) {
    return NextResponse.json(
      { error: "create_failed", message: error?.message },
      { status: 500 },
    );
  }
  return NextResponse.json({ concept: data });
}
