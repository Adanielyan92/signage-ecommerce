import { NextResponse, type NextRequest } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";

const updateSchema = z.object({
  url: z.url().optional(),
  events: z.array(z.enum(["order.created", "order.paid", "order.files_ready", "design.saved"])).min(1).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ webhookId: string }> },
) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { webhookId } = await params;

  const webhook = await prisma.webhook.findFirst({
    where: { id: webhookId, tenantId: admin.tenantId },
    include: { _count: { select: { deliveries: true } } },
  });

  if (!webhook) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  }

  return NextResponse.json({ webhook });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ webhookId: string }> },
) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { webhookId } = await params;

  const existing = await prisma.webhook.findFirst({
    where: { id: webhookId, tenantId: admin.tenantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const webhook = await prisma.webhook.update({
    where: { id: webhookId },
    data: parsed.data,
  });

  return NextResponse.json({ webhook });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ webhookId: string }> },
) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { webhookId } = await params;

  const existing = await prisma.webhook.findFirst({
    where: { id: webhookId, tenantId: admin.tenantId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
  }

  await prisma.webhook.delete({ where: { id: webhookId } });

  return NextResponse.json({ success: true });
}
