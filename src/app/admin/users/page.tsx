import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Admin Users — paintgym" };

export default function AdminUsersPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <p className="text-sm text-muted-foreground">
          User management is on the roadmap.
        </p>
      </div>
      <Card>
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          Coming soon. For now, manage user access via the ADMIN_EMAILS env var.
        </CardContent>
      </Card>
    </div>
  );
}
