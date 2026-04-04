import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { resolveTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { evaluateFormulaDefinition, type VariableMap } from "@/engine/schema-pricing";
import { getPresetFormula } from "@/engine/formula-presets";
import type { FormulaDefinition } from "@/engine/formula-types";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

interface CheckoutItem {
  productId: string;
  optionValues: Record<string, unknown>;
  quantity?: number;
  clientPrice?: number;
  description?: string;
}

interface CheckoutBody {
  items: CheckoutItem[];
  customerEmail?: string;
  successUrl: string;
  cancelUrl: string;
}

/** Generate order number in GS-{YYYY}{NNNN} format */
async function generateOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `GS-${year}`;

  // Count existing orders for this year to determine the next sequence
  const count = await prisma.order.count({
    where: {
      orderNumber: { startsWith: prefix },
    },
  });

  const sequence = String(count + 1).padStart(4, "0");
  return `${prefix}${sequence}`;
}

/** Resolve a FormulaDefinition from a PricingFormula DB record */
function resolveFormula(pricingFormula: {
  type: string;
  presetId: string | null;
  formulaAst: unknown;
}): FormulaDefinition {
  if (pricingFormula.type === "PRESET") {
    if (!pricingFormula.presetId) {
      throw new Error("PRESET formula missing presetId");
    }
    return getPresetFormula(pricingFormula.presetId);
  }

  // VISUAL or SCRIPT: use custom AST stored in formulaAst
  if (!pricingFormula.formulaAst) {
    throw new Error(`Formula type "${pricingFormula.type}" missing formulaAst`);
  }
  return pricingFormula.formulaAst as FormulaDefinition;
}

/** Build variable map from optionValues and product pricingParams */
function buildVariableMap(
  optionValues: Record<string, unknown>,
  pricingParams: Record<string, unknown> | null,
): VariableMap {
  const vars: VariableMap = {};

  // Spread pricing params first (lower priority)
  if (pricingParams) {
    for (const [key, val] of Object.entries(pricingParams)) {
      if (typeof val === "number") {
        vars[key] = val;
      }
    }
  }

  // Spread option values (higher priority, overrides params)
  for (const [key, val] of Object.entries(optionValues)) {
    if (typeof val === "number") {
      vars[key] = val;
    } else if (typeof val === "boolean") {
      vars[key] = val ? 1 : 0;
    }
  }

  return vars;
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const body = (await request.json()) as CheckoutBody;
    const { items, customerEmail, successUrl, cancelUrl } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "items must be a non-empty array" }, { status: 400 });
    }
    if (!successUrl || typeof successUrl !== "string") {
      return NextResponse.json({ error: "successUrl is required" }, { status: 400 });
    }
    if (!cancelUrl || typeof cancelUrl !== "string") {
      return NextResponse.json({ error: "cancelUrl is required" }, { status: 400 });
    }

    // Process each item: fetch product, evaluate price, validate client price
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const serializedItems: Array<{
      productId: string;
      productName: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
      optionValues: Record<string, unknown>;
      description?: string;
    }> = [];

    for (const item of items) {
      const { productId, optionValues, quantity = 1, clientPrice, description } = item;

      if (!productId || typeof productId !== "string") {
        return NextResponse.json({ error: "Each item must have a productId" }, { status: 400 });
      }

      // Fetch product with its pricing formula
      const product = await prisma.product.findFirst({
        where: { id: productId, tenantId: tenant.id, isActive: true },
        include: {
          pricingFormula: true,
        },
      });

      if (!product) {
        return NextResponse.json(
          { error: `Product "${productId}" not found` },
          { status: 404 }
        );
      }

      if (!product.pricingFormula) {
        return NextResponse.json(
          { error: `Product "${productId}" has no pricing formula configured` },
          { status: 422 }
        );
      }

      // Resolve formula definition
      let formulaDef: FormulaDefinition;
      try {
        formulaDef = resolveFormula(product.pricingFormula);
      } catch (err) {
        return NextResponse.json(
          { error: `Failed to resolve formula for product "${productId}": ${String(err)}` },
          { status: 422 }
        );
      }

      // Build variable map and evaluate
      const vars = buildVariableMap(
        optionValues ?? {},
        product.pricingParams as Record<string, unknown> | null,
      );
      const breakdown = evaluateFormulaDefinition(formulaDef, vars);
      const serverPrice = breakdown.total;

      // Validate client price within 1% tolerance
      if (clientPrice !== undefined) {
        const tolerance = serverPrice * 0.01;
        const diff = Math.abs(clientPrice - serverPrice);
        if (diff > tolerance) {
          return NextResponse.json(
            {
              error: "Price mismatch",
              detail: `Client submitted $${clientPrice.toFixed(2)} but server calculated $${serverPrice.toFixed(2)} for product "${product.name}"`,
            },
            { status: 409 }
          );
        }
      }

      const unitPriceCents = Math.round(serverPrice * 100);
      const itemDescription = description ?? product.description ?? product.name;

      lineItems.push({
        price_data: {
          currency: "usd",
          unit_amount: unitPriceCents,
          product_data: {
            name: product.name,
            description: itemDescription,
          },
        },
        quantity,
      });

      serializedItems.push({
        productId,
        productName: product.name,
        quantity,
        unitPrice: serverPrice,
        totalPrice: serverPrice * quantity,
        optionValues: optionValues ?? {},
        ...(description !== undefined ? { description } : {}),
      });
    }

    // Generate order number
    const orderNumber = await generateOrderNumber();

    // Serialize items for metadata (Stripe metadata values must be strings ≤500 chars)
    const orderItemsJson = JSON.stringify(serializedItems);

    // Create Stripe checkout session
    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        tenantId: tenant.id,
        orderNumber,
        orderItems: orderItemsJson,
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      orderNumber,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
