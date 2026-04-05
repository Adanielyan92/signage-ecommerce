// src/app/api/v1/stock-parts/[partId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ partId: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { partId } = await params;
    const body = await request.json();

    // Only allow editing own tenant's parts (not platform-level)
    const existing = await prisma.stockPart.findFirst({
      where: { id: partId, tenantId: admin.tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Part not found" }, { status: 404 });
    }

    const { name, description, previewImageUrl, glbUrl, metadata, isActive } = body;

    const updated = await prisma.stockPart.update({
      where: { id: partId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(previewImageUrl !== undefined ? { previewImageUrl } : {}),
        ...(glbUrl !== undefined ? { glbUrl } : {}),
        ...(metadata !== undefined ? { metadata } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    return NextResponse.json({ part: updated });
  } catch (error) {
    console.error("Error updating stock part:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ partId: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { partId } = await params;

    const existing = await prisma.stockPart.findFirst({
      where: { id: partId, tenantId: admin.tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Part not found" }, { status: 404 });
    }

    await prisma.stockPart.delete({ where: { id: partId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting stock part:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
