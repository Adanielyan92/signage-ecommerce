// src/app/api/v1/fonts/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

/**
 * POST: Upload a TTF font file.
 * Saves to public/fonts/ (dev) or blob storage (prod).
 * Returns the filename and URL.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (!file.name.endsWith(".ttf") && !file.name.endsWith(".otf")) {
      return NextResponse.json(
        { error: "Only .ttf and .otf files are accepted" },
        { status: 400 },
      );
    }

    // Sanitize filename
    const safeName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-");

    // Save to public/fonts/ (local dev storage)
    const fontsDir = path.join(process.cwd(), "public", "fonts");
    await mkdir(fontsDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(fontsDir, safeName);
    await writeFile(filePath, buffer);

    return NextResponse.json({
      fileName: safeName,
      fileUrl: `/fonts/${safeName}`,
    });
  } catch (error) {
    console.error("Error uploading font:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
