import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { auth } from "@clerk/nextjs/server";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_ROLES = new Set(["admin", "director", "teacher-admin", "teacher", "student"]);

const ALLOWED_MIME_TYPES = new Set([
  // Images
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  // Documents
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp",
  ".pdf", ".doc", ".docx", ".txt",
]);

function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(request: NextRequest) {
  const { userId, sessionClaims } = await auth();
  const role = (sessionClaims?.metadata as { role?: string })?.role;

  if (!userId || !ALLOWED_ROLES.has(role || "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const threadId = formData.get("threadId") as string | null;

  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "File type not allowed. Use images (jpg, png, gif, webp) or documents (pdf, doc, docx, txt)" },
      { status: 400 }
    );
  }

  const ext = "." + (file.name.split(".").pop() ?? "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json({ error: "File extension not allowed" }, { status: 400 });
  }

  const safeName = sanitizeFilename(file.name);
  const folder = threadId ? `chat/${threadId}` : "chat";
  const storagePath = `${folder}/${Date.now()}-${safeName}`;

  const blob = await put(storagePath, file, { access: "public" });

  return NextResponse.json({ url: blob.url });
}
