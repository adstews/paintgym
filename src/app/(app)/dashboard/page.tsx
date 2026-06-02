import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import { Icon } from "@/components/tf/ui";
import type { Project } from "@/lib/types";

export const metadata = { title: "Your gym — paintgym" };

// Training Floor "gym" dashboard. Real projects loaded server-side; real links
// and the real NewProjectDialog preserved — only the skin changed.
export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  const list = (projects ?? []) as Project[];

  if (list.length === 0) {
    return (
      <div className="pg-empty">
        <div className="ix">
          <Icon name="dumbbell" size={28} />
        </div>
        <h3>Empty gym</h3>
        <p>No projects yet. Paste a product URL and train your first wall of ads.</p>
        <NewProjectDialog />
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 16, gap: 12 }}>
        <div>
          <div className="pg-h2" style={{ fontSize: 24 }}>Your gym</div>
          <div className="pg-mono" style={{ fontSize: 11, color: "var(--muted)", marginTop: 5 }}>
            {list.length} project{list.length === 1 ? "" : "s"} trained
          </div>
        </div>
        <NewProjectDialog />
      </div>

      <div className="pg-dash-grid" style={{ padding: 0 }}>
        {list.map((p) => (
          <Link
            key={p.id}
            href={`/projects/${p.id}`}
            className="pg-proj"
            style={{ display: "block", textDecoration: "none", color: "inherit" }}
          >
            <div className="cover" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span
                className="pg-mono"
                style={{ color: "var(--pop)", fontSize: 13, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase" }}
              >
                {(p.product_name || p.brand_name || p.name || "PG").toString().slice(0, 2).toUpperCase()}
              </span>
            </div>
            <div className="meta">
              <h4>{p.name}</h4>
              <div className="row">
                <small style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "68%" }}>
                  {p.product_url || "no product url"}
                </small>
                {p.client_name && <span className="pg-badge pg-badge--outline">{p.client_name}</span>}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
