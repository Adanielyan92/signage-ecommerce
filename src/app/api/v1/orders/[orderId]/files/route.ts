// src/app/api/v1/orders/[orderId]/files/route.ts
import { NextRequest, NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { generateProductionFiles } from "@/lib/production-files";
import { estimateDimensions } from "@/engine/pricing";
import type { SignConfiguration } from "@/types/configurator";

/**
 * POST: Trigger (re)generation of production files for all items in an order.
 * GET: List all production files for an order.
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { orderId } = await params;

    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId: tenant.id },
      select: { id: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const files = await prisma.productionFile.findMany({
      where: {
        orderItem: { orderId },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ files });
  } catch (error) {
    console.error("Error listing production files:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { orderId } = await params;

    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId: tenant.id },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const allFiles: Array<{
      orderItemId: string;
      fileType: string;
      fileName: string;
      url: string;
    }> = [];

    for (const item of order.items) {
      const config = item.configuration as unknown as SignConfiguration;
      const dims = estimateDimensions(config);
      const productName =
        (item.configSnapshot as Record<string, unknown>)?.productName as string ??
        "Unknown Product";

      // Delete existing production files for this item
      await prisma.productionFile.deleteMany({
        where: { orderItemId: item.id },
      });

      const files = await generateProductionFiles({
        orderId: order.id,
        orderItemId: item.id,
        orderNumber: order.orderNumber,
        productName,
        config,
        dimensions: dims,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
      });

      // Persist to DB
      for (const file of files) {
        await prisma.productionFile.create({
          data: {
            orderItemId: item.id,
            fileType: file.fileType,
            fileName: file.fileName,
            storageKey: file.storageKey,
            url: file.url,
            sizeBytes: file.sizeBytes,
            contentType: file.contentType,
          },
        });

        allFiles.push({
          orderItemId: item.id,
          fileType: file.fileType,
          fileName: file.fileName,
          url: file.url,
        });
      }
    }

    return NextResponse.json({
      message: `Generated ${allFiles.length} production files`,
      files: allFiles,
    });
  } catch (error) {
    console.error("Error generating production files:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
