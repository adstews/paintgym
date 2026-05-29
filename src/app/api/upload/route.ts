import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
]);
const BUCKET = "paintgym-assets";

function safeBaseName(name: string): string {
  const stripped = name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return stripped.slice(-80) || "upload";
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "invalid_form" }, { status: 400 });
  }

  const file = formData.get("file");
  const folder = (formData.get("folder") ?? "uploads").toString();
  const safeFolder = folder.replace(/[^a-z0-9_-]/gi, "").slice(0, 40) || "uploads";

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "missing_file" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "empty_file" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file_too_large" }, { status: 413 });
  }
  if (!ALLOWED.has(file.type)) {
    return NextResponse.json({ error: "unsupported_type" }, { status: 415 });
  }

  const baseName = safeBaseName(file.name || "upload");
  const objectPath = `${user.id}/${safeFolder}/${Date.now()}-${crypto.randomUUID()}-${baseName}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, buffer, {
      contentType: file.type,
      upsert: false,
    });
  if (upErr) {
    return NextResponse.json(
      { error: "upload_failed", message: upErr.message },
      { status: 500 },
    );
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(objectPath);
  return NextResponse.json({
    url: pub.publicUrl,
    path: objectPath,
    content_type: file.type,
    size: file.size,
  });
}
