import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cartItems = await prisma.cartItem.findMany({
      where: { userId: session.user.id },
      include: {
        product: {
          select: { slug: true, name: true },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Map DB cart items to the format expected by the client cart store
    const items = cartItems.map((item) => ({
      id: item.id,
      productType: item.product.slug,
      productName: item.product.name,
      configuration: item.configuration,
      thumbnailUrl: item.thumbnailUrl,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    }));

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error fetching cart:", error);
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
    const { items } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json(
        { error: "Items must be an array" },
        { status: 400 }
      );
    }

    // Replace the entire server cart within a transaction
    await prisma.$transaction(async (tx) => {
      // Delete all existing cart items for the user
      await tx.cartItem.deleteMany({
        where: { userId: session.user.id },
      });

      // Insert new cart items
      for (const item of items) {
        // Look up product by slug/type
        const productType = item.productType || item.configuration?.productType;
        if (!productType) continue;

        const product = await tx.product.findUnique({
          where: { slug: productType },
        });

        if (!product) {
          console.warn(`Skipping cart item with unknown product: ${productType}`);
          continue;
        }

        await tx.cartItem.create({
          data: {
            userId: session.user.id,
            productId: product.id,
            configuration: item.configuration ?? {},
            thumbnailUrl: item.thumbnailUrl || null,
            quantity: item.quantity ?? 1,
            unitPrice: item.unitPrice ?? 0,
          },
        });
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error syncing cart:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
