import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Admin Settings — paintgym" };

export default function AdminSettingsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Workspace-wide settings will live here.
        </p>
      </div>
      <Card>
        <CardContent className="py-16 text-center text-sm text-muted-foreground">
          Coming soon.
        </CardContent>
      </Card>
    </div>
  );
}
