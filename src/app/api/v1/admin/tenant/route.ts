import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(_request: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: adminSession.tenantId },
      select: {
        id: true,
        slug: true,
        name: true,
        plan: true,
        logoUrl: true,
        primaryColor: true,
        accentColor: true,
        customDomain: true,
        currency: true,
        locale: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    return NextResponse.json({ tenant });
  } catch (error) {
    console.error("Error fetching tenant:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const adminSession = await getAdminSession();
    if (!adminSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, logoUrl, primaryColor, accentColor, customDomain, currency, locale } = body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (logoUrl !== undefined) updates.logoUrl = logoUrl;
    if (primaryColor !== undefined) updates.primaryColor = primaryColor;
    if (accentColor !== undefined) updates.accentColor = accentColor;
    if (customDomain !== undefined) updates.customDomain = customDomain;
    if (currency !== undefined) updates.currency = currency;
    if (locale !== undefined) updates.locale = locale;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const tenant = await prisma.tenant.update({
      where: { id: adminSession.tenantId },
      data: updates,
      select: {
        id: true,
        slug: true,
        name: true,
        plan: true,
        logoUrl: true,
        primaryColor: true,
        accentColor: true,
        customDomain: true,
        currency: true,
        locale: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ tenant });
  } catch (error) {
    console.error("Error updating tenant:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
