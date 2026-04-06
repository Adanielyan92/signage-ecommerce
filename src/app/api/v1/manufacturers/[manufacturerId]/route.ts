import { NextResponse, type NextRequest } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ manufacturerId: string }> },
) {
  const { manufacturerId } = await params;

  const manufacturer = await prisma.manufacturer.findUnique({
    where: { id: manufacturerId },
  });

  if (!manufacturer) {
    return NextResponse.json({ error: "Manufacturer not found" }, { status: 404 });
  }

  return NextResponse.json({ manufacturer });
}

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  website: z.string().optional(),
  email: z.email().optional(),
  phone: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  country: z.string().optional(),
  zipCode: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  certifications: z.array(z.string()).optional(),
  isVerified: z.boolean().optional(),
  isActive: z.boolean().optional(),
  featuredOrder: z.number().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ manufacturerId: string }> },
) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { manufacturerId } = await params;

  const existing = await prisma.manufacturer.findUnique({ where: { id: manufacturerId } });
  if (!existing) {
    return NextResponse.json({ error: "Manufacturer not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const manufacturer = await prisma.manufacturer.update({
    where: { id: manufacturerId },
    data: parsed.data,
  });

  return NextResponse.json({ manufacturer });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ manufacturerId: string }> },
) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { manufacturerId } = await params;

  const existing = await prisma.manufacturer.findUnique({ where: { id: manufacturerId } });
  if (!existing) {
    return NextResponse.json({ error: "Manufacturer not found" }, { status: 404 });
  }

  await prisma.manufacturer.delete({ where: { id: manufacturerId } });
  return NextResponse.json({ success: true });
}
