// prisma/seed.ts
/**
 * Seed the database with platform-level data:
 * - Default tenant + admin user
 * - Stock parts catalog (6 categories)
 * - Material presets (8 platform presets)
 * - Font catalog (15 platform fonts from font-map.ts)
 * - All product definitions with pricing formulas
 */
import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local", override: true });

import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

function getConnectionString(): string {
  const url = process.env.DATABASE_URL ?? "";
  if (url.startsWith("prisma+postgres://")) {
    try {
      const apiKey = new URL(url).searchParams.get("api_key");
      if (apiKey) {
        const decoded = JSON.parse(Buffer.from(apiKey, "base64").toString());
        if (decoded.databaseUrl) return decoded.databaseUrl;
      }
    } catch { /* fall through */ }
  }
  return url;
}

const pool = new pg.Pool({ connectionString: getConnectionString() });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as never);

async function main() {
  console.log("Seeding platform data...");

  // 1. Default tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: "gatsoft" },
    update: {},
    create: {
      slug: "gatsoft",
      name: "GatSoft Signs",
      plan: "ENTERPRISE",
    },
  });
  console.log(`  Tenant: ${tenant.name} (${tenant.id})`);

  // 2. Admin user
  const adminPassword = "Admin123!";
  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@gatsoftsigns.com" },
    update: { passwordHash, role: "ADMIN", tenantId: tenant.id },
    create: {
      email: "admin@gatsoftsigns.com",
      name: "GatSoft Admin",
      passwordHash,
      role: "ADMIN",
      tenantId: tenant.id,
    },
  });
  console.log(`  Admin: ${admin.email} / ${adminPassword}`);

  // 3. Stock Parts (platform-level, tenantId = null)
  const stockParts = [
    { slug: "raceway-linear", name: "Linear Raceway", category: "MOUNTING" as const, description: "Standard linear raceway for channel letter mounting" },
    { slug: "raceway-box", name: "Box Raceway", category: "MOUNTING" as const, description: "Box raceway for clustered letter mounting" },
    { slug: "wall-standoffs", name: "Wall Standoff Set", category: "MOUNTING" as const, description: "Stainless steel standoff mounting hardware" },
    { slug: "stud-mounts", name: "Stud Mount Kit", category: "MOUNTING" as const, description: "Threaded stud mounting hardware" },
    { slug: "single-pole", name: "Single Pole", category: "POSTS" as const, description: "Single pole for pylon or post signs" },
    { slug: "double-pole", name: "Double Pole", category: "POSTS" as const, description: "Double pole for larger pylon signs" },
    { slug: "monument-base", name: "Monument Base", category: "POSTS" as const, description: "Ground-level monument sign base" },
    { slug: "pylon-frame", name: "Pylon Frame", category: "POSTS" as const, description: "Tall pylon sign frame structure" },
    { slug: "single-face-box", name: "Single-Face Cabinet", category: "CABINETS" as const, description: "Single-face rectangular cabinet shell" },
    { slug: "double-face-box", name: "Double-Face Cabinet", category: "CABINETS" as const, description: "Double-face rectangular cabinet shell" },
    { slug: "shaped-cabinet", name: "Shaped Cabinet", category: "CABINETS" as const, description: "Custom-shaped cabinet shell" },
    { slug: "led-module-strip", name: "LED Module Strip", category: "LIGHTING" as const, description: "LED module strip for internal illumination" },
    { slug: "neon-tube-path", name: "Neon Tube Path", category: "LIGHTING" as const, description: "LED neon tube following custom path" },
    { slug: "bulb-array", name: "Bulb Array", category: "LIGHTING" as const, description: "Marquee-style bulb array" },
    { slug: "hanging-chains", name: "Hanging Chains", category: "ACCESSORIES" as const, description: "Decorative hanging chains for blade signs" },
    { slug: "brackets", name: "Mounting Brackets", category: "ACCESSORIES" as const, description: "Wall-mount brackets for blade signs" },
    { slug: "transformer", name: "Transformer/Power Supply", category: "ACCESSORIES" as const, description: "LED power supply unit" },
    { slug: "flat-panel", name: "Flat Background Panel", category: "BACKGROUNDS" as const, description: "Flat panel background for sign mounting" },
    { slug: "shaped-backer", name: "Shaped Backer", category: "BACKGROUNDS" as const, description: "Custom-shaped background backer" },
    { slug: "brick-wall-preview", name: "Brick Wall (Preview)", category: "BACKGROUNDS" as const, description: "Brick wall texture for preview rendering" },
  ];

  for (const part of stockParts) {
    // Prisma can't upsert on compound unique with null, so use findFirst + create/update
    const existing = await prisma.stockPart.findFirst({
      where: { tenantId: null, slug: part.slug },
    });
    if (existing) {
      await prisma.stockPart.update({
        where: { id: existing.id },
        data: { name: part.name, description: part.description },
      });
    } else {
      await prisma.stockPart.create({
        data: { tenantId: null, ...part },
      });
    }
  }
  console.log(`  Stock parts: ${stockParts.length} seeded`);

  // 3. Material Presets (platform-level)
  const materials = [
    { slug: "brushed-aluminum", name: "Brushed Aluminum", materialType: "MeshPhysicalMaterial", properties: { color: "#D4D4D8", metalness: 0.85, roughness: 0.3 } },
    { slug: "painted-metal", name: "Painted Metal", materialType: "MeshStandardMaterial", properties: { color: "#FFFFFF", metalness: 0.5, roughness: 0.4 } },
    { slug: "translucent-acrylic", name: "Translucent Acrylic", materialType: "MeshPhysicalMaterial", properties: { color: "#FFFFFF", transmission: 0.8, thickness: 0.15, roughness: 0.1, metalness: 0 } },
    { slug: "opaque-acrylic", name: "Opaque Acrylic", materialType: "MeshStandardMaterial", properties: { color: "#FFFFFF", roughness: 0.1, metalness: 0 } },
    { slug: "neon-tube", name: "Neon Tube", materialType: "MeshBasicMaterial", properties: { color: "#FF4444", emissive: "#FF4444", emissiveIntensity: 2.0 } },
    { slug: "vinyl-print", name: "Vinyl Print", materialType: "MeshStandardMaterial", properties: { color: "#FFFFFF", roughness: 0.3, metalness: 0 } },
    { slug: "wood", name: "Wood", materialType: "MeshStandardMaterial", properties: { color: "#8B6914", roughness: 0.7, metalness: 0 } },
    { slug: "concrete-stone", name: "Concrete/Stone", materialType: "MeshStandardMaterial", properties: { color: "#9E9E9E", roughness: 0.9, metalness: 0 } },
  ];

  for (const mat of materials) {
    const existing = await prisma.materialPreset.findFirst({
      where: { tenantId: null, slug: mat.slug },
    });
    if (existing) {
      await prisma.materialPreset.update({
        where: { id: existing.id },
        data: { name: mat.name, properties: mat.properties },
      });
    } else {
      await prisma.materialPreset.create({
        data: { tenantId: null, ...mat },
      });
    }
  }
  console.log(`  Material presets: ${materials.length} seeded`);

  // 4. Fonts (platform-level)
  const fonts = [
    { slug: "standard", name: "Standard", fileName: "Roboto-Regular.ttf", isCurved: false, cssFamily: "'Sign-Roboto', sans-serif" },
    { slug: "curved", name: "Curved", fileName: "Lobster-Regular.ttf", isCurved: true, cssFamily: "'Sign-Lobster', cursive" },
    { slug: "bebas-neue", name: "Bebas Neue", fileName: "BebasNeue-Regular.ttf", isCurved: false, cssFamily: "'Sign-BebasNeue', sans-serif" },
    { slug: "montserrat", name: "Montserrat", fileName: "Montserrat-Regular.ttf", isCurved: false, cssFamily: "'Sign-Montserrat', sans-serif" },
    { slug: "oswald", name: "Oswald", fileName: "Oswald-Regular.ttf", isCurved: false, cssFamily: "'Sign-Oswald', sans-serif" },
    { slug: "playfair-display", name: "Playfair Display", fileName: "PlayfairDisplay-Regular.ttf", isCurved: false, cssFamily: "'Sign-PlayfairDisplay', serif" },
    { slug: "raleway", name: "Raleway", fileName: "Raleway-Regular.ttf", isCurved: false, cssFamily: "'Sign-Raleway', sans-serif" },
    { slug: "poppins", name: "Poppins", fileName: "Poppins-Regular.ttf", isCurved: false, cssFamily: "'Sign-Poppins', sans-serif" },
    { slug: "anton", name: "Anton", fileName: "Anton-Regular.ttf", isCurved: false, cssFamily: "'Sign-Anton', sans-serif" },
    { slug: "permanent-marker", name: "Permanent Marker", fileName: "PermanentMarker-Regular.ttf", isCurved: true, cssFamily: "'Sign-PermanentMarker', cursive" },
    { slug: "righteous", name: "Righteous", fileName: "Righteous-Regular.ttf", isCurved: true, cssFamily: "'Sign-Righteous', cursive" },
    { slug: "abril-fatface", name: "Abril Fatface", fileName: "AbrilFatface-Regular.ttf", isCurved: true, cssFamily: "'Sign-AbrilFatface', serif" },
    { slug: "passion-one", name: "Passion One", fileName: "PassionOne-Regular.ttf", isCurved: true, cssFamily: "'Sign-PassionOne', sans-serif" },
    { slug: "russo-one", name: "Russo One", fileName: "RussoOne-Regular.ttf", isCurved: false, cssFamily: "'Sign-RussoOne', sans-serif" },
    { slug: "black-ops-one", name: "Black Ops One", fileName: "BlackOpsOne-Regular.ttf", isCurved: false, cssFamily: "'Sign-BlackOpsOne', sans-serif" },
  ];

  for (const font of fonts) {
    const existing = await prisma.tenantFont.findFirst({
      where: { tenantId: null, slug: font.slug },
    });
    if (existing) {
      await prisma.tenantFont.update({
        where: { id: existing.id },
        data: { name: font.name, fileName: font.fileName, isCurved: font.isCurved },
      });
    } else {
      await prisma.tenantFont.create({
        data: {
          tenantId: null,
          source: "PLATFORM",
          fileUrl: `/fonts/${font.fileName}`,
          ...font,
        },
      });
    }
  }
  console.log(`  Fonts: ${fonts.length} seeded`);

  // 5. Pricing Formulas
  const formulaNames = [
    { name: "Channel Letter Standard", desc: "Default pricing for channel letters", presetId: "channel-letter-standard" },
    { name: "Square Footage Standard", desc: "Sq ft pricing for cabinets, lit shapes, light boxes", presetId: "sqft-standard" },
    { name: "Dimensional Letter Standard", desc: "Pricing for dimensional letters", presetId: "dimensional-standard" },
    { name: "Logo Standard", desc: "Sq inch pricing for logo signs", presetId: "logo-standard" },
    { name: "Print Sign Standard", desc: "Pricing for printed signs", presetId: "print-standard" },
    { name: "Sign Post Standard", desc: "Base + per-sqft for post/monument signs", presetId: "sign-post-standard" },
    { name: "Blade Sign Standard", desc: "Pricing for blade / projecting signs", presetId: "blade-standard" },
    { name: "LED Neon Standard", desc: "Per-inch pricing for LED neon", presetId: "neon-standard" },
    { name: "Banner Standard", desc: "Tiered sq-ft pricing for banners", presetId: "banner-standard" },
    { name: "Misc Signs Standard", desc: "Generic formula for a-frames, yard signs, plaques, etc.", presetId: "misc-standard" },
  ];

  const formulaIds: Record<string, string> = {};
  for (const f of formulaNames) {
    const formula = await prisma.pricingFormula.upsert({
      where: { tenantId_name: { tenantId: tenant.id, name: f.name } },
      update: {},
      create: { tenantId: tenant.id, name: f.name, description: f.desc, type: "PRESET", presetId: f.presetId },
    });
    formulaIds[f.presetId] = formula.id;
  }
  console.log(`  Pricing formulas: ${formulaNames.length} seeded`);

  // 6. Products (from product-definitions)
  const { channelLetterProducts, litShapeProducts, cabinetProducts, dimensionalProducts,
    logoProducts, printProducts, signPostProducts, lightBoxProducts, bladeProducts,
    neonProducts, bannerProducts, aFrameProducts, yardSignProducts, plaqueProducts,
    vinylGraphicProducts, wayfindingProducts, pushThroughProducts,
  } = await import("../src/engine/product-definitions.js");

  type PDef = { slug: string; name: string; description: string; category: string; pricingParams: unknown; formulaKey: string; options?: unknown };
  const productDefs: PDef[] = [
    ...channelLetterProducts.map(p => ({ slug: p.slug, name: p.name, description: p.description, category: "CHANNEL_LETTERS", pricingParams: p.pricingParams, formulaKey: "channel-letter-standard", options: (p as any).options })),
    ...litShapeProducts.map(p => ({ slug: p.slug, name: p.name, description: p.description, category: p.category, pricingParams: p.pricingParams, formulaKey: "sqft-standard" })),
    ...cabinetProducts.map(p => ({ slug: p.slug, name: p.name, description: p.description, category: p.category, pricingParams: p.pricingParams, formulaKey: "sqft-standard" })),
    ...dimensionalProducts.map(p => ({ slug: p.slug, name: p.name, description: p.description, category: p.category, pricingParams: p.pricingParams, formulaKey: "dimensional-standard" })),
    ...logoProducts.map(p => ({ slug: p.slug, name: p.name, description: p.description, category: p.category, pricingParams: p.pricingParams, formulaKey: "logo-standard" })),
    ...printProducts.map(p => ({ slug: p.slug, name: p.name, description: p.description, category: p.category, pricingParams: p.pricingParams, formulaKey: "print-standard" })),
    ...signPostProducts.map(p => ({ slug: p.slug, name: p.name, description: p.description, category: p.category, pricingParams: p.pricingParams, formulaKey: "sign-post-standard" })),
    ...lightBoxProducts.map(p => ({ slug: p.slug, name: p.name, description: p.description, category: p.category, pricingParams: p.pricingParams, formulaKey: "sqft-standard" })),
    ...bladeProducts.map(p => ({ slug: p.slug, name: p.name, description: p.description, category: p.category, pricingParams: p.pricingParams, formulaKey: "blade-standard" })),
    ...neonProducts.map(p => ({ slug: p.slug, name: p.name, description: p.description, category: p.category, pricingParams: p.pricingParams, formulaKey: "neon-standard" })),
    ...bannerProducts.map(p => ({ slug: p.slug, name: p.name, description: p.description, category: p.category, pricingParams: p.pricingParams, formulaKey: "banner-standard" })),
    ...aFrameProducts.map(p => ({ slug: p.slug, name: p.name, description: p.description, category: p.category, pricingParams: p.pricingParams, formulaKey: "misc-standard" })),
    ...yardSignProducts.map(p => ({ slug: p.slug, name: p.name, description: p.description, category: p.category, pricingParams: p.pricingParams, formulaKey: "misc-standard" })),
    ...plaqueProducts.map(p => ({ slug: p.slug, name: p.name, description: p.description, category: p.category, pricingParams: p.pricingParams, formulaKey: "misc-standard" })),
    ...vinylGraphicProducts.map(p => ({ slug: p.slug, name: p.name, description: p.description, category: p.category, pricingParams: p.pricingParams, formulaKey: "misc-standard" })),
    ...wayfindingProducts.map(p => ({ slug: p.slug, name: p.name, description: p.description, category: p.category, pricingParams: p.pricingParams, formulaKey: "misc-standard" })),
    ...pushThroughProducts.map(p => ({ slug: p.slug, name: p.name, description: p.description, category: p.category, pricingParams: p.pricingParams, formulaKey: "misc-standard" })),
  ];

  for (let i = 0; i < productDefs.length; i++) {
    const p = productDefs[i];
    await prisma.product.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: p.slug } },
      update: { name: p.name, description: p.description, pricingParams: p.pricingParams as any, productSchema: (p.options ?? null) as any, pricingFormulaId: formulaIds[p.formulaKey] },
      create: {
        tenantId: tenant.id, slug: p.slug, name: p.name, description: p.description,
        category: p.category, pricingParams: p.pricingParams as any, productSchema: (p.options ?? null) as any,
        sortOrder: i, isActive: true, pricingFormulaId: formulaIds[p.formulaKey],
      },
    });
  }
  console.log(`  Products: ${productDefs.length} seeded`);

  // 7. Sample Manufacturer
  await prisma.manufacturer.upsert({
    where: { slug: "gatsoft-manufacturing" },
    update: {},
    create: {
      name: "GatSoft Manufacturing", slug: "gatsoft-manufacturing",
      description: "In-house sign fabrication facility",
      city: "Los Angeles", state: "CA", country: "US",
      capabilities: ["channel-letters", "cabinet-signs", "dimensional-letters", "neon", "print-signs"],
      certifications: ["UL Listed"], isVerified: true, isActive: true, featuredOrder: 1,
    },
  });
  console.log(`  Manufacturers: 1 seeded`);

  console.log("\n✅ Seeding complete!");
  console.log(`\n📋 Admin Login:`);
  console.log(`   Email:    admin@gatsoftsigns.com`);
  console.log(`   Password: Admin123!`);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
