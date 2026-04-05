import { NextRequest, NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ formulaId: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { formulaId } = await params;

    const tenant = await resolveTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const formula = await prisma.pricingFormula.findFirst({
      where: { id: formulaId, tenantId: tenant.id },
    });

    if (!formula) {
      return NextResponse.json({ error: "Formula not found" }, { status: 404 });
    }

    return NextResponse.json({ formula });
  } catch (error) {
    console.error("Error fetching formula:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const { formulaId } = await params;

    const tenant = await resolveTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const existing = await prisma.pricingFormula.findFirst({
      where: { id: formulaId, tenantId: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Formula not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, type, description, presetId, formulaAst, scriptBody } = body;

    const updates: Record<string, unknown> = {};
    if (name !== undefined) updates.name = name;
    if (type !== undefined) updates.type = type;
    if (description !== undefined) updates.description = description;
    if (presetId !== undefined) updates.presetId = presetId;
    if (formulaAst !== undefined) updates.formulaAst = formulaAst;
    if (scriptBody !== undefined) updates.scriptBody = scriptBody;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const formula = await prisma.pricingFormula.update({
      where: { id: formulaId },
      data: updates,
    });

    return NextResponse.json({ formula });
  } catch (error) {
    console.error("Error updating formula:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { formulaId } = await params;

    const tenant = await resolveTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const existing = await prisma.pricingFormula.findFirst({
      where: { id: formulaId, tenantId: tenant.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Formula not found" }, { status: 404 });
    }

    await prisma.pricingFormula.delete({ where: { id: formulaId } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting formula:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
