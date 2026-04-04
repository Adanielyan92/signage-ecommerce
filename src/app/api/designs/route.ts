import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { savedDesignSchema } from "@/lib/validations";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const designs = await prisma.savedDesign.findMany({
      where: { userId: session.user.id },
      include: {
        product: {
          select: { slug: true, name: true },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ designs });
  } catch (error) {
    console.error("Error fetching designs:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const parsed = savedDesignSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { name, configuration, dimensions, thumbnail } = parsed.data;

    // Look up the product by slug to get the product ID
    const product = await prisma.product.findFirst({
      where: { slug: configuration.productType },
    });

    if (!product) {
      return NextResponse.json(
        { error: `Unknown product type: ${configuration.productType}` },
        { status: 400 }
      );
    }

    const design = await prisma.savedDesign.create({
      data: {
        tenantId: product.tenantId,
        userId: session.user.id,
        productId: product.id,
        name,
        configuration: JSON.parse(JSON.stringify({ ...configuration, dimensions })),
        thumbnailUrl: thumbnail || null,
      },
      include: {
        product: {
          select: { slug: true, name: true },
        },
      },
    });

    return NextResponse.json({ design }, { status: 201 });
  } catch (error) {
    console.error("Error saving design:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
