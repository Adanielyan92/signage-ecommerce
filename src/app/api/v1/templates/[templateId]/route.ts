// src/app/api/v1/templates/[templateId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { templateId } = await params;

    const template = await prisma.productTemplate.findFirst({
      where: {
        id: templateId,
        OR: [{ tenantId: tenant.id }, { isPublic: true }],
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Error fetching template:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { templateId } = await params;

    // Only allow editing own templates
    const existing = await prisma.productTemplate.findFirst({
      where: { id: templateId, tenantId: tenant.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      description,
      productSchema,
      pricingParams,
      renderConfig,
      defaultConfig,
      isPublic,
      thumbnailUrl,
    } = body;

    const template = await prisma.productTemplate.update({
      where: { id: templateId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(productSchema !== undefined ? { productSchema } : {}),
        ...(pricingParams !== undefined ? { pricingParams } : {}),
        ...(renderConfig !== undefined ? { renderConfig } : {}),
        ...(defaultConfig !== undefined ? { defaultConfig } : {}),
        ...(isPublic !== undefined ? { isPublic } : {}),
        ...(thumbnailUrl !== undefined ? { thumbnailUrl } : {}),
      },
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Error updating template:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { templateId } = await params;

    const existing = await prisma.productTemplate.findFirst({
      where: { id: templateId, tenantId: tenant.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    await prisma.productTemplate.delete({ where: { id: templateId } });

    return NextResponse.json({ message: "Template deleted" });
  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
