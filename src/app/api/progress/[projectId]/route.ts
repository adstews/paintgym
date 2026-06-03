import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Job } from "@/lib/types";

export const runtime = "nodejs";

interface Ctx {
  params: Promise<{ projectId: string }>;
}

// Lightweight queue status for the progress UI. Deliberately omits image data
// and prompt text (those arrive via the process-queue tick responses), so this
// can be polled every couple of seconds cheaply.
export async function GET(_request: Request, ctx: Ctx) {
  const { projectId } = await ctx.params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: project } = await supabase
    .from("projects")
    .select("user_id")
    .eq("id", projectId)
    .single();
  if (!project || project.user_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  // RLS (jobs_owner_select) scopes this to the caller's projects.
  const { data: jobRows } = await supabase
    .from("jobs")
    .select(
      "id, generation_id, concept_id, concept_variant, type, status, attempts, max_attempts, error, created_at",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  const jobs = (jobRows ?? []) as Partial<Job>[];

  const counts = { pending: 0, processing: 0, completed: 0, failed: 0, total: jobs.length };
  for (const j of jobs) {
    if (j.status && j.status in counts) {
      counts[j.status as "pending" | "processing" | "completed" | "failed"] += 1;
    }
  }

  return NextResponse.json({
    counts,
    active: counts.pending + counts.processing,
    jobs,
  });
}
