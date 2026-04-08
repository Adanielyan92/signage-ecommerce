import { PrismaClient } from "../generated/prisma/client";

export async function seedSalesforceProducts(prisma: PrismaClient) {
  console.log("Seeding Salesforce historic products...");

  const salesforceTemplates = [
    // --- Banners ---
    {
      slug: "sf-13oz-banner",
      name: "13oz Vinyl Banner",
      category: "VINYL_BANNERS",
      description: "Standard 13oz vinyl banner. Common options include hemming and grommets.",
      isPublic: true,
      pricingParams: {
        tiers: [
          { maxSqft: 10, pricePerSqft: 4.0 },
          { maxSqft: 50, pricePerSqft: 2.5 },
          { maxSqft: 100, pricePerSqft: 1.5 },
          { maxSqft: null, pricePerSqft: 1.0 }
        ],
        minOrderPrice: 30
      },
      productSchema: {
        options: [
          { id: "width", label: "Width (in)", inputType: "number", defaultValue: 96 },
          { id: "height", label: "Height (in)", inputType: "number", defaultValue: 48 },
          { id: "finishing", label: "Finishing", inputType: "select", possibleValues: ["None", "Hemming & Grommets", "Pole Pockets"] }
        ]
      }
    },
    {
      slug: "sf-15oz-banner",
      name: "15oz Heavy Duty Banner",
      category: "VINYL_BANNERS",
      description: "Heavy duty 15oz blockout vinyl banner for exterior use.",
      isPublic: true,
      pricingParams: {
        tiers: [
           { maxSqft: 50, pricePerSqft: 3.0 },
           { maxSqft: null, pricePerSqft: 2.0 }
        ],
        minOrderPrice: 45
      }
    },
    // --- Vinyl Decals ---
    {
      slug: "sf-3m40c-vinyl",
      name: "3M40C Vinyl Wall/Window Decal",
      category: "PRINT_SIGNS",
      description: "Premium 3M-40C adhesive vinyl wrap, suitable for interior walls and windows.",
      isPublic: true,
      pricingParams: {
        basePricePerSqft: 8.5,
        minSqft: 2,
        minOrderPrice: 50
      }
    },
    {
      slug: "sf-orajet-vinyl",
      name: "Orajet Window Decal",
      category: "PRINT_SIGNS",
      description: "Standard removable orajet vinyl for smooth surfaces.",
      isPublic: true,
      pricingParams: {
        basePricePerSqft: 6.0,
        minSqft: 2,
        minOrderPrice: 40
      }
    },
    // --- Rigid Print Signs ---
    {
      slug: "sf-080-aluminum",
      name: "0.080\" Aluminum Sign",
      category: "PRINT_SIGNS",
      description: "Direct print on heavy duty .080 aluminum. Used for strict exterior conditions.",
      isPublic: true,
      pricingParams: {
         basePricePerSqft: 15.0,
         minOrderPrice: 65,
         minSqft: 1
      }
    },
    {
      slug: "sf-030-aluminum",
      name: "0.030\" Aluminum Sign",
      category: "PRINT_SIGNS",
      description: "Direct print single sided on standard .030 aluminum base.",
      isPublic: true,
      pricingParams: {
         basePricePerSqft: 12.0,
         minOrderPrice: 45,
         minSqft: 1
      }
    },
    {
      slug: "sf-1-8-dibond",
      name: "1/8\" Dibond Panel",
      category: "PRINT_SIGNS",
      description: "Metal-finish or white Dibond aluminum composite panel.",
      isPublic: true,
      pricingParams: {
         basePricePerSqft: 14.0,
         minOrderPrice: 50
      }
    },
    {
      slug: "sf-1-4-pvc",
      name: "1/4\" PVC Panel",
      category: "PRINT_SIGNS",
      description: "White PVC board. Can be contour cut.",
      isPublic: true,
      pricingParams: {
         basePricePerSqft: 10.0,
         minOrderPrice: 35
      }
    },
    // --- Service Items ---
    {
      slug: "sf-service-design",
      name: "Design Services",
      category: "SERVICE",
      description: "Graphic design layout and pre-press validation.",
      isPublic: true,
      pricingParams: {
        flatRate: 65.0
      }
    },
    {
      slug: "sf-service-installation",
      name: "On-site Installation",
      category: "SERVICE",
      description: "Local installation labor rate (per day or per trip).",
      isPublic: true,
      pricingParams: {
        flatRate: 450.0
      }
    },
    {
      slug: "sf-service-rush",
      name: "Rush Fee",
      category: "SERVICE",
      description: "Expedited production timeline.",
      isPublic: true,
      pricingParams: {
        percentageMultiplier: 1.5,
        flatRateIfNoTotal: 150.0
      }
    }
  ];

  for (const template of salesforceTemplates) {
    const existing = await prisma.productTemplate.findFirst({
      where: { slug: template.slug }
    });

    if (existing) {
      await prisma.productTemplate.update({
        where: { id: existing.id },
        data: {
          name: template.name,
          description: template.description,
          pricingParams: template.pricingParams as any,
          productSchema: (template.productSchema || {}) as any
        }
      });
    } else {
      await prisma.productTemplate.create({
        data: {
          slug: template.slug,
          name: template.name,
          description: template.description,
          category: template.category,
          isPublic: true,
          pricingParams: template.pricingParams as any,
          productSchema: (template.productSchema || {}) as any
        }
      });
    }
  }

  console.log(`  Salesforce products: ${salesforceTemplates.length} templates seeded`);
}
