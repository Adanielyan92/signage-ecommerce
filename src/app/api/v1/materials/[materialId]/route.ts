// src/app/api/v1/materials/[materialId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ materialId: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { materialId } = await params;
    const body = await request.json();

    const existing = await prisma.materialPreset.findFirst({
      where: { id: materialId, tenantId: admin.tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Material preset not found" }, { status: 404 });
    }

    const { name, description, materialType, properties, previewImageUrl, isActive } = body;

    const updated = await prisma.materialPreset.update({
      where: { id: materialId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(materialType !== undefined ? { materialType } : {}),
        ...(properties !== undefined ? { properties } : {}),
        ...(previewImageUrl !== undefined ? { previewImageUrl } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    return NextResponse.json({ preset: updated });
  } catch (error) {
    console.error("Error updating material preset:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ materialId: string }> }
) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { materialId } = await params;

    const existing = await prisma.materialPreset.findFirst({
      where: { id: materialId, tenantId: admin.tenantId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Material preset not found" }, { status: 404 });
    }

    await prisma.materialPreset.delete({ where: { id: materialId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting material preset:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
