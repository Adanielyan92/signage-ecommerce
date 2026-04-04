import { NextRequest, NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { evaluateFormulaDefinition } from "@/engine/schema-pricing";
import { getPresetFormula } from "@/engine/formula-presets";
import type { FormulaDefinition } from "@/engine/formula-types";

export async function POST(request: NextRequest) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const body = await request.json();
    const { productId, optionValues, dimensions } = body;

    if (!productId || !optionValues) {
      return NextResponse.json(
        { error: "productId and optionValues are required" },
        { status: 400 },
      );
    }

    // Fetch product with its pricing formula — use findFirst to filter by both
    // id and tenantId (tenantId is not part of the unique constraint on id).
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId: tenant.id },
      include: { pricingFormula: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Resolve the formula definition
    let formulaDef: FormulaDefinition;
    if (product.pricingFormula?.type === "PRESET" && product.pricingFormula.presetId) {
      formulaDef = getPresetFormula(product.pricingFormula.presetId);
    } else if (product.pricingFormula?.formulaAst) {
      formulaDef = product.pricingFormula.formulaAst as unknown as FormulaDefinition;
    } else {
      return NextResponse.json(
        { error: "Product has no pricing formula configured" },
        { status: 400 },
      );
    }

    // Build variable map
    const pricingParams = (product.pricingParams as Record<string, number>) ?? {};
    const text = (optionValues.text as string) ?? "";
    const letterCount = text.replace(/\s+/g, "").length;
    const widthInches = dimensions?.widthInches ?? optionValues.widthInches ?? 0;
    const heightInches =
      dimensions?.heightInches ?? optionValues.height ?? optionValues.heightInches ?? 0;
    const sqft = widthInches && heightInches ? (widthInches * heightInches) / 144 : 0;

    const vars: Record<string, number> = {
      ...flattenOptionValues(optionValues),
      widthInches,
      heightInches,
      sqft,
      letterCount,
      charCount: letterCount,
      ...pricingParams,
    };

    const breakdown = evaluateFormulaDefinition(formulaDef, vars);

    return NextResponse.json({ breakdown });
  } catch (error) {
    console.error("Schema pricing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function flattenOptionValues(opts: Record<string, unknown>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(opts)) {
    if (typeof value === "number") {
      result[key] = value;
    } else if (typeof value === "boolean") {
      result[key] = value ? 1 : 0;
    } else if (typeof value === "string") {
      const num = parseFloat(value);
      if (!isNaN(num)) {
        result[key] = num;
      }
    }
  }
  return result;
}
