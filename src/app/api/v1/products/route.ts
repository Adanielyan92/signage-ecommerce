import { NextRequest, NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import {
  channelLetterProducts,
  litShapeProducts,
  cabinetProducts,
  dimensionalProducts,
  logoProducts,
  printProducts,
  signPostProducts,
  lightBoxProducts,
  bladeProducts,
  neonProducts,
  bannerProducts,
  type AnyProduct,
} from "@/engine/product-definitions";

/**
 * Map hardcoded product definitions to match the DB-driven API response shape.
 */
function getHardcodedProducts(category?: string, slug?: string) {
  const allProducts: (AnyProduct & { category?: string })[] = [
    ...channelLetterProducts.map((p) => ({ ...p, category: "CHANNEL_LETTERS" })),
    ...litShapeProducts,
    ...cabinetProducts,
    ...dimensionalProducts,
    ...logoProducts,
    ...printProducts,
    ...signPostProducts,
    ...lightBoxProducts,
    ...bladeProducts,
    ...neonProducts,
    ...bannerProducts,
  ];

  let filtered = allProducts;
  if (category) {
    filtered = filtered.filter((p) => p.category === category);
  }
  if (slug) {
    filtered = filtered.filter((p) => p.slug === slug);
  }

  return filtered.map((p) => ({
    id: `hardcoded-${p.slug}`,
    slug: p.slug,
    name: p.name,
    description: p.description,
    category: p.category ?? "CHANNEL_LETTERS",
    isActive: true,
    pricingParams: p.pricingParams,
    options: "options" in p ? p.options : [],
    pricingFormula: null,
    sortOrder: 0,
  }));
}

export async function GET(request: NextRequest) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") ?? undefined;
    const slug = searchParams.get("slug") ?? undefined;
    const activeParam = searchParams.get("active");
    const isActive =
      activeParam === "true" ? true : activeParam === "false" ? false : undefined;

    // Try database first; fall back to hardcoded definitions on failure
    try {
      const products = await prisma.product.findMany({
        where: {
          tenantId: tenant.id,
          ...(category !== undefined ? { category } : {}),
          ...(slug ? { slug } : {}),
          ...(isActive !== undefined ? { isActive } : {}),
        },
        include: {
          pricingFormula: {
            select: { id: true, name: true, type: true },
          },
        },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });

      return NextResponse.json({ products });
    } catch {
      // Database unavailable — serve hardcoded product definitions
      console.warn("Database unavailable for products listing, using hardcoded definitions");
      const products = getHardcodedProducts(category, slug);
      return NextResponse.json({ products });
    }
  } catch (error) {
    console.error("Error listing products:", error);
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
    const { name, slug, category, description, productSchema, pricingParams, renderConfig, pricingFormulaId } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (!slug || typeof slug !== "string") {
      return NextResponse.json({ error: "slug is required" }, { status: 400 });
    }
    if (!category || typeof category !== "string") {
      return NextResponse.json({ error: "category is required" }, { status: 400 });
    }

    // Check for slug uniqueness within this tenant
    const existing = await prisma.product.findUnique({
      where: { tenantId_slug: { tenantId: tenant.id, slug } },
    });
    if (existing) {
      return NextResponse.json(
        { error: `A product with slug "${slug}" already exists` },
        { status: 409 }
      );
    }

    const product = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        name,
        slug,
        category,
        ...(description !== undefined ? { description } : {}),
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

    return NextResponse.json({ product }, { status: 201 });
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
