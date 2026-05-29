import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NewProjectDialog } from "@/components/projects/new-project-dialog";
import type { Project } from "@/lib/types";

export const metadata = { title: "Projects — paintgym" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });

  const list = (projects ?? []) as Project[];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="text-sm text-muted-foreground">
            Generate ad creative briefs and images from any product page.
          </p>
        </div>
        <NewProjectDialog />
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <p className="text-muted-foreground">
              You have no projects yet.
            </p>
            <div className="flex justify-center">
              <NewProjectDialog />
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`} className="block">
              <Card className="h-full transition hover:border-foreground/30">
                <CardHeader>
                  <CardTitle className="text-base">{p.name}</CardTitle>
                  {p.client_name && (
                    <Badge variant="secondary" className="w-fit">
                      {p.client_name}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  {p.product_url ? (
                    <span className="truncate block">{p.product_url}</span>
                  ) : (
                    <span>No product URL yet</span>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
