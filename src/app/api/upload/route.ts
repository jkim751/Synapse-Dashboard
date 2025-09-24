import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

export async function POST(request: NextRequest) {
  try {
    // Check if BLOB_READ_WRITE_TOKEN is available
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
      console.error("BLOB_READ_WRITE_TOKEN is not set");
      return NextResponse.json({ error: "Storage configuration missing" }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;
    const folder = formData.get("folder") as string || "general";

    if (!file) {
      return NextResponse.json({ error: "No file received" }, { status: 400 });
    }

    console.log(`Uploading file: ${file.name}, size: ${file.size}, type: ${file.type}`);

    const blob = await put(`uploads/${folder}/${file.name}`, file, {
      access: "public",
    });

    console.log(`File uploaded successfully: ${blob.url}`);

    return NextResponse.json({ 
      url: blob.url,
      message: "File uploaded successfully" 
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ 
      error: "Upload failed", 
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
