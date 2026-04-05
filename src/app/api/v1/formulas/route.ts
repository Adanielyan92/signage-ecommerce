import { NextRequest, NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { getAllPresetFormulas } from "@/engine/formula-presets";

export async function GET(request: NextRequest) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const [formulas, presets] = await Promise.all([
      prisma.pricingFormula.findMany({
        where: { tenantId: tenant.id },
        orderBy: [{ createdAt: "asc" }],
      }),
      Promise.resolve(
        getAllPresetFormulas().map(({ id, name, description, variables }) => ({
          id,
          name,
          description,
          variables,
        }))
      ),
    ]);

    return NextResponse.json({ formulas, presets });
  } catch (error) {
    console.error("Error listing formulas:", error);
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
    const { name, type, description, presetId, formulaAst } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (!type || typeof type !== "string") {
      return NextResponse.json({ error: "type is required" }, { status: 400 });
    }

    const existing = await prisma.pricingFormula.findUnique({
      where: { tenantId_name: { tenantId: tenant.id, name } },
    });
    if (existing) {
      return NextResponse.json(
        { error: `A formula named "${name}" already exists` },
        { status: 409 }
      );
    }

    const formula = await prisma.pricingFormula.create({
      data: {
        tenantId: tenant.id,
        name,
        type: type as "PRESET" | "VISUAL" | "SCRIPT",
        ...(description !== undefined ? { description } : {}),
        ...(presetId !== undefined ? { presetId } : {}),
        ...(formulaAst !== undefined ? { formulaAst } : {}),
      },
    });

    return NextResponse.json({ formula }, { status: 201 });
  } catch (error) {
    console.error("Error creating formula:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
