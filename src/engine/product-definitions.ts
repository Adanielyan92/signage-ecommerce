import type {
  PricingParams, ChannelLetterType, ProductOption,
  LitShapeType, CabinetSignType, DimensionalLetterType, LogoType, PrintSignType, SignPostType,
  LightBoxType, BladeSignType, NeonSignType, VinylBannerType,
  AFrameType, YardSignType, PlaqueType, VinylGraphicType, WayfindingType, PushThroughType,
  SqftPricingParams, LogoPricingParams, PrintPricingParams, SignPostPricingParams,
  BladePricingParams, NeonPricingParams, BannerPricingParams,
  AFramePricingParams, YardSignPricingParams, PlaquePricingParams,
  VinylGraphicPricingParams, WayfindingPricingParams, PushThroughPricingParams,
} from "@/types/product";

export interface ChannelLetterProduct {
  slug: ChannelLetterType;
  name: string;
  description: string;
  pricingParams: PricingParams;
  options: ProductOption[];
}

const commonOptions: ProductOption[] = [
  {
    id: "text",
    optionKey: "text",
    label: "Text",
    inputType: "text",
    defaultValue: "",
    isRequired: true,
  },
  {
    id: "height",
    optionKey: "height",
    label: "Height (inches)",
    inputType: "number",
    defaultValue: "12",
    isRequired: true,
  },
  {
    id: "font",
    optionKey: "font",
    label: "Font",
    inputType: "select",
    possibleValues: [
      { value: "Standard", label: "Standard (Roboto)" },
      { value: "Curved", label: "Curved (Lobster)" },
      { value: "Bebas Neue" },
      { value: "Montserrat" },
      { value: "Oswald" },
      { value: "Playfair Display" },
      { value: "Raleway" },
      { value: "Poppins" },
      { value: "Anton" },
      { value: "Permanent Marker" },
      { value: "Righteous" },
      { value: "Abril Fatface" },
      { value: "Passion One" },
      { value: "Russo One" },
      { value: "Black Ops One" },
    ],
    defaultValue: "Standard",
  },
  {
    id: "side_depth",
    optionKey: "side_depth",
    label: "Side Depth",
    inputType: "select",
    possibleValues: [{ value: '3"' }, { value: '4"' }, { value: '5"' }],
    defaultValue: '4"',
  },
  {
    id: "raceway",
    optionKey: "raceway",
    label: "Raceway",
    inputType: "select",
    possibleValues: [
      { value: "-" },
      { value: "Raceway" },
      { value: "Raceway Box" },
    ],
    defaultValue: "-",
  },
  {
    id: "painting",
    optionKey: "painting",
    label: "Painting",
    inputType: "select",
    possibleValues: [
      { value: "-" },
      { value: "Painted" },
      { value: "Painted Multicolor" },
    ],
    defaultValue: "-",
  },
  {
    id: "painting-color",
    optionKey: "painting-color",
    label: "Painting Colors",
    inputType: "number",
    defaultValue: "1",
    dependsOn: { painting: ["Painted Multicolor"] },
  },
  {
    id: "background",
    optionKey: "background",
    label: "Background",
    inputType: "select",
    possibleValues: [{ value: "-" }, { value: "Background" }],
    defaultValue: "-",
  },
];

const litOptions: ProductOption[] = [
  {
    id: "lit",
    optionKey: "lit",
    label: "Lit",
    inputType: "select",
    possibleValues: [{ value: "Lit" }, { value: "Non-Lit" }],
    defaultValue: "Lit",
  },
  {
    id: "led",
    optionKey: "led",
    label: "LED Color",
    inputType: "select",
    possibleValues: [
      { value: "3000K", label: "Warm White (3000K)" },
      { value: "3500K", label: "Neutral (3500K)" },
      { value: "6000K", label: "Cool White (6000K)" },
      { value: "Red", label: "Red" },
      { value: "Green", label: "Green" },
      { value: "Blue", label: "Blue" },
      { value: "RGB", label: "RGB Color" },
    ],
    defaultValue: "3000K",
    dependsOn: { lit: ["Lit"] },
  },
  {
    id: "lit_sides",
    optionKey: "lit_sides",
    label: "Lit Sides",
    inputType: "select",
    possibleValues: [{ value: "Face Lit" }, { value: "Duo Lit" }],
    defaultValue: "Face Lit",
    dependsOn: { lit: ["Lit"] },
  },
  {
    id: "vinyl",
    optionKey: "vinyl",
    label: "Vinyl",
    inputType: "select",
    possibleValues: [
      { value: "-" },
      { value: "Regular" },
      { value: "Perforated" },
    ],
    defaultValue: "-",
    dependsOn: { lit: ["Lit"] },
  },
];

