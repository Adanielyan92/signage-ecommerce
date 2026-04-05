// src/app/api/v1/templates/[templateId]/clone/route.ts
import { NextRequest, NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { slugify } from "@/lib/utils";

/**
 * POST: Clone a template into a new Product for this tenant.
 *
 * Body (optional overrides):
 *   - name: string (defaults to template name)
 *   - slug: string (defaults to slugified name)
 *   - pricingFormulaId: string (optional, link to a pricing formula)
 */
export async function POST(
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

    const body = await request.json().catch(() => ({}));
    const name = (body.name as string) || template.name;
    const slug = (body.slug as string) || slugify(name);
    const pricingFormulaId = body.pricingFormulaId as string | undefined;

    // Check slug uniqueness within tenant
    const existingProduct = await prisma.product.findUnique({
      where: { tenantId_slug: { tenantId: tenant.id, slug } },
    });
    if (existingProduct) {
      return NextResponse.json(
        { error: `A product with slug "${slug}" already exists for this tenant` },
        { status: 409 }
      );
    }

    const product = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        name,
        slug,
        category: template.category,
        description: template.description,
        productSchema: template.productSchema as Prisma.InputJsonValue ?? undefined,
        pricingParams: template.pricingParams as Prisma.InputJsonValue ?? undefined,
        renderConfig: template.renderConfig as Prisma.InputJsonValue ?? undefined,
        imageUrl: template.thumbnailUrl,
        ...(pricingFormulaId ? { pricingFormulaId } : {}),
      },
      include: {
        pricingFormula: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    return NextResponse.json(
      {
        product,
        clonedFromTemplate: { id: template.id, name: template.name },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error cloning template:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
