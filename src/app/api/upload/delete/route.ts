import { del } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url) {
      return NextResponse.json({ error: "No file URL provided" }, { status: 400 });
    }

    await del(url);

    return NextResponse.json({ message: "File deleted successfully" });
  } catch (error) {
    console.error("Deletion error:", error);
    return NextResponse.json({ error: "Deletion failed" }, { status: 500 });
  }
}