const alwaysLitOptions: ProductOption[] = [
  {
    id: "lit",
    optionKey: "lit",
    label: "Lit",
    inputType: "select",
    possibleValues: [{ value: "Lit" }],
    defaultValue: "Lit",
  },
  {
    id: "led",
    optionKey: "led",
    label: "LED Color",
    inputType: "select",
    possibleValues: [
      { value: "3000K", label: "Warm White (3000K)" },
      { value: "3500K", label: "Neutral (3500K)" },
      { value: "6000K", label: "Cool White (6000K)" },
      { value: "Red", label: "Red" },
      { value: "Green", label: "Green" },
      { value: "Blue", label: "Blue" },
      { value: "RGB", label: "RGB Color" },
    ],
    defaultValue: "3000K",
  },
];

export const channelLetterProducts: ChannelLetterProduct[] = [
  {
    slug: "front-lit-trim-cap",
    name: "Front-Lit with Trim Cap",
    description:
      "Classic channel letters with translucent acrylic face, LED illumination behind, and aluminum returns with trim cap edges. The most popular choice for storefronts.",
    pricingParams: {
      basePricePerInch: 16,
      largeSizeThreshold: 36,
      largeSizePricePerInch: 18,
      minHeightForPrice: 12,
      minOrderPrice: 1360,
    },
    options: [
      ...commonOptions.slice(0, 3), // text, height, font
      ...litOptions,
      {
        id: "face",
        optionKey: "face",
        label: "Face",
        inputType: "select",
        possibleValues: [{ value: "Lexan 3/16" }],
        defaultValue: "Lexan 3/16",
      },
      ...commonOptions.slice(3), // side_depth, raceway, painting, painting-color, background
    ],
  },
  {
    slug: "trimless",
    name: "Trimless",
    description:
      "Sleek channel letters without visible trim cap for a clean, modern look. Uses acrylic face with smooth edges.",
    pricingParams: {
      basePricePerInch: 22,
      largeSizeThreshold: 36,
      largeSizePricePerInch: 24,
      minHeightForPrice: 12,
      minOrderPrice: 1360,
    },
    options: [
      ...commonOptions.slice(0, 3),
      ...alwaysLitOptions,
      {
        id: "face",
        optionKey: "face",
        label: "Face",
        inputType: "select",
        possibleValues: [{ value: 'Acrylic 1/4"' }],
        defaultValue: 'Acrylic 1/4"',
      },
      ...litOptions.filter((o) => o.optionKey === "vinyl"),
      ...commonOptions.slice(3),
    ],
  },
  {
    slug: "marquee-letters",
    name: "Marquee Letters",
    description:
      "Vintage-style open-face letters with exposed bulbs inside. Perfect for restaurants, theaters, and retro-themed businesses.",
    pricingParams: {
      basePricePerInch: 25,
      largeSizeThreshold: 36,
      largeSizePricePerInch: 28,
      minHeightForPrice: 12,
      minOrderPrice: 1360,
    },
    options: [
      ...commonOptions.slice(0, 3),
      ...alwaysLitOptions,
      {
        id: "face",
        optionKey: "face",
        label: "Face",
        inputType: "select",
        possibleValues: [{ value: "Bulbs" }],
        defaultValue: "Bulbs",
      },
      {
        id: "side_depth",
        optionKey: "side_depth",
        label: "Side Depth",
        inputType: "select",
        possibleValues: [{ value: '4"' }],
        defaultValue: '4"',
      },
      ...commonOptions.slice(4), // raceway, painting, painting-color, background
    ],
  },
  {
    slug: "back-lit",
    name: "Back-Lit Letters",
    description:
      "Opaque aluminum face with LEDs projecting light backward onto the wall, creating a dramatic halo glow effect.",
    pricingParams: {
      basePricePerInch: 18,
      largeSizeThreshold: 36,
      largeSizePricePerInch: 20,
      minHeightForPrice: 12,
      minOrderPrice: 1360,
    },
    options: [
      ...commonOptions.slice(0, 3),
      ...alwaysLitOptions,
      {
        id: "side_depth",
        optionKey: "side_depth",
        label: "Side Depth",
        inputType: "select",
        possibleValues: [{ value: '4"' }],
        defaultValue: '4"',
      },
      ...commonOptions.slice(4),
    ],
  },
  {
    slug: "halo-lit",
    name: "Halo-Lit Letters",
    description:
      "Premium reverse-lit letters with a bright halo glow visible around the letter edges. Creates an elegant, high-end appearance.",
    pricingParams: {
      basePricePerInch: 30,
      largeSizeThreshold: 36,
      largeSizePricePerInch: 34,
      minHeightForPrice: 12,
      minOrderPrice: 1360,
    },
    options: [
      ...commonOptions.slice(0, 3),
      ...alwaysLitOptions,
      {
        id: "side_depth",
        optionKey: "side_depth",
        label: "Side Depth",
        inputType: "select",
        possibleValues: [{ value: '4"' }],
        defaultValue: '4"',
      },
      ...commonOptions.slice(4),
    ],
  },
  {
    slug: "non-lit",
    name: "Non-Lit Letters",
    description:
      "Metal dimensional letters without illumination. Budget-friendly option for interior signage or locations without electrical access.",
    pricingParams: {
      basePricePerInch: 13,
      largeSizeThreshold: 36,
      largeSizePricePerInch: 15,
      minHeightForPrice: 12,
      minOrderPrice: 1360,
    },
    options: [...commonOptions],
  },
];

