// src/app/api/v1/fonts/[fontId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ fontId: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fontId } = await params;
    const body = await request.json();

    const existing = await prisma.tenantFont.findFirst({
      where: { id: fontId, tenantId: admin.tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Font not found" }, { status: 404 });
    }

    const { name, isCurved, cssFamily, isActive } = body;

    const updated = await prisma.tenantFont.update({
      where: { id: fontId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(isCurved !== undefined ? { isCurved } : {}),
        ...(cssFamily !== undefined ? { cssFamily } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    return NextResponse.json({ font: updated });
  } catch (error) {
    console.error("Error updating font:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ fontId: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { fontId } = await params;

    const existing = await prisma.tenantFont.findFirst({
      where: { id: fontId, tenantId: admin.tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Font not found" }, { status: 404 });
    }

    await prisma.tenantFont.delete({ where: { id: fontId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting font:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
