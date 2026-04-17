import { del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

// Only allow deletion of files hosted on Vercel Blob
const BLOB_HOSTNAME = "public.blob.vercel-storage.com";

function isBlobUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(BLOB_HOSTNAME) ||
      new URL(url).hostname === BLOB_HOSTNAME;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, sessionClaims } = await auth();
    const role = (sessionClaims?.metadata as { role?: string })?.role;

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!["admin", "director", "teacher", "teacher-admin"].includes(role || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: "No file URL provided" }, { status: 400 });
    }

    if (!isBlobUrl(url)) {
      return NextResponse.json({ error: "Invalid file URL" }, { status: 400 });
    }

    await del(url);

    console.log(JSON.stringify({
      event: "file_deleted",
      userId,
      role,
      url,
      timestamp: new Date().toISOString(),
    }));

    return NextResponse.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Deletion error:", error);
    return NextResponse.json({ error: "Deletion failed" }, { status: 500 });
  }
}
