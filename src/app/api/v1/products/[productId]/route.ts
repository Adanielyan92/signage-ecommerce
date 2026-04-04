import { NextRequest, NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { productId } = await params;

    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId: tenant.id },
      include: {
        pricingFormula: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { productId } = await params;

    // Verify product belongs to this tenant before updating
    const existing = await prisma.product.findFirst({
      where: { id: productId, tenantId: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      slug,
      category,
      description,
      imageUrl,
      isActive,
      sortOrder,
      productSchema,
      pricingParams,
      renderConfig,
      pricingFormulaId,
    } = body;

    // If slug is changing, check uniqueness within this tenant
    if (slug !== undefined && slug !== existing.slug) {
      const slugConflict = await prisma.product.findUnique({
        where: { tenantId_slug: { tenantId: tenant.id, slug } },
      });
      if (slugConflict) {
        return NextResponse.json(
          { error: `A product with slug "${slug}" already exists` },
          { status: 409 }
        );
      }
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(slug !== undefined ? { slug } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(imageUrl !== undefined ? { imageUrl } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        ...(sortOrder !== undefined ? { sortOrder } : {}),
        ...(productSchema !== undefined ? { productSchema } : {}),
        ...(pricingParams !== undefined ? { pricingParams } : {}),
        ...(renderConfig !== undefined ? { renderConfig } : {}),
        ...(pricingFormulaId !== undefined ? { pricingFormulaId } : {}),
      },
      include: {
        pricingFormula: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { productId } = await params;

    // Verify product belongs to this tenant before deleting
    const existing = await prisma.product.findFirst({
      where: { id: productId, tenantId: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    await prisma.product.delete({
      where: { id: productId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
