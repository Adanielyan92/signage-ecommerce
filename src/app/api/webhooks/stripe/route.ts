import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { generateProductionFiles } from "@/lib/production-files";
import type { SignConfiguration, Dimensions } from "@/types/configurator";
import { estimateDimensions } from "@/engine/pricing";

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY!);
}

/**
 * In App Router, raw body is read via request.text() — no config needed.
 * (The Pages Router `config.api.bodyParser` pattern does not apply here.)
 */

interface SerializedOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  optionValues: Record<string, unknown>;
  description?: string;
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${String(err)}` },
      { status: 400 }
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const tenantId = session.metadata?.tenantId;
    const orderNumber = session.metadata?.orderNumber;
    const orderItemsJson = session.metadata?.orderItems;

    if (!tenantId || !orderNumber || !orderItemsJson) {
      console.error("Missing metadata in checkout session:", session.id);
      return NextResponse.json({ received: true });
    }

    let orderItems: SerializedOrderItem[];
    try {
      orderItems = JSON.parse(orderItemsJson) as SerializedOrderItem[];
    } catch (err) {
      console.error("Failed to parse orderItems metadata:", err);
      return NextResponse.json({ received: true });
    }

    const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const total = session.amount_total ? session.amount_total / 100 : subtotal;

    // Determine userId from customer email or fall back to "guest"
    const customerEmail =
      session.customer_details?.email ?? session.customer_email ?? null;

    let userId = "guest";
    if (customerEmail) {
      const user = await prisma.user.findUnique({
        where: { email: customerEmail },
        select: { id: true },
      });
      if (user) {
        userId = user.id;
      }
    }

    try {
      await prisma.order.create({
        data: {
          orderNumber,
          tenantId,
          userId,
          status: "PAYMENT_RECEIVED",
          subtotal,
          total,
          stripeSessionId: session.id,
          ...(session.payment_intent
            ? { stripePaymentId: String(session.payment_intent) }
            : {}),
          items: {
            createMany: {
              data: orderItems.map((item) => ({
                productId: item.productId,
                configuration: item.optionValues as unknown as Prisma.InputJsonValue,
                configSnapshot: {
                  productName: item.productName,
                  optionValues: item.optionValues,
                  ...(item.description !== undefined ? { description: item.description } : {}),
                } as unknown as Prisma.InputJsonValue,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
              })),
            },
          },
        },
      });
    } catch (err) {
      console.error("Failed to create order in DB for session", session.id, ":", err);
      // Return 500 so Stripe retries the webhook
      return NextResponse.json({ error: "Failed to persist order" }, { status: 500 });
    }

    // --- Trigger production file generation (non-blocking) ---
    // We intentionally do not await this -- file generation runs in the background
    // and failures should not cause the webhook to fail.
    const createdOrder = await prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true },
    });

    if (createdOrder) {
      for (const item of createdOrder.items) {
        const config = item.configuration as unknown as SignConfiguration;
        const dims = estimateDimensions(config);

        generateProductionFiles({
          orderId: createdOrder.id,
          orderItemId: item.id,
          orderNumber: createdOrder.orderNumber,
          productName: (item.configSnapshot as Record<string, unknown>)?.productName as string ?? "Unknown Product",
          config,
          dimensions: dims,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
        })
          .then(async (files) => {
            // Persist file metadata to DB
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
            }
            console.log(`Generated ${files.length} production files for order item ${item.id}`);
          })
          .catch((err) => {
            console.error(`Production file generation failed for order item ${item.id}:`, err);
          });
      }
    }
  }

  return NextResponse.json({ received: true });
}