export function getProductBySlug(
  slug: string
): ChannelLetterProduct | undefined {
  return channelLetterProducts.find((p) => p.slug === slug);
}

// ---------------------------------------------------------------------------
// Lit Shape Products
// ---------------------------------------------------------------------------

export interface LitShapeProduct {
  slug: LitShapeType;
  name: string;
  description: string;
  category: "LIT_SHAPES";
  pricingParams: SqftPricingParams;
}

export const litShapeProducts: LitShapeProduct[] = [
  {
    slug: "cloud-sign",
    name: "Cloud Sign",
    description:
      "Single-piece LED lit shape sign contoured to your design or logo. Self-contained with easy installation.",
    category: "LIT_SHAPES",
    pricingParams: { basePricePerSqft: 85, minSqft: 4, minOrderPrice: 1500 },
  },
  {
    slug: "logo-shape",
    name: "Lit Logo Shape",
    description:
      "Custom LED lit logo sign built to the exact profile of your artwork.",
    category: "LIT_SHAPES",
    pricingParams: { basePricePerSqft: 95, minSqft: 4, minOrderPrice: 1500 },
  },
];

// ---------------------------------------------------------------------------
// Cabinet Products
// ---------------------------------------------------------------------------

export interface CabinetProduct {
  slug: CabinetSignType;
  name: string;
  description: string;
  category: "CABINET_SIGNS";
  pricingParams: SqftPricingParams;
}

export const cabinetProducts: CabinetProduct[] = [
  {
    slug: "single-face-squared",
    name: "Single Face Cabinet",
    description: "Rectangular lit cabinet sign with LED illuminated face.",
    category: "CABINET_SIGNS",
    pricingParams: { basePricePerSqft: 75, minSqft: 6, minOrderPrice: 1500 },
  },
  {
    slug: "double-face-squared",
    name: "Double Face Cabinet",
    description:
      "Two-sided lit cabinet sign, visible from both directions.",
    category: "CABINET_SIGNS",
    pricingParams: { basePricePerSqft: 120, minSqft: 6, minOrderPrice: 2000 },
  },
  {
    slug: "single-face-shaped",
    name: "Single Face Shaped Cabinet",
    description:
      "Custom-shaped lit cabinet sign contoured to your design.",
    category: "CABINET_SIGNS",
    pricingParams: { basePricePerSqft: 90, minSqft: 6, minOrderPrice: 1500 },
  },
  {
    slug: "double-face-shaped",
    name: "Double Face Shaped Cabinet",
    description: "Two-sided custom-shaped lit cabinet sign.",
    category: "CABINET_SIGNS",
    pricingParams: { basePricePerSqft: 140, minSqft: 6, minOrderPrice: 2000 },
  },
];

