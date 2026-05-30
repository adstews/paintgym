import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";
import { AdminShell } from "@/components/admin/admin-shell";
import { Toaster } from "@/components/ui/sonner";

export const metadata = { title: "Admin — paintgym" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (!isAdminEmail(user.email)) notFound();

  return (
    <>
      <AdminShell email={user.email ?? ""}>{children}</AdminShell>
      <Toaster />
    </>
  );
}
