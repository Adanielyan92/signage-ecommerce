"use client";

import { create } from "zustand";
import type {
  SignConfiguration,
  Dimensions,
  PriceBreakdown,
  SceneMode,
  AnySignConfiguration,
  LitShapeConfiguration,
  CabinetConfiguration,
  DimensionalLetterConfiguration,
  LogoConfiguration,
  PrintConfiguration,
  SignPostConfiguration,
  LightBoxConfiguration,
  BladeSignConfiguration,
  NeonSignConfiguration,
  VinylBannerConfiguration,
  AFrameConfiguration,
  YardSignConfiguration,
  PlaqueConfiguration,
  VinylGraphicConfiguration,
  WayfindingConfiguration,
  PushThroughConfiguration,
} from "@/types/configurator";
import type {
  ChannelLetterType,
  ProductCategory,
  ProductTypeSlug,
} from "@/types/product";
import { calculatePrice, calculatePriceUnified } from "@/engine/pricing";
import { getProductBySlug } from "@/engine/product-definitions";
import type { ApiPriceBreakdown } from "@/lib/api-client";

type QualityLevel = "low" | "medium" | "high";

// ---------------------------------------------------------------------------
// Default configurations for each product category
// ---------------------------------------------------------------------------

const defaultConfig: SignConfiguration = {
  productType: "front-lit-trim-cap",
  text: "",
  height: 12,
  font: "Standard",
  lit: "Lit",
  led: "3000K",
  litSides: "Face Lit",
  sideDepth: '4"',
  painting: "-",
  paintingColors: 1,
  raceway: "-",
  vinyl: "-",
  background: "-",
};

const defaultLitShapeConfig: LitShapeConfiguration = {
  productCategory: "LIT_SHAPES",
  productType: "cloud-sign",
  widthInches: 36,
  heightInches: 24,
  led: "3000K",
  painting: "-",
  paintingColors: 1,
  mounting: "flush",
};

const defaultCabinetConfig: CabinetConfiguration = {
  productCategory: "CABINET_SIGNS",
  productType: "single-face-squared",
  widthInches: 48,
  heightInches: 36,
  led: "3000K",
  printedFace: false,
  mounting: "wall",
};

const defaultDimensionalConfig: DimensionalLetterConfiguration = {
  productCategory: "DIMENSIONAL_LETTERS",
  productType: "acrylic",
  text: "",
  height: 12,
  font: "Standard",
  thickness: "0.5",
  painting: "-",
  paintingColors: 1,
  mounting: "stud",
};

const defaultLogoConfig: LogoConfiguration = {
  productCategory: "LOGOS",
  productType: "lit-logo",
  widthInches: 24,
  heightInches: 24,
  led: "3000K",
  painting: "-",
  paintingColors: 1,
  depth: '2"',
};

const defaultPrintConfig: PrintConfiguration = {
  productCategory: "PRINT_SIGNS",
  productType: "acm-panel",
  widthInches: 48,
  heightInches: 24,
  grommets: "-",
  laminated: false,
};

const defaultSignPostConfig: SignPostConfiguration = {
  productCategory: "SIGN_POSTS",
  productType: "single-post",
  postHeight: 96,
  signWidthInches: 48,
  signHeightInches: 24,
  doubleSided: false,
};

const defaultLightBoxConfig: LightBoxConfiguration = {
  productCategory: "LIGHT_BOX_SIGNS",
  productType: "light-box-single",
  widthInches: 48,
  heightInches: 24,
  depth: "5",
  led: "3000K",
  faceType: "translucent",
  shape: "rectangular",
  mounting: "wall",
};

const defaultBladeConfig: BladeSignConfiguration = {
  productCategory: "BLADE_SIGNS",
  productType: "blade-rectangular",
  widthInches: 24,
  heightInches: 36,
  depth: "2",
  illuminated: false,
  led: "3000K",
  doubleSided: true,
  shape: "rectangular",
};

