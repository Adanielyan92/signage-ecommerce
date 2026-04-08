// prisma/seed.ts
/**
 * Seed the database with platform-level data:
 * - Stock parts catalog (6 categories)
 * - Material presets (8 platform presets)
 * - Font catalog (15 platform fonts from font-map.ts)
 * - Default tenant (gatsoft)
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { seedSalesforceProducts } from "../src/seed/salesforce-products";

const prisma = new PrismaClient({} as never);

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

  // 2. Stock Parts (platform-level, tenantId = null)
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

  await seedSalesforceProducts(prisma);

  console.log("Seeding complete.");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