// ---------------------------------------------------------------------------
// Dimensional Letter Products
// ---------------------------------------------------------------------------

export interface DimensionalProduct {
  slug: DimensionalLetterType;
  name: string;
  description: string;
  category: "DIMENSIONAL_LETTERS";
  pricingParams: PricingParams;
}

export const dimensionalProducts: DimensionalProduct[] = [
  {
    slug: "acrylic",
    name: "Acrylic Letters",
    description: "Clear or colored acrylic dimensional letters.",
    category: "DIMENSIONAL_LETTERS",
    pricingParams: {
      basePricePerInch: 8,
      largeSizeThreshold: 36,
      largeSizePricePerInch: 10,
      minHeightForPrice: 12,
      minOrderPrice: 800,
    },
  },
  {
    slug: "painted-metal",
    name: "Painted Metal Letters",
    description: "Custom painted aluminum letters.",
    category: "DIMENSIONAL_LETTERS",
    pricingParams: {
      basePricePerInch: 12,
      largeSizeThreshold: 36,
      largeSizePricePerInch: 14,
      minHeightForPrice: 12,
      minOrderPrice: 1000,
    },
  },
  {
    slug: "brushed-metal",
    name: "Brushed Metal Letters",
    description: "Premium brushed aluminum finish letters.",
    category: "DIMENSIONAL_LETTERS",
    pricingParams: {
      basePricePerInch: 14,
      largeSizeThreshold: 36,
      largeSizePricePerInch: 16,
      minHeightForPrice: 12,
      minOrderPrice: 1000,
    },
  },
  {
    slug: "flat-cut-aluminum",
    name: "Flat-Cut Aluminum Letters",
    description: "Precision laser-cut aluminum letters.",
    category: "DIMENSIONAL_LETTERS",
    pricingParams: {
      basePricePerInch: 10,
      largeSizeThreshold: 36,
      largeSizePricePerInch: 12,
      minHeightForPrice: 12,
      minOrderPrice: 800,
    },
  },
];

// ---------------------------------------------------------------------------
// Logo Products
// ---------------------------------------------------------------------------

export interface LogoProduct {
  slug: LogoType;
  name: string;
  description: string;
  category: "LOGOS";
  pricingParams: LogoPricingParams;
}

export const logoProducts: LogoProduct[] = [
  {
    slug: "lit-logo",
    name: "Lit Logo",
    description: "LED illuminated custom logo sign.",
    category: "LOGOS",
    pricingParams: {
      basePricePerSqInch: 0.5,
      minDimension: 12,
      minOrderPrice: 1000,
    },
  },
  {
    slug: "non-lit-logo",
    name: "Non-Lit Logo",
    description: "Metal dimensional logo without illumination.",
    category: "LOGOS",
    pricingParams: {
      basePricePerSqInch: 0.3,
      minDimension: 12,
      minOrderPrice: 800,
    },
  },
];

// ---------------------------------------------------------------------------
// Print Products
// ---------------------------------------------------------------------------

export interface PrintProduct {
  slug: PrintSignType;
  name: string;
  description: string;
  category: "PRINT_SIGNS";
  pricingParams: PrintPricingParams;
}