const defaultNeonConfig: NeonSignConfiguration = {
  productCategory: "NEON_SIGNS",
  productType: "led-neon",
  text: "",
  height: 12,
  font: "Standard",
  neonColor: "warm-white",
  backer: "clear-acrylic",
  backerShape: "rectangular",
};

const defaultBannerConfig: VinylBannerConfiguration = {
  productCategory: "VINYL_BANNERS",
  productType: "vinyl-banner-13oz",
  widthInches: 72,
  heightInches: 36,
  material: "13oz",
  finishing: "hem-grommets",
  doubleSided: false,
};

const defaultAFrameConfig: AFrameConfiguration = {
  productCategory: "A_FRAME_SIGNS",
  productType: "a-frame-standard",
  widthInches: 24,
  heightInches: 36,
  material: "corrugated-plastic",
  doubleSided: true,
  insertType: "printed-panel",
  baseWeight: "none",
};

const defaultYardSignConfig: YardSignConfiguration = {
  productCategory: "YARD_SIGNS",
  productType: "yard-sign-coroplast",
  widthInches: 24,
  heightInches: 18,
  material: "coroplast",
  doubleSided: false,
  stakeType: "h-stake",
  quantity: 1,
};

const defaultPlaqueConfig: PlaqueConfiguration = {
  productCategory: "PLAQUES",
  productType: "plaque-aluminum",
  widthInches: 12,
  heightInches: 8,
  material: "aluminum",
  thickness: "1/8",
  mounting: "flat",
  finish: "brushed",
  textEngraving: false,
};

const defaultVinylGraphicConfig: VinylGraphicConfiguration = {
  productCategory: "VINYL_GRAPHICS",
  productType: "vinyl-wall-graphic",
  widthInches: 48,
  heightInches: 36,
  vinylType: "calendered",
  lamination: "none",
  applicationSurface: "wall",
  contourCut: false,
};

const defaultWayfindingConfig: WayfindingConfiguration = {
  productCategory: "WAYFINDING_SIGNS",
  productType: "wayfinding-ada",
  widthInches: 12,
  heightInches: 8,
  material: "acrylic",
  adaCompliant: true,
  text: "",
  pictogram: "none",
  mounting: "wall",
};

const defaultPushThroughConfig: PushThroughConfiguration = {
  productCategory: "PUSH_THROUGH_SIGNS",
  productType: "push-through-single",
  widthInches: 48,
  heightInches: 24,
  depth: "4",
  faceMaterial: "acrylic-quarter",
  text: "",
  font: "Standard",
  letterHeight: 12,
  led: "3000K",
  frameFinish: "painted",
};

// ---------------------------------------------------------------------------
// Empty defaults
// ---------------------------------------------------------------------------

const emptyDimensions: Dimensions = {
  totalWidthInches: 0,
  heightInches: 12,
  squareFeet: 0,
  linearFeet: 0,
  letterWidths: [],
};

