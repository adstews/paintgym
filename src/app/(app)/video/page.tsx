import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { VideoWorkspace } from "@/components/video/video-workspace";

export const metadata = { title: "Video studio · paintgym" };

// Standalone AI video ad section. Self-contained and separate from the static
// image pipeline. The workspace is fully client-driven; this server shell only
// guards auth.
export default async function VideoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return <VideoWorkspace />;
}