export const printProducts: PrintProduct[] = [
  {
    slug: "acm-panel",
    name: "ACM Panel Sign",
    description:
      "Durable aluminum composite panel with printed vinyl.",
    category: "PRINT_SIGNS",
    pricingParams: { basePricePerSqft: 25, minSqft: 4, minOrderPrice: 200 },
  },
  {
    slug: "coroplast",
    name: "Coroplast Sign",
    description: "Lightweight corrugated plastic sign.",
    category: "PRINT_SIGNS",
    pricingParams: { basePricePerSqft: 12, minSqft: 4, minOrderPrice: 100 },
  },
  {
    slug: "foam-board",
    name: "Foam Board Sign",
    description: "Indoor display foam board sign.",
    category: "PRINT_SIGNS",
    pricingParams: { basePricePerSqft: 15, minSqft: 4, minOrderPrice: 100 },
  },
  {
    slug: "pvc",
    name: "PVC Sign",
    description: "Durable PVC (Sintra) board sign, weather-resistant for indoor and outdoor use.",
    category: "PRINT_SIGNS",
    pricingParams: { basePricePerSqft: 20, minSqft: 4, minOrderPrice: 150 },
  },
  {
    slug: "dibond",
    name: "Dibond Sign",
    description: "Premium aluminum composite panel with polyethylene core for a rigid, professional finish.",
    category: "PRINT_SIGNS",
    pricingParams: { basePricePerSqft: 30, minSqft: 4, minOrderPrice: 250 },
  },
];

// ---------------------------------------------------------------------------
// Sign Post Products
// ---------------------------------------------------------------------------

export interface SignPostProduct {
  slug: SignPostType;
  name: string;
  description: string;
  category: "SIGN_POSTS";
  pricingParams: SignPostPricingParams;
}

export const signPostProducts: SignPostProduct[] = [
  {
    slug: "single-post",
    name: "Single Post Sign",
    description: "Single post mounted sign.",
    category: "SIGN_POSTS",
    pricingParams: {
      basePrice: 450,
      pricePerSqftSign: 25,
      minOrderPrice: 600,
    },
  },
  {
    slug: "double-post",
    name: "Double Post Sign",
    description: "Double post mounted sign.",
    category: "SIGN_POSTS",
    pricingParams: {
      basePrice: 750,
      pricePerSqftSign: 25,
      minOrderPrice: 900,
    },
  },
  {
    slug: "monument-base",
    name: "Monument Sign",
    description: "Ground-level monument base sign.",
    category: "SIGN_POSTS",
    pricingParams: {
      basePrice: 1200,
      pricePerSqftSign: 30,
      minOrderPrice: 1500,
    },
  },
];

// ---------------------------------------------------------------------------
// Light Box Products
// ---------------------------------------------------------------------------

export interface LightBoxProduct {
  slug: LightBoxType;
  name: string;
  description: string;
  category: "LIGHT_BOX_SIGNS";
  pricingParams: SqftPricingParams;
}

export const lightBoxProducts: LightBoxProduct[] = [
  {
    slug: "light-box-single",
    name: "Single Face Light Box",
    description: "Single-sided illuminated light box sign.",
    category: "LIGHT_BOX_SIGNS",
    pricingParams: { basePricePerSqft: 85, minSqft: 4, minOrderPrice: 1200 },
  },
  {
    slug: "light-box-double",
    name: "Double Face Light Box",
    description: "Double-sided illuminated light box sign.",
    category: "LIGHT_BOX_SIGNS",
    pricingParams: { basePricePerSqft: 120, minSqft: 4, minOrderPrice: 1800 },
  },
  {
    slug: "light-box-push-through",
    name: "Push-Through Light Box",
    description: "Light box with push-through dimensional letters.",
    category: "LIGHT_BOX_SIGNS",
    pricingParams: { basePricePerSqft: 120, minSqft: 4, minOrderPrice: 1500 },
  },
];

// ---------------------------------------------------------------------------
// Blade Sign Products
// ---------------------------------------------------------------------------

export interface BladeProduct {
  slug: BladeSignType;
  name: string;
  description: string;
  category: "BLADE_SIGNS";
  pricingParams: BladePricingParams;
}

