import { prisma } from "./prisma";
import { createHmac } from "crypto";

export type WebhookEvent =
  | "order.created"
  | "order.paid"
  | "order.files_ready"
  | "design.saved";

interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Sign a webhook payload with HMAC-SHA256.
 */
export function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Exponential backoff: 30s, 120s, 480s
 */
export function retryDelayMs(attempt: number): number {
  return 30_000 * Math.pow(4, attempt - 1);
}

/**
 * Fire all webhooks for a given tenant and event.
 * Non-blocking -- logs failures and schedules retries.
 */
export async function fireWebhooks(
  tenantId: string,
  event: WebhookEvent,
  data: Record<string, unknown>,
): Promise<void> {
  const webhooks = await prisma.webhook.findMany({
    where: {
      tenantId,
      isActive: true,
      events: { has: event },
    },
  });

  if (webhooks.length === 0) return;

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  const payloadStr = JSON.stringify(payload);

  // Fire all webhooks in parallel, non-blocking
  await Promise.allSettled(
    webhooks.map((webhook) => deliverWebhook(webhook.id, webhook.url, webhook.secret, event, payloadStr)),
  );
}

async function deliverWebhook(
  webhookId: string,
  url: string,
  secret: string,
  event: WebhookEvent,
  payloadStr: string,
  attempt: number = 1,
  maxAttempts: number = 3,
): Promise<void> {
  const signature = signPayload(payloadStr, secret);

  let responseStatus: number | undefined;
  let responseBody: string | undefined;
  let error: string | undefined;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000); // 10s timeout

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Event": event,
      },
      body: payloadStr,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    responseStatus = response.status;
    responseBody = await response.text().catch(() => "");

    if (response.ok) {
      // Success -- log delivery
      await prisma.webhookDelivery.create({
        data: {
          webhookId,
          event,
          payload: JSON.parse(payloadStr),
          responseStatus,
          responseBody: responseBody.slice(0, 1000),
          attempt,
          maxAttempts,
          deliveredAt: new Date(),
        },
      });
      return;
    }

    error = `HTTP ${responseStatus}: ${responseBody?.slice(0, 200)}`;
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  // Schedule retry or log final failure
  const nextRetryAt =
    attempt < maxAttempts
      ? new Date(Date.now() + retryDelayMs(attempt))
      : undefined;

  await prisma.webhookDelivery.create({
    data: {
      webhookId,
      event,
      payload: JSON.parse(payloadStr),
      responseStatus,
      responseBody: responseBody?.slice(0, 1000),
      error,
      attempt,
      maxAttempts,
      nextRetryAt,
    },
  });
}

/**
 * Process pending webhook retries. Call from a cron job or background task.
 */
export async function processWebhookRetries(): Promise<number> {
  const pendingDeliveries = await prisma.webhookDelivery.findMany({
    where: {
      deliveredAt: null,
      nextRetryAt: { lte: new Date() },
    },
    include: { webhook: true },
    take: 50,
  });

  let processed = 0;
  for (const delivery of pendingDeliveries) {
    if (!delivery.webhook.isActive) continue;
    if (delivery.attempt >= delivery.maxAttempts) continue;

    await deliverWebhook(
      delivery.webhookId,
      delivery.webhook.url,
      delivery.webhook.secret,
      delivery.event as WebhookEvent,
      JSON.stringify(delivery.payload),
      delivery.attempt + 1,
      delivery.maxAttempts,
    );
    processed++;
  }

  return processed;
}
