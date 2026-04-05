// src/app/api/v1/materials/route.ts
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

    const presets = await prisma.materialPreset.findMany({
      where: {
        OR: [
          { tenantId: tenant.id },
          { tenantId: null },
        ],
        isActive: true,
      },
      orderBy: [{ name: "asc" }],
    });

    return NextResponse.json({ presets });
  } catch (error) {
    console.error("Error listing material presets:", error);
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
    const { name, slug, description, materialType, properties, previewImageUrl } = body;

    if (!name || !slug || !materialType || !properties) {
      return NextResponse.json(
        { error: "name, slug, materialType, and properties are required" },
        { status: 400 },
      );
    }

    const preset = await prisma.materialPreset.create({
      data: {
        tenantId: admin.tenantId,
        name,
        slug,
        description: description ?? null,
        materialType,
        properties,
        previewImageUrl: previewImageUrl ?? null,
      },
    });

    return NextResponse.json({ preset }, { status: 201 });
  } catch (error) {
    console.error("Error creating material preset:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
