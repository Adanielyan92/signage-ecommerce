import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const slug = (await params).slug;
    const template = await prisma.productTemplate.findUnique({
      where: { slug }
    });

    if (!template) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ 
      pricingParams: template.pricingParams,
      productSchema: template.productSchema
    });
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const slug = (await params).slug;
    const body = await request.json();

    if (!body.pricingParams) {
      return NextResponse.json({ error: "Missing pricingParams" }, { status: 400 });
    }

    const updated = await prisma.productTemplate.update({
      where: { slug },
      data: {
        pricingParams: body.pricingParams,
        productSchema: body.productSchema !== undefined ? body.productSchema : undefined
      }
    });

    return NextResponse.json({ 
      pricingParams: updated.pricingParams,
      productSchema: updated.productSchema
    });
  } catch (err) {
    console.error("Failed to update pricing params", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