export const bladeProducts: BladeProduct[] = [
  {
    slug: "blade-rectangular",
    name: "Rectangular Blade Sign",
    description: "Rectangular projecting blade sign.",
    category: "BLADE_SIGNS",
    pricingParams: {
      basePricePerSqft: 60,
      litPricePerSqft: 90,
      minSqft: 2,
      minOrderPrice: 800,
    },
  },
  {
    slug: "blade-round",
    name: "Round Blade Sign",
    description: "Round projecting blade sign.",
    category: "BLADE_SIGNS",
    pricingParams: {
      basePricePerSqft: 60,
      litPricePerSqft: 90,
      minSqft: 2,
      minOrderPrice: 800,
    },
  },
];

// ---------------------------------------------------------------------------
// Neon Sign Products
// ---------------------------------------------------------------------------

export interface NeonProduct {
  slug: NeonSignType;
  name: string;
  description: string;
  category: "NEON_SIGNS";
  pricingParams: NeonPricingParams;
}

export const neonProducts: NeonProduct[] = [
  {
    slug: "led-neon",
    name: "LED Neon Sign",
    description: "Custom LED neon sign with flexible neon tubes.",
    category: "NEON_SIGNS",
    pricingParams: {
      pricePerInch: 12,
      minHeightForPrice: 8,
      minOrderPrice: 500,
      backerClearPerSqft: 15,
      backerBlackPerSqft: 20,
    },
  },
];

// ---------------------------------------------------------------------------
// Vinyl Banner Products
// ---------------------------------------------------------------------------

export interface BannerProduct {
  slug: VinylBannerType;
  name: string;
  description: string;
  category: "VINYL_BANNERS";
  pricingParams: BannerPricingParams;
}

const bannerTiers = [
  { maxSqft: 10, pricePerSqft: 8 },
  { maxSqft: 30, pricePerSqft: 5.4 },
  { maxSqft: 50, pricePerSqft: 4.5 },
  { maxSqft: 100, pricePerSqft: 3.5 },
  { maxSqft: Infinity, pricePerSqft: 2.55 },
];

export const bannerProducts: BannerProduct[] = [
  {
    slug: "vinyl-banner-13oz",
    name: "13oz Vinyl Banner",
    description: "Standard 13oz vinyl banner.",
    category: "VINYL_BANNERS",
    pricingParams: { tiers: bannerTiers, minOrderPrice: 50 },
  },
  {
    slug: "vinyl-banner-15oz",
    name: "15oz Heavy Duty Banner",
    description: "Heavy duty 15oz vinyl banner.",
    category: "VINYL_BANNERS",
    pricingParams: { tiers: bannerTiers, minOrderPrice: 50 },
  },
  {
    slug: "mesh-banner",
    name: "Mesh Banner",
    description: "Wind-resistant mesh banner.",
    category: "VINYL_BANNERS",
    pricingParams: { tiers: bannerTiers, minOrderPrice: 50 },
  },
];

// ---------------------------------------------------------------------------
// A-Frame / Sandwich Board Products
// ---------------------------------------------------------------------------

export interface AFrameProduct {
  slug: AFrameType;
  name: string;
  description: string;
  category: "A_FRAME_SIGNS";
  pricingParams: AFramePricingParams;
}

export const aFrameProducts: AFrameProduct[] = [
  {
    slug: "a-frame-standard",
    name: "Standard A-Frame",
    description: "Classic A-frame sandwich board with corrugated plastic panels.",
    category: "A_FRAME_SIGNS",
    pricingParams: { basePricePerSqft: 15, minOrderPrice: 150 },
  },
  {
    slug: "a-frame-metal",
    name: "Metal A-Frame",
    description: "Heavy-duty metal A-frame sign for permanent outdoor use.",
    category: "A_FRAME_SIGNS",
    pricingParams: { basePricePerSqft: 25, minOrderPrice: 150 },
  },
  {
    slug: "a-frame-plastic",
    name: "Plastic A-Frame",
    description: "Lightweight plastic A-frame sign, easy to move and store.",
    category: "A_FRAME_SIGNS",
    pricingParams: { basePricePerSqft: 12, minOrderPrice: 150 },
  },
];

// ---------------------------------------------------------------------------
// Yard Sign / Lawn Sign Products
// ---------------------------------------------------------------------------

