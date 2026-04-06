import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";
import { randomBytes } from "crypto";

const createSchema = z.object({
  url: z.url(),
  events: z.array(z.enum(["order.created", "order.paid", "order.files_ready", "design.saved"])).min(1),
});

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const webhooks = await prisma.webhook.findMany({
    where: { tenantId: admin.tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { deliveries: true } },
    },
  });

  return NextResponse.json({ webhooks });
}

export async function POST(request: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const secret = randomBytes(32).toString("hex");

  const webhook = await prisma.webhook.create({
    data: {
      tenantId: admin.tenantId,
      url: parsed.data.url,
      events: parsed.data.events,
      secret,
    },
  });

  return NextResponse.json({ webhook }, { status: 201 });
}
