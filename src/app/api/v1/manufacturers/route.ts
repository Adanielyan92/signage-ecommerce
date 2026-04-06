import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";
import { z } from "zod/v4";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const capability = searchParams.get("capability");
  const state = searchParams.get("state");
  const country = searchParams.get("country") ?? "US";
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {
    isActive: true,
  };

  if (capability) {
    where.capabilities = { has: capability };
  }
  if (state) {
    where.state = state;
  }
  if (country) {
    where.country = country;
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const manufacturers = await prisma.manufacturer.findMany({
    where,
    orderBy: [
      { featuredOrder: { sort: "asc", nulls: "last" } },
      { name: "asc" },
    ],
  });

  return NextResponse.json({ manufacturers });
}

export async function POST(request: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const schema = z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
    description: z.string().optional(),
    website: z.string().optional(),
    email: z.email().optional(),
    phone: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().default("US"),
    zipCode: z.string().optional(),
    capabilities: z.array(z.string()).default([]),
    certifications: z.array(z.string()).default([]),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const manufacturer = await prisma.manufacturer.create({ data: parsed.data });
  return NextResponse.json({ manufacturer }, { status: 201 });
}