export interface YardSignProduct {
  slug: YardSignType;
  name: string;
  description: string;
  category: "YARD_SIGNS";
  pricingParams: YardSignPricingParams;
}

export const yardSignProducts: YardSignProduct[] = [
  {
    slug: "yard-sign-coroplast",
    name: "Coroplast Yard Sign",
    description: "Standard corrugated plastic yard sign.",
    category: "YARD_SIGNS",
    pricingParams: { basePricePerSqft: 8, minOrderPrice: 50 },
  },
  {
    slug: "yard-sign-aluminum",
    name: "Aluminum Yard Sign",
    description: "Premium aluminum yard sign for long-term outdoor use.",
    category: "YARD_SIGNS",
    pricingParams: { basePricePerSqft: 18, minOrderPrice: 50 },
  },
];

// ---------------------------------------------------------------------------
// Plaque / Award Sign Products
// ---------------------------------------------------------------------------

export interface PlaqueProduct {
  slug: PlaqueType;
  name: string;
  description: string;
  category: "PLAQUES";
  pricingParams: PlaquePricingParams;
}

export const plaqueProducts: PlaqueProduct[] = [
  {
    slug: "plaque-aluminum",
    name: "Aluminum Plaque",
    description: "Professional aluminum plaque with custom engraving.",
    category: "PLAQUES",
    pricingParams: { basePricePerSqInch: 0.35, minOrderPrice: 100 },
  },
  {
    slug: "plaque-acrylic",
    name: "Acrylic Plaque",
    description: "Clear or tinted acrylic plaque with modern look.",
    category: "PLAQUES",
    pricingParams: { basePricePerSqInch: 0.25, minOrderPrice: 100 },
  },
  {
    slug: "plaque-wood",
    name: "Wood Plaque",
    description: "Natural wood plaque with engraved text.",
    category: "PLAQUES",
    pricingParams: { basePricePerSqInch: 0.30, minOrderPrice: 100 },
  },
  {
    slug: "plaque-brass",
    name: "Brass Plaque",
    description: "Premium brass plaque for distinguished signage.",
    category: "PLAQUES",
    pricingParams: { basePricePerSqInch: 0.50, minOrderPrice: 100 },
  },
];

// ---------------------------------------------------------------------------
// Vinyl Graphics / Window Graphics Products
// ---------------------------------------------------------------------------

export interface VinylGraphicProduct {
  slug: VinylGraphicType;
  name: string;
  description: string;
  category: "VINYL_GRAPHICS";
  pricingParams: VinylGraphicPricingParams;
}

export const vinylGraphicProducts: VinylGraphicProduct[] = [
  {
    slug: "vinyl-wall-graphic",
    name: "Wall Graphic",
    description: "Custom vinyl wall graphic for interior branding.",
    category: "VINYL_GRAPHICS",
    pricingParams: { basePricePerSqft: 8, minOrderPrice: 75 },
  },
  {
    slug: "vinyl-window-graphic",
    name: "Window Graphic",
    description: "Vinyl window graphic for storefront displays.",
    category: "VINYL_GRAPHICS",
    pricingParams: { basePricePerSqft: 12, minOrderPrice: 75 },
  },
  {
    slug: "vinyl-floor-graphic",
    name: "Floor Graphic",
    description: "Durable floor graphic with anti-slip lamination.",
    category: "VINYL_GRAPHICS",
    pricingParams: { basePricePerSqft: 18, minOrderPrice: 75 },
  },
  {
    slug: "vinyl-vehicle-wrap",
    name: "Vehicle Wrap",
    description: "Cast vinyl vehicle wrap for fleet branding.",
    category: "VINYL_GRAPHICS",
    pricingParams: { basePricePerSqft: 15, minOrderPrice: 75 },
  },
];

// ---------------------------------------------------------------------------
// Wayfinding / ADA Sign Products
// ---------------------------------------------------------------------------

export interface WayfindingProduct {
  slug: WayfindingType;
  name: string;
  description: string;
  category: "WAYFINDING_SIGNS";
  pricingParams: WayfindingPricingParams;
}

