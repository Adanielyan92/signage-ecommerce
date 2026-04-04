/**
 * Seed script: creates the default GatSoft tenant, pricing formulas from
 * presets, and migrates all hardcoded product definitions to the DB.
 *
 * Run with:
 *   npx tsx --tsconfig tsconfig.json -r tsconfig-paths/register src/seed/default-tenant.ts
 *
 * Or, if tsconfig-paths is not installed:
 *   npx tsx src/seed/default-tenant.ts
 * (uses relative imports below instead of @/ aliases)
 */

import { PrismaClient, Prisma } from "../generated/prisma/client";
import { PRESET_IDS } from "../engine/formula-presets";
import {
  channelLetterProducts,
  litShapeProducts,
  cabinetProducts,
  dimensionalProducts,
  logoProducts,
  printProducts,
  signPostProducts,
} from "../engine/product-definitions";

// Prisma v7 requires a driver adapter; workaround for seed context without one
const prisma = new PrismaClient({} as never);

/** Cast any plain object to Prisma's Json input type */
function toJson(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function main() {
  // ─── 1. Tenant ──────────────────────────────────────────────────────────────

  const tenant = await prisma.tenant.upsert({
    where: { slug: "gatsoft" },
    update: {},
    create: {
      slug: "gatsoft",
      name: "GatSoft Signs",
      plan: "ENTERPRISE",
    },
  });

  console.log(`Tenant: ${tenant.name} (${tenant.id})`);

  // ─── 2. Pricing Formulas ─────────────────────────────────────────────────────

  const formulaDefs = [
    {
      name: "Per-Inch Channel Letter",
      presetId: PRESET_IDS.PER_INCH_LETTER,
      description:
        "Price per letter based on height in inches with large-size tier.",
    },
    {
      name: "Per Square Foot",
      presetId: PRESET_IDS.PER_SQFT,
      description: "Price based on panel square footage with minimum sqft floor.",
    },
    {
      name: "Per Square Inch",
      presetId: PRESET_IDS.PER_SQINCH,
      description:
        "Price based on total square inches with minimum dimension on each axis.",
    },
    {
      name: "Base + Square Foot",
      presetId: PRESET_IDS.BASE_PLUS_SQFT,
      description: "Fixed base price plus a per-square-foot charge.",
    },
    {
      name: "Flat Rate",
      presetId: PRESET_IDS.FLAT_RATE,
      description: "Single fixed price regardless of dimensions or quantity.",
    },
  ] as const;

  const formulas: Record<string, string> = {};

  for (const def of formulaDefs) {
    const formula = await prisma.pricingFormula.upsert({
      where: {
        tenantId_name: { tenantId: tenant.id, name: def.name },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        name: def.name,
        description: def.description,
        type: "PRESET",
        presetId: def.presetId,
      },
    });
    formulas[def.presetId] = formula.id;
    console.log(`  Formula: ${formula.name} (${formula.id})`);
  }

  const perInchFormulaId = formulas[PRESET_IDS.PER_INCH_LETTER];
  const perSqftFormulaId = formulas[PRESET_IDS.PER_SQFT];
  const perSqInchFormulaId = formulas[PRESET_IDS.PER_SQINCH];
  const basePlusSqftFormulaId = formulas[PRESET_IDS.BASE_PLUS_SQFT];

  // ─── 3. Products ─────────────────────────────────────────────────────────────

  let productCount = 0;

  // 3a. Channel Letter Products
  for (const product of channelLetterProducts) {
    await prisma.product.upsert({
      where: {
        tenantId_slug: { tenantId: tenant.id, slug: product.slug },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        slug: product.slug,
        name: product.name,
        description: product.description,
        category: "CHANNEL_LETTERS",
        pricingFormulaId: perInchFormulaId,
        pricingParams: toJson(product.pricingParams),
        renderConfig: toJson({ pipeline: "text-to-3d" }),
        productSchema: toJson({
          name: product.name,
          slug: product.slug,
          description: product.description,
          category: "CHANNEL_LETTERS",
          options: product.options,
          rules: [],
          renderConfig: { pipeline: "text-to-3d" },
          pricingFormulaId: perInchFormulaId,
          pricingParams: product.pricingParams,
        }),
      },
    });
    productCount++;
  }

  // 3b. Lit Shape Products
  for (const product of litShapeProducts) {
    await prisma.product.upsert({
      where: {
        tenantId_slug: { tenantId: tenant.id, slug: product.slug },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        slug: product.slug,
        name: product.name,
        description: product.description,
        category: product.category,
        pricingFormulaId: perSqftFormulaId,
        pricingParams: toJson(product.pricingParams),
        renderConfig: toJson({ pipeline: "part-assembly" }),
        productSchema: toJson({
          name: product.name,
          slug: product.slug,
          description: product.description,
          category: product.category,
          options: [],
          rules: [],
          renderConfig: { pipeline: "part-assembly" },
          pricingFormulaId: perSqftFormulaId,
          pricingParams: product.pricingParams,
        }),
      },
    });
    productCount++;
  }

  // 3c. Cabinet Products
  for (const product of cabinetProducts) {
    await prisma.product.upsert({
      where: {
        tenantId_slug: { tenantId: tenant.id, slug: product.slug },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        slug: product.slug,
        name: product.name,
        description: product.description,
        category: product.category,
        pricingFormulaId: perSqftFormulaId,
        pricingParams: toJson(product.pricingParams),
        renderConfig: toJson({ pipeline: "part-assembly" }),
        productSchema: toJson({
          name: product.name,
          slug: product.slug,
          description: product.description,
          category: product.category,
          options: [],
          rules: [],
          renderConfig: { pipeline: "part-assembly" },
          pricingFormulaId: perSqftFormulaId,
          pricingParams: product.pricingParams,
        }),
      },
    });
    productCount++;
  }

  // 3d. Dimensional Letter Products
  for (const product of dimensionalProducts) {
    await prisma.product.upsert({
      where: {
        tenantId_slug: { tenantId: tenant.id, slug: product.slug },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        slug: product.slug,
        name: product.name,
        description: product.description,
        category: product.category,
        pricingFormulaId: perInchFormulaId,
        pricingParams: toJson(product.pricingParams),
        renderConfig: toJson({ pipeline: "text-to-3d" }),
        productSchema: toJson({
          name: product.name,
          slug: product.slug,
          description: product.description,
          category: product.category,
          options: [],
          rules: [],
          renderConfig: { pipeline: "text-to-3d" },
          pricingFormulaId: perInchFormulaId,
          pricingParams: product.pricingParams,
        }),
      },
    });
    productCount++;
  }

  // 3e. Logo Products
  for (const product of logoProducts) {
    await prisma.product.upsert({
      where: {
        tenantId_slug: { tenantId: tenant.id, slug: product.slug },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        slug: product.slug,
        name: product.name,
        description: product.description,
        category: product.category,
        pricingFormulaId: perSqInchFormulaId,
        pricingParams: toJson(product.pricingParams),
        renderConfig: toJson({ pipeline: "part-assembly" }),
        productSchema: toJson({
          name: product.name,
          slug: product.slug,
          description: product.description,
          category: product.category,
          options: [],
          rules: [],
          renderConfig: { pipeline: "part-assembly" },
          pricingFormulaId: perSqInchFormulaId,
          pricingParams: product.pricingParams,
        }),
      },
    });
    productCount++;
  }

  // 3f. Print Products
  for (const product of printProducts) {
    await prisma.product.upsert({
      where: {
        tenantId_slug: { tenantId: tenant.id, slug: product.slug },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        slug: product.slug,
        name: product.name,
        description: product.description,
        category: product.category,
        pricingFormulaId: perSqftFormulaId,
        pricingParams: toJson(product.pricingParams),
        renderConfig: toJson({ pipeline: "flat-2d" }),
        productSchema: toJson({
          name: product.name,
          slug: product.slug,
          description: product.description,
          category: product.category,
          options: [],
          rules: [],
          renderConfig: { pipeline: "flat-2d" },
          pricingFormulaId: perSqftFormulaId,
          pricingParams: product.pricingParams,
        }),
      },
    });
    productCount++;
  }

  // 3g. Sign Post Products
  for (const product of signPostProducts) {
    await prisma.product.upsert({
      where: {
        tenantId_slug: { tenantId: tenant.id, slug: product.slug },
      },
      update: {},
      create: {
        tenantId: tenant.id,
        slug: product.slug,
        name: product.name,
        description: product.description,
        category: product.category,
        pricingFormulaId: basePlusSqftFormulaId,
        pricingParams: toJson(product.pricingParams),
        renderConfig: toJson({ pipeline: "part-assembly" }),
        productSchema: toJson({
          name: product.name,
          slug: product.slug,
          description: product.description,
          category: product.category,
          options: [],
          rules: [],
          renderConfig: { pipeline: "part-assembly" },
          pricingFormulaId: basePlusSqftFormulaId,
          pricingParams: product.pricingParams,
        }),
      },
    });
    productCount++;
  }

  console.log(`\nSeeded ${productCount} products for tenant "${tenant.slug}".`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
