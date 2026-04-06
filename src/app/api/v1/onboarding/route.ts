import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const onboardingSchema = z.object({
  // Step 1: Account
  email: z.email(),
  password: z.string().min(8),
  name: z.string().min(1),
  shopName: z.string().min(1),

  // Step 2: Branding (optional)
  primaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  logoUrl: z.string().optional(),

  // Step 3: Product template
  templateSlug: z.string().min(1),

  // Step 4: Pricing overrides (optional)
  pricingOverrides: z
    .record(z.string(), z.number())
    .optional(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const slug = data.shopName
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();

  // Check for existing user or tenant
  const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
  if (existingUser) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const existingTenant = await prisma.tenant.findUnique({ where: { slug } });
  if (existingTenant) {
    return NextResponse.json({ error: "Shop name already taken" }, { status: 409 });
  }

  // Find the template
  const template = await prisma.productTemplate.findUnique({ where: { slug: data.templateSlug } });
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const apiKey = `gsk_${randomBytes(24).toString("hex")}`;

  const result = await prisma.$transaction(async (tx) => {
    // Create tenant
    const tenant = await tx.tenant.create({
      data: {
        slug,
        name: data.shopName,
        primaryColor: data.primaryColor ?? "#2563eb",
        accentColor: data.accentColor ?? "#1e40af",
        logoUrl: data.logoUrl,
        onboardingCompleted: true,
      },
    });

    // Create user
    const user = await tx.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        role: "ADMIN",
        tenantId: tenant.id,
      },
    });

    // Create API key
    await tx.apiKey.create({
      data: {
        tenantId: tenant.id,
        key: apiKey,
        name: "Default API Key",
      },
    });

    // Create pricing formula from template defaults
    const formula = await tx.pricingFormula.create({
      data: {
        tenantId: tenant.id,
        name: `${template.name} Pricing`,
        type: "PRESET",
        presetId: "per-inch-letter",
        formulaAst: null,
      },
    });

    // Clone template into product
    const pricingParams =
      data.pricingOverrides && template.pricingParams
        ? { ...(template.pricingParams as Record<string, unknown>), ...data.pricingOverrides }
        : template.pricingParams;

    await tx.product.create({
      data: {
        tenantId: tenant.id,
        slug: template.slug,
        name: template.name,
        description: template.description,
        category: template.category,
        productSchema: template.productSchema,
        pricingParams,
        renderConfig: template.renderConfig,
        pricingFormulaId: formula.id,
      },
    });

    return { tenant, user };
  });

  return NextResponse.json(
    {
      tenantSlug: result.tenant.slug,
      tenantId: result.tenant.id,
      userId: result.user.id,
      apiKey,
    },
    { status: 201 },
  );
}