const emptyBreakdown: PriceBreakdown = {
  letterPrice: 0,
  multipliers: [],
  priceAfterMultipliers: 0,
  paintingExtra: 0,
  racewayPrice: 0,
  vinylPrice: 0,
  subtotal: 0,
  total: 0,
  minOrderApplied: false,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Estimate dimensions for a category config that specifies width+height directly */
function estimateCategoryDimensions(
  widthInches: number,
  heightInches: number,
): Dimensions {
  return {
    totalWidthInches: widthInches,
    heightInches,
    squareFeet: (widthInches * heightInches) / 144,
    linearFeet: ((widthInches + heightInches) * 2) / 12,
    letterWidths: [],
  };
}

/** Estimate dimensions for text-based category configs (dimensional letters) */
function estimateTextDimensions(
  text: string,
  height: number,
  font: string,
): Dimensions {
  const stripped = text.replace(/\s+/g, "");
  const letterCount = stripped.length;
  const avgWidthRatio = font === "Curved" ? 0.7 : 0.6;
  const avgLetterWidth = height * avgWidthRatio;
  const totalWidthInches = letterCount * avgLetterWidth;
  return {
    totalWidthInches,
    heightInches: height,
    squareFeet: (totalWidthInches * height) / 144,
    linearFeet: ((totalWidthInches + height) * 2) / 12,
    letterWidths: Array(letterCount).fill(avgLetterWidth),
  };
}

/** Get estimated dimensions for any non-channel-letter config */
function getDimensionsForCategoryConfig(
  cat: ProductCategory,
  state: Pick<
    ConfiguratorState,
    | "litShapeConfig"
    | "cabinetConfig"
    | "dimensionalConfig"
    | "logoConfig"
    | "printConfig"
    | "signPostConfig"
    | "lightBoxConfig"
    | "bladeConfig"
    | "neonConfig"
    | "bannerConfig"
    | "aFrameConfig"
    | "yardSignConfig"
    | "plaqueConfig"
    | "vinylGraphicConfig"
    | "wayfindingConfig"
    | "pushThroughConfig"
  >,
): Dimensions {
  switch (cat) {
    case "LIT_SHAPES":
      return estimateCategoryDimensions(
        state.litShapeConfig.widthInches,
        state.litShapeConfig.heightInches,
      );
    case "CABINET_SIGNS":
      return estimateCategoryDimensions(
        state.cabinetConfig.widthInches,
        state.cabinetConfig.heightInches,
      );
    case "DIMENSIONAL_LETTERS":
      return estimateTextDimensions(
        state.dimensionalConfig.text,
        state.dimensionalConfig.height,
        state.dimensionalConfig.font,
      );
    case "LOGOS":
      return estimateCategoryDimensions(
        state.logoConfig.widthInches,
        state.logoConfig.heightInches,
      );
    case "PRINT_SIGNS":
      return estimateCategoryDimensions(
        state.printConfig.widthInches,
        state.printConfig.heightInches,
      );
    case "SIGN_POSTS":
      return estimateCategoryDimensions(
        state.signPostConfig.signWidthInches,
        state.signPostConfig.signHeightInches,
      );
    case "LIGHT_BOX_SIGNS":
      return estimateCategoryDimensions(
        state.lightBoxConfig.widthInches,
        state.lightBoxConfig.heightInches,
      );
    case "BLADE_SIGNS":
      return estimateCategoryDimensions(
        state.bladeConfig.widthInches,
        state.bladeConfig.heightInches,
      );
    case "NEON_SIGNS":
      return estimateTextDimensions(
        state.neonConfig.text,
        state.neonConfig.height,
        state.neonConfig.font,
      );
    case "VINYL_BANNERS":
      return estimateCategoryDimensions(
        state.bannerConfig.widthInches,
        state.bannerConfig.heightInches,
      );
    case "A_FRAME_SIGNS":
      return estimateCategoryDimensions(
        state.aFrameConfig.widthInches,
        state.aFrameConfig.heightInches,
      );
    case "YARD_SIGNS":
      return estimateCategoryDimensions(
        state.yardSignConfig.widthInches,
        state.yardSignConfig.heightInches,
      );
    case "PLAQUES":
      return estimateCategoryDimensions(
        state.plaqueConfig.widthInches,
        state.plaqueConfig.heightInches,
      );
    case "VINYL_GRAPHICS":
      return estimateCategoryDimensions(
        state.vinylGraphicConfig.widthInches,
        state.vinylGraphicConfig.heightInches,
      );
    case "WAYFINDING_SIGNS":
      return estimateCategoryDimensions(
        state.wayfindingConfig.widthInches,
        state.wayfindingConfig.heightInches,
      );
    case "PUSH_THROUGH_SIGNS":
      return estimateCategoryDimensions(
        state.pushThroughConfig.widthInches,
        state.pushThroughConfig.heightInches,
      );
    default:
      return emptyDimensions;
  }
}

/** Get the active config object for a non-channel-letter category */
function getCategoryConfig(
  cat: ProductCategory,
  state: Pick<
    ConfiguratorState,
    | "litShapeConfig"
    | "cabinetConfig"
    | "dimensionalConfig"
    | "logoConfig"
    | "printConfig"
    | "signPostConfig"
    | "lightBoxConfig"
    | "bladeConfig"
    | "neonConfig"
    | "bannerConfig"
    | "aFrameConfig"
    | "yardSignConfig"
    | "plaqueConfig"
    | "vinylGraphicConfig"
    | "wayfindingConfig"
    | "pushThroughConfig"
  >,
): AnySignConfiguration | null {
  switch (cat) {
    case "LIT_SHAPES":
      return state.litShapeConfig;
    case "CABINET_SIGNS":
      return state.cabinetConfig;
    case "DIMENSIONAL_LETTERS":
      return state.dimensionalConfig;
    case "LOGOS":
      return state.logoConfig;
    case "PRINT_SIGNS":
      return state.printConfig;
    case "SIGN_POSTS":
      return state.signPostConfig;
    case "LIGHT_BOX_SIGNS":
      return state.lightBoxConfig;
    case "BLADE_SIGNS":
      return state.bladeConfig;
    case "NEON_SIGNS":
      return state.neonConfig;
    case "VINYL_BANNERS":
      return state.bannerConfig;
    case "A_FRAME_SIGNS":
      return state.aFrameConfig;
    case "YARD_SIGNS":
      return state.yardSignConfig;
    case "PLAQUES":
      return state.plaqueConfig;
    case "VINYL_GRAPHICS":
      return state.vinylGraphicConfig;
    case "WAYFINDING_SIGNS":
      return state.wayfindingConfig;
    case "PUSH_THROUGH_SIGNS":
      return state.pushThroughConfig;
    default:
      return null;
  }
}

function buildOptionValues(state: ConfiguratorState): Record<string, unknown> {
  if (state.productCategory === "CHANNEL_LETTERS") {
    const c = state.config;
    return {
      text: c.text,
      height: c.height,
      font: c.font,
      lit: c.lit,
      led: c.led,
      litSides: c.litSides,
      sideDepth: c.sideDepth,
      painting: c.painting,
      paintingColors: c.paintingColors,
      raceway: c.raceway,
      vinyl: c.vinyl,
      background: c.background,
      letterCount: c.text.replace(/\s+/g, "").length,
    };
  }
  // For other categories, use getCategoryConfig which is already defined in this file
  const activeConfig = getCategoryConfig(state.productCategory, state);
  if (!activeConfig) return {};
  return { ...activeConfig } as Record<string, unknown>;
}

function recalculate(
  config: SignConfiguration,
  dimensions: Dimensions,
): PriceBreakdown {
  const product = getProductBySlug(config.productType);
  if (!product) return emptyBreakdown;
  return calculatePrice(config, dimensions, product.pricingParams);
}

// ---------------------------------------------------------------------------
// Store Interface
// ---------------------------------------------------------------------------

interface ConfiguratorState {
  // --- Active product category ---
  productCategory: ProductCategory;

  // --- Channel letter config (backward compatible) ---
  config: SignConfiguration;
  dimensions: Dimensions;
  priceBreakdown: PriceBreakdown;
  quality: QualityLevel;
  sceneMode: SceneMode;
  isFlipped: boolean;

  // --- Non-channel-letter category configs ---
  litShapeConfig: LitShapeConfiguration;
  cabinetConfig: CabinetConfiguration;
  dimensionalConfig: DimensionalLetterConfiguration;
  logoConfig: LogoConfiguration;
  printConfig: PrintConfiguration;
  signPostConfig: SignPostConfiguration;
  lightBoxConfig: LightBoxConfiguration;
  bladeConfig: BladeSignConfiguration;
  neonConfig: NeonSignConfiguration;
  bannerConfig: VinylBannerConfiguration;
  aFrameConfig: AFrameConfiguration;
  yardSignConfig: YardSignConfiguration;
  plaqueConfig: PlaqueConfiguration;
  vinylGraphicConfig: VinylGraphicConfiguration;
  wayfindingConfig: WayfindingConfiguration;
  pushThroughConfig: PushThroughConfiguration;

  // --- Channel letter setters (backward compatible) ---
  setProductType: (type: ChannelLetterType) => void;
  setQuality: (quality: QualityLevel) => void;
  setSceneMode: (mode: SceneMode) => void;
  toggleFlip: () => void;
  setText: (text: string) => void;
  setHeight: (height: number) => void;
  setFont: (font: SignConfiguration["font"]) => void;
  setLit: (lit: SignConfiguration["lit"]) => void;
  setLed: (led: SignConfiguration["led"]) => void;
  setLitSides: (litSides: SignConfiguration["litSides"]) => void;
  setSideDepth: (depth: string) => void;
  setPainting: (painting: SignConfiguration["painting"]) => void;
  setPaintingColors: (count: number) => void;
  setRaceway: (raceway: SignConfiguration["raceway"]) => void;
  setVinyl: (vinyl: SignConfiguration["vinyl"]) => void;
  setBackground: (bg: string) => void;
  setDimensions: (dims: Dimensions) => void;
  resetConfig: () => void;
  recalculatePrice: () => void;

  // --- Multi-category actions ---
  setProductCategory: (
    category: ProductCategory,
    productType?: ProductTypeSlug,
  ) => void;

  /**
   * Generic setter for any field on the active non-channel-letter config.
   * For channel letters, use the specific setters above.
   */
  updateCategoryConfig: (key: string, value: unknown) => void;

  /**
   * Returns the currently active configuration object (any category).
   * For channel letters, returns the `config` field.
   * For other categories, returns the category-specific config.
   */
  getActiveConfig: () => AnySignConfiguration;

  // --- Image upload for logos/lit shapes ---
  uploadedImageUrl: string | null;
  setUploadedImageUrl: (url: string | null) => void;

  // --- API-based pricing ---
  apiProductId: string | null;
  apiPriceLoading: boolean;
  apiPriceBreakdown: ApiPriceBreakdown | null;
  setApiProductId: (id: string) => void;
  fetchApiPrice: () => void;
}

// ---------------------------------------------------------------------------
// Store Implementation
// ---------------------------------------------------------------------------

export const useConfiguratorStore = create<ConfiguratorState>((set, get) => ({
  // --- Defaults ---
  productCategory: "CHANNEL_LETTERS",
  config: defaultConfig,
  dimensions: emptyDimensions,
  priceBreakdown: emptyBreakdown,
  quality: "medium",
  sceneMode: "day",
  isFlipped: false,

  litShapeConfig: { ...defaultLitShapeConfig },
  cabinetConfig: { ...defaultCabinetConfig },
  dimensionalConfig: { ...defaultDimensionalConfig },
  logoConfig: { ...defaultLogoConfig },
  printConfig: { ...defaultPrintConfig },
  signPostConfig: { ...defaultSignPostConfig },
  lightBoxConfig: { ...defaultLightBoxConfig },
  bladeConfig: { ...defaultBladeConfig },
  neonConfig: { ...defaultNeonConfig },
  bannerConfig: { ...defaultBannerConfig },
  aFrameConfig: { ...defaultAFrameConfig },
  yardSignConfig: { ...defaultYardSignConfig },
  plaqueConfig: { ...defaultPlaqueConfig },
  vinylGraphicConfig: { ...defaultVinylGraphicConfig },
  wayfindingConfig: { ...defaultWayfindingConfig },
  pushThroughConfig: { ...defaultPushThroughConfig },

  // --- Channel letter setters (unchanged for backward compat) ---

  setQuality: (quality) => {
    set({ quality });
  },

  setSceneMode: (sceneMode) => {
    set({ sceneMode });
  },

  toggleFlip: () => {
    set((s) => ({ isFlipped: !s.isFlipped }));
  },

  setProductType: (type) => {
    const product = getProductBySlug(type);
    const newConfig = {
      ...get().config,
      productType: type,
      lit: type === "non-lit" ? ("Non-Lit" as const) : get().config.lit,
    };
    if (product) {
      const depthOption = product.options.find(
        (o) => o.optionKey === "side_depth",
      );
      if (depthOption?.possibleValues?.length === 1) {
        newConfig.sideDepth = depthOption.possibleValues[0].value;
      }
    }
    set({ config: newConfig, productCategory: "CHANNEL_LETTERS" });
    get().recalculatePrice();
  },

  setText: (text) => {
    set((s) => ({ config: { ...s.config, text } }));
    get().recalculatePrice();
  },

  setHeight: (height) => {
    set((s) => ({ config: { ...s.config, height } }));
    get().recalculatePrice();
  },

  setFont: (font) => {
    set((s) => ({ config: { ...s.config, font } }));
    get().recalculatePrice();
  },

  setLit: (lit) => {
    set((s) => ({ config: { ...s.config, lit } }));
    get().recalculatePrice();
  },

  setLed: (led) => {
    set((s) => ({ config: { ...s.config, led } }));
    get().recalculatePrice();
  },

  setLitSides: (litSides) => {
    set((s) => ({ config: { ...s.config, litSides } }));
    get().recalculatePrice();
  },

  setSideDepth: (sideDepth) => {
    set((s) => ({ config: { ...s.config, sideDepth } }));
    get().recalculatePrice();
  },

  setPainting: (painting) => {
    set((s) => ({ config: { ...s.config, painting } }));
    get().recalculatePrice();
  },

  setPaintingColors: (paintingColors) => {
    set((s) => ({ config: { ...s.config, paintingColors } }));
    get().recalculatePrice();
  },

  setRaceway: (raceway) => {
    set((s) => ({ config: { ...s.config, raceway } }));
    get().recalculatePrice();
  },

  setVinyl: (vinyl) => {
    set((s) => ({ config: { ...s.config, vinyl } }));
    get().recalculatePrice();
  },

  setBackground: (bg) => {
    set((s) => ({ config: { ...s.config, background: bg } }));
    get().recalculatePrice();
  },

  setDimensions: (dimensions) => {
    set({ dimensions });
    get().recalculatePrice();
  },

  resetConfig: () => {
    set({
      productCategory: "CHANNEL_LETTERS",
      config: defaultConfig,
      dimensions: emptyDimensions,
      priceBreakdown: emptyBreakdown,
      litShapeConfig: { ...defaultLitShapeConfig },
      cabinetConfig: { ...defaultCabinetConfig },
      dimensionalConfig: { ...defaultDimensionalConfig },
      logoConfig: { ...defaultLogoConfig },
      printConfig: { ...defaultPrintConfig },
      signPostConfig: { ...defaultSignPostConfig },
      lightBoxConfig: { ...defaultLightBoxConfig },
      bladeConfig: { ...defaultBladeConfig },
      neonConfig: { ...defaultNeonConfig },
      bannerConfig: { ...defaultBannerConfig },
      aFrameConfig: { ...defaultAFrameConfig },
      yardSignConfig: { ...defaultYardSignConfig },
      plaqueConfig: { ...defaultPlaqueConfig },
      vinylGraphicConfig: { ...defaultVinylGraphicConfig },
      wayfindingConfig: { ...defaultWayfindingConfig },
      pushThroughConfig: { ...defaultPushThroughConfig },
    });
  },

  // --- Price recalculation (routes by category) ---

  recalculatePrice: () => {
    const state = get();
    const { productCategory } = state;

    if (productCategory === "CHANNEL_LETTERS") {
      // Legacy path — uses existing calculatePrice for channel letters
      const priceBreakdown = recalculate(state.config, state.dimensions);
      set({ priceBreakdown });
    } else {
      // New categories — use unified pricing router
      const categoryConfig = getCategoryConfig(productCategory, state);
      if (!categoryConfig) {
        set({ priceBreakdown: emptyBreakdown });
        return;
      }
      const dims = getDimensionsForCategoryConfig(productCategory, state);
      const priceBreakdown = calculatePriceUnified(categoryConfig, dims);
      set({ priceBreakdown, dimensions: dims });
    }
  },

  // --- Multi-category actions ---

  setProductCategory: (category, productType) => {
    if (category === "CHANNEL_LETTERS") {
      // Switch back to channel letters
      const type = (productType as ChannelLetterType) || get().config.productType;
      set({ productCategory: "CHANNEL_LETTERS" });
      get().setProductType(type);
      return;
    }

    // For non-channel-letter categories, set category and optionally the product type
    const updates: Partial<ConfiguratorState> = {
      productCategory: category,
    };

    if (productType) {
      switch (category) {
        case "LIT_SHAPES":
          updates.litShapeConfig = {
            ...get().litShapeConfig,
            productType: productType as LitShapeConfiguration["productType"],
          };
          break;
        case "CABINET_SIGNS":
          updates.cabinetConfig = {
            ...get().cabinetConfig,
            productType: productType as CabinetConfiguration["productType"],
          };
          break;
        case "DIMENSIONAL_LETTERS":
          updates.dimensionalConfig = {
            ...get().dimensionalConfig,
            productType: productType as DimensionalLetterConfiguration["productType"],
          };
          break;
        case "LOGOS":
          updates.logoConfig = {
            ...get().logoConfig,
            productType: productType as LogoConfiguration["productType"],
          };
          break;
        case "PRINT_SIGNS":
          updates.printConfig = {
            ...get().printConfig,
            productType: productType as PrintConfiguration["productType"],
          };
          break;
        case "SIGN_POSTS":
          updates.signPostConfig = {
            ...get().signPostConfig,
            productType: productType as SignPostConfiguration["productType"],
          };
          break;
        case "LIGHT_BOX_SIGNS":
          updates.lightBoxConfig = {
            ...get().lightBoxConfig,
            productType: productType as LightBoxConfiguration["productType"],
          };
          break;
        case "BLADE_SIGNS":
          updates.bladeConfig = {
            ...get().bladeConfig,
            productType: productType as BladeSignConfiguration["productType"],
          };
          break;
        case "NEON_SIGNS":
          updates.neonConfig = {
            ...get().neonConfig,
            productType: productType as NeonSignConfiguration["productType"],
          };
          break;
        case "VINYL_BANNERS":
          updates.bannerConfig = {
            ...get().bannerConfig,
            productType: productType as VinylBannerConfiguration["productType"],
          };
          break;
        case "A_FRAME_SIGNS":
          updates.aFrameConfig = {
            ...get().aFrameConfig,
            productType: productType as AFrameConfiguration["productType"],
          };
          break;
        case "YARD_SIGNS":
          updates.yardSignConfig = {
            ...get().yardSignConfig,
            productType: productType as YardSignConfiguration["productType"],
          };
          break;
        case "PLAQUES":
          updates.plaqueConfig = {
            ...get().plaqueConfig,
            productType: productType as PlaqueConfiguration["productType"],
          };
          break;
        case "VINYL_GRAPHICS":
          updates.vinylGraphicConfig = {
            ...get().vinylGraphicConfig,
            productType: productType as VinylGraphicConfiguration["productType"],
          };
          break;
        case "WAYFINDING_SIGNS":
          updates.wayfindingConfig = {
            ...get().wayfindingConfig,
            productType: productType as WayfindingConfiguration["productType"],
          };
          break;
        case "PUSH_THROUGH_SIGNS":
          updates.pushThroughConfig = {
            ...get().pushThroughConfig,
            productType: productType as PushThroughConfiguration["productType"],
          };
          break;
      }
    }

    set(updates as Partial<ConfiguratorState>);
    get().recalculatePrice();
  },

  updateCategoryConfig: (key, value) => {
    const { productCategory } = get();

    switch (productCategory) {
      case "CHANNEL_LETTERS":
        // For channel letters, fall through to the config object
        set((s) => ({
          config: { ...s.config, [key]: value },
        }));
        break;
      case "LIT_SHAPES":
        set((s) => ({
          litShapeConfig: { ...s.litShapeConfig, [key]: value },
        }));
        break;
      case "CABINET_SIGNS":
        set((s) => ({
          cabinetConfig: { ...s.cabinetConfig, [key]: value },
        }));
        break;
      case "DIMENSIONAL_LETTERS":
        set((s) => ({
          dimensionalConfig: { ...s.dimensionalConfig, [key]: value },
        }));
        break;
      case "LOGOS":
        set((s) => ({
          logoConfig: { ...s.logoConfig, [key]: value },
        }));
        break;
      case "PRINT_SIGNS":
        set((s) => ({
          printConfig: { ...s.printConfig, [key]: value },
        }));
        break;
      case "SIGN_POSTS":
        set((s) => ({
          signPostConfig: { ...s.signPostConfig, [key]: value },
        }));
        break;
      case "LIGHT_BOX_SIGNS":
        set((s) => ({
          lightBoxConfig: { ...s.lightBoxConfig, [key]: value } as LightBoxConfiguration,
        }));
        break;
      case "BLADE_SIGNS":
        set((s) => ({
          bladeConfig: { ...s.bladeConfig, [key]: value } as BladeSignConfiguration,
        }));
        break;
      case "NEON_SIGNS":
        set((s) => ({
          neonConfig: { ...s.neonConfig, [key]: value } as NeonSignConfiguration,
        }));
        break;
      case "VINYL_BANNERS":
        set((s) => ({
          bannerConfig: { ...s.bannerConfig, [key]: value } as VinylBannerConfiguration,
        }));
        break;
      case "A_FRAME_SIGNS":
        set((s) => ({
          aFrameConfig: { ...s.aFrameConfig, [key]: value } as AFrameConfiguration,
        }));
        break;
      case "YARD_SIGNS":
        set((s) => ({
          yardSignConfig: { ...s.yardSignConfig, [key]: value } as YardSignConfiguration,
        }));
        break;
      case "PLAQUES":
        set((s) => ({
          plaqueConfig: { ...s.plaqueConfig, [key]: value } as PlaqueConfiguration,
        }));
        break;
      case "VINYL_GRAPHICS":
        set((s) => ({
          vinylGraphicConfig: { ...s.vinylGraphicConfig, [key]: value } as VinylGraphicConfiguration,
        }));
        break;
      case "WAYFINDING_SIGNS":
        set((s) => ({
          wayfindingConfig: { ...s.wayfindingConfig, [key]: value } as WayfindingConfiguration,
        }));
        break;
      case "PUSH_THROUGH_SIGNS":
        set((s) => ({
          pushThroughConfig: { ...s.pushThroughConfig, [key]: value } as PushThroughConfiguration,
        }));
        break;
    }

    get().recalculatePrice();
  },

  getActiveConfig: () => {
    const state = get();
    if (state.productCategory === "CHANNEL_LETTERS") {
      return state.config;
    }
    return getCategoryConfig(state.productCategory, state) ?? state.config;
  },

  // --- Image upload for logos/lit shapes ---
  uploadedImageUrl: null,
  setUploadedImageUrl: (url) => set({ uploadedImageUrl: url }),

  // --- API-based pricing ---

  apiProductId: null,
  apiPriceLoading: false,
  apiPriceBreakdown: null,

  setApiProductId: (id) => set({ apiProductId: id }),

  fetchApiPrice: () => {
    const state = get();
    if (!state.apiProductId) return;

    set({ apiPriceLoading: true });

    const optionValues = buildOptionValues(state);
    const dimensions = {
      widthInches: state.dimensions.totalWidthInches,
      heightInches: state.dimensions.heightInches,
    };

    fetch("/api/v1/pricing/calculate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        productId: state.apiProductId,
        optionValues,
        dimensions,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.breakdown) {
          set({
            apiPriceBreakdown: data.breakdown,
            apiPriceLoading: false,
          });
        }
      })
      .catch(() => {
        set({ apiPriceLoading: false });
      });
  },
}));
