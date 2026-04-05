// src/app/api/v1/templates/route.ts
import { NextRequest, NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

/**
 * GET: List templates visible to the tenant (own templates + public templates).
 * POST: Create a new template.
 */

export async function GET(request: NextRequest) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") ?? undefined;

    const templates = await prisma.productTemplate.findMany({
      where: {
        OR: [
          { tenantId: tenant.id },
          { isPublic: true },
        ],
        ...(category ? { category } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Error listing templates:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      description,
      category,
      productSchema,
      pricingParams,
      renderConfig,
      defaultConfig,
      isPublic,
    } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (!category || typeof category !== "string") {
      return NextResponse.json({ error: "category is required" }, { status: 400 });
    }

    const slug = slugify(name);

    // Check slug uniqueness
    const existing = await prisma.productTemplate.findUnique({
      where: { slug },
    });
    if (existing) {
      return NextResponse.json(
        { error: `A template with slug "${slug}" already exists` },
        { status: 409 }
      );
    }

    const template = await prisma.productTemplate.create({
      data: {
        tenantId: tenant.id,
        name,
        slug,
        category,
        ...(description !== undefined ? { description } : {}),
        ...(productSchema !== undefined ? { productSchema } : {}),
        ...(pricingParams !== undefined ? { pricingParams } : {}),
        ...(renderConfig !== undefined ? { renderConfig } : {}),
        ...(defaultConfig !== undefined ? { defaultConfig } : {}),
        ...(isPublic !== undefined ? { isPublic } : {}),
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
