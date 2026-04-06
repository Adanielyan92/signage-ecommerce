// src/app/api/v1/fonts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const fonts = await prisma.tenantFont.findMany({
      where: {
        OR: [
          { tenantId: tenant.id },
          { tenantId: null }, // platform-level fonts
        ],
        isActive: true,
      },
      orderBy: [{ source: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ fonts });
  } catch (error) {
    console.error("Error listing fonts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, slug, fileName, fileUrl, source, isCurved, cssFamily } = body;

    if (!name || !slug || !fileName) {
      return NextResponse.json(
        { error: "name, slug, and fileName are required" },
        { status: 400 },
      );
    }

    const font = await prisma.tenantFont.create({
      data: {
        tenantId: admin.tenantId,
        name,
        slug,
        fileName,
        fileUrl: fileUrl ?? null,
        source: source ?? "CUSTOM",
        isCurved: isCurved ?? false,
        cssFamily: cssFamily ?? null,
      },
    });

    return NextResponse.json({ font }, { status: 201 });
  } catch (error) {
    console.error("Error creating font:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
