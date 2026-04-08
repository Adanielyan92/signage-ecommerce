import { NextRequest, NextResponse } from "next/server";
import { pricingRequestSchema } from "@/lib/validations";
import { getProductBySlug } from "@/engine/product-definitions";
import { calculatePriceUnified, validatePrice } from "@/engine/pricing";
import { prisma } from "@/lib/prisma";
import type { SignConfiguration } from "@/types/configurator";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = pricingRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { config, dimensions, clientPrice } = parsed.data;

    const product = getProductBySlug(config.productType);
    if (!product) {
      return NextResponse.json(
        { error: `Unknown product type: ${config.productType}` },
        { status: 400 }
      );
    }

    // Attempt to load live pricing params from DB
    const dbProduct = await prisma.productTemplate.findFirst({
      where: { slug: config.productType }
    });
    
    // Choose DB overrides if they exist, otherwise fallback to local code definition
    const activeParams = dbProduct?.pricingParams 
      ? (dbProduct.pricingParams as any) 
      : product.pricingParams;

    // Map validated input to SignConfiguration format expected by pricing engine
    const signConfig = {
      productType: config.productType,
      text: config.text,
      height: config.height,
      font: config.fontStyle,
      lit: config.lit,
      led: config.ledColor ?? "3000K",
      litSides: config.litSides ?? "Face Lit",
      sideDepth: config.depth ? `${config.depth}"` : '4"',
      painting: config.painting,
      paintingColors: config.paintColorCount ?? 1,
      raceway: config.raceway,
      racewayColor: "#808080",
      vinyl: config.vinyl,
      background: config.hasBackground ? "Background" : "-",
    } as const;

    const engineDimensions = {
      totalWidthInches: dimensions.width,
      heightInches: dimensions.height,
      squareFeet: dimensions.sqft ?? (dimensions.width * dimensions.height) / 144,
      linearFeet: ((dimensions.width + dimensions.height) * 2) / 12,
      letterWidths: [],
    };

    const breakdown = calculatePriceUnified(
      signConfig,
      engineDimensions,
      activeParams
    );

    // If client price was provided, validate it
    let validation = null;
    if (clientPrice !== undefined) {
      validation = validatePrice(
        clientPrice,
        signConfig as SignConfiguration,
        activeParams
      );
    }

    return NextResponse.json({
      breakdown,
      validation,
    });
  } catch (error) {
    console.error("Pricing calculation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