export const wayfindingProducts: WayfindingProduct[] = [
  {
    slug: "wayfinding-ada",
    name: "ADA Compliant Sign",
    description: "ADA-compliant sign with tactile text and Grade 2 Braille.",
    category: "WAYFINDING_SIGNS",
    pricingParams: { basePrice: 45, pricePerCharacter: 5, minOrderPrice: 100 },
  },
  {
    slug: "wayfinding-directional",
    name: "Directional Sign",
    description: "Wayfinding directional sign with arrows and icons.",
    category: "WAYFINDING_SIGNS",
    pricingParams: { basePrice: 25, pricePerCharacter: 2, minOrderPrice: 100 },
  },
  {
    slug: "wayfinding-room-id",
    name: "Room ID Sign",
    description: "Room identification sign for offices and facilities.",
    category: "WAYFINDING_SIGNS",
    pricingParams: { basePrice: 35, pricePerCharacter: 2, minOrderPrice: 100 },
  },
];

// ---------------------------------------------------------------------------
// Push-Through Sign Products
// ---------------------------------------------------------------------------

export interface PushThroughProduct {
  slug: PushThroughType;
  name: string;
  description: string;
  category: "PUSH_THROUGH_SIGNS";
  pricingParams: PushThroughPricingParams;
}

export const pushThroughProducts: PushThroughProduct[] = [
  {
    slug: "push-through-single",
    name: "Single-Sided Push-Through",
    description: "Single-sided push-through letter sign with LED illumination.",
    category: "PUSH_THROUGH_SIGNS",
    pricingParams: {
      cabinetPricePerSqft: 75,
      letterPricePerInch: 12,
      minOrderPrice: 1200,
    },
  },
  {
    slug: "push-through-double",
    name: "Double-Sided Push-Through",
    description: "Double-sided push-through letter sign with LED illumination.",
    category: "PUSH_THROUGH_SIGNS",
    pricingParams: {
      cabinetPricePerSqft: 75,
      letterPricePerInch: 12,
      minOrderPrice: 1200,
    },
  },
];

// ---------------------------------------------------------------------------
// Unified Lookup
// ---------------------------------------------------------------------------

export type AnyProduct =
  | ChannelLetterProduct
  | LitShapeProduct
  | CabinetProduct
  | DimensionalProduct
  | LogoProduct
  | PrintProduct
  | SignPostProduct
  | LightBoxProduct
  | BladeProduct
  | NeonProduct
  | BannerProduct
  | AFrameProduct
  | YardSignProduct
  | PlaqueProduct
  | VinylGraphicProduct
  | WayfindingProduct
  | PushThroughProduct;

export function getAnyProductBySlug(slug: string): AnyProduct | undefined {
  return (
    (channelLetterProducts as AnyProduct[]).find((p) => p.slug === slug) ||
    (litShapeProducts as AnyProduct[]).find((p) => p.slug === slug) ||
    (cabinetProducts as AnyProduct[]).find((p) => p.slug === slug) ||
    (dimensionalProducts as AnyProduct[]).find((p) => p.slug === slug) ||
    (logoProducts as AnyProduct[]).find((p) => p.slug === slug) ||
    (printProducts as AnyProduct[]).find((p) => p.slug === slug) ||
    (signPostProducts as AnyProduct[]).find((p) => p.slug === slug) ||
    (lightBoxProducts as AnyProduct[]).find((p) => p.slug === slug) ||
    (bladeProducts as AnyProduct[]).find((p) => p.slug === slug) ||
    (neonProducts as AnyProduct[]).find((p) => p.slug === slug) ||
    (bannerProducts as AnyProduct[]).find((p) => p.slug === slug) ||
    (aFrameProducts as AnyProduct[]).find((p) => p.slug === slug) ||
    (yardSignProducts as AnyProduct[]).find((p) => p.slug === slug) ||
    (plaqueProducts as AnyProduct[]).find((p) => p.slug === slug) ||
    (vinylGraphicProducts as AnyProduct[]).find((p) => p.slug === slug) ||
    (wayfindingProducts as AnyProduct[]).find((p) => p.slug === slug) ||
    (pushThroughProducts as AnyProduct[]).find((p) => p.slug === slug)
  );
}
