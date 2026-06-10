import { NextResponse } from "next/server";
import { after } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { processQueueSchema } from "@/lib/validators/schemas";
import { drainProject } from "@/lib/queue/drain";
import { isInternalQueueRequest } from "@/lib/queue/internal-auth";

export const runtime = "nodejs";
// after() work counts against the function budget: 110s claim window plus the
// slowest single job (~170s generate) must fit. Same ceiling as /api/generate.
export const maxDuration = 300;

// Server-side queue worker. Responds 202 immediately and drains the project's
// job queue in after(), so generation keeps running with no tab open. Invoked
// by: enqueue (kicks the chain), itself (chain continuation), the progress
// poll (restarts a dead chain), and the daily sweep. Accepts either the
// internal secret (server-to-server) or the project owner's session cookie.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = processQueueSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const { project_id } = parsed.data;

  if (!isInternalQueueRequest(request)) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const { data: project } = await supabase
      .from("projects")
      .select("user_id")
      .eq("id", project_id)
      .single();
    if (!project || project.user_id !== user.id) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
  }

  const origin = new URL(request.url).origin;
  after(async () => {
    try {
      await drainProject(project_id, origin);
    } catch (err) {
      // Swallow: a crashed drain is restarted by the progress poll or sweep.
      console.error("queue worker drain failed", err);
    }
  });

  return NextResponse.json({ ok: true }, { status: 202 });
}
