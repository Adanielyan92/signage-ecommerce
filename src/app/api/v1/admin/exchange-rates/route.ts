import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";

const upsertSchema = z.object({
  toCurrency: z.string().length(3),
  rate: z.number().positive(),
});

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rates = await prisma.exchangeRate.findMany({
    where: { tenantId: admin.tenantId },
    orderBy: { toCurrency: "asc" },
  });

  return NextResponse.json({ rates });
}

export async function POST(request: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const { toCurrency, rate } = parsed.data;

  const exchangeRate = await prisma.exchangeRate.upsert({
    where: {
      tenantId_fromCurrency_toCurrency: {
        tenantId: admin.tenantId,
        fromCurrency: "USD",
        toCurrency,
      },
    },
    update: { rate },
    create: {
      tenantId: admin.tenantId,
      fromCurrency: "USD",
      toCurrency,
      rate,
    },
  });

  return NextResponse.json({ exchangeRate });
}
