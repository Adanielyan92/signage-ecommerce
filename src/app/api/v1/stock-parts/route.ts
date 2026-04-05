// src/app/api/v1/stock-parts/route.ts
import { NextRequest, NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

/**
 * GET: List stock parts available to the tenant (own + platform-level).
 * POST: Create a new stock part (admin only, creates tenant-scoped part).
 */
export async function GET(request: NextRequest) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") ?? undefined;

    const parts = await prisma.stockPart.findMany({
      where: {
        OR: [
          { tenantId: tenant.id },
          { tenantId: null }, // platform-level parts
        ],
        ...(category ? { category: category as never } : {}),
        isActive: true,
      },
      orderBy: [{ category: "asc" }, { name: "asc" }],
    });

    return NextResponse.json({ parts });
  } catch (error) {
    console.error("Error listing stock parts:", error);
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
    const { name, slug, category, description, previewImageUrl, glbUrl, metadata } = body;

    if (!name || !slug || !category) {
      return NextResponse.json(
        { error: "name, slug, and category are required" },
        { status: 400 },
      );
    }

    const part = await prisma.stockPart.create({
      data: {
        tenantId: admin.tenantId,
        name,
        slug,
        category,
        description: description ?? null,
        previewImageUrl: previewImageUrl ?? null,
        glbUrl: glbUrl ?? null,
        metadata: metadata ?? null,
      },
    });

    return NextResponse.json({ part }, { status: 201 });
  } catch (error) {
    console.error("Error creating stock part:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
