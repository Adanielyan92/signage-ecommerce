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
} from "@/types/configurator";
import type {
  ChannelLetterType,
  ProductCategory,
  ProductTypeSlug,
} from "@/types/product";
import { calculatePrice, calculatePriceUnified } from "@/engine/pricing";
import { getProductBySlug } from "@/engine/product-definitions";

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
  thickness: "1",
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
    default:
      return null;
  }
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

  // --- Non-channel-letter category configs ---
  litShapeConfig: LitShapeConfiguration;
  cabinetConfig: CabinetConfiguration;
  dimensionalConfig: DimensionalLetterConfiguration;
  logoConfig: LogoConfiguration;
  printConfig: PrintConfiguration;
  signPostConfig: SignPostConfiguration;

  // --- Channel letter setters (backward compatible) ---
  setProductType: (type: ChannelLetterType) => void;
  setQuality: (quality: QualityLevel) => void;
  setSceneMode: (mode: SceneMode) => void;
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

  litShapeConfig: { ...defaultLitShapeConfig },
  cabinetConfig: { ...defaultCabinetConfig },
  dimensionalConfig: { ...defaultDimensionalConfig },
  logoConfig: { ...defaultLogoConfig },
  printConfig: { ...defaultPrintConfig },
  signPostConfig: { ...defaultSignPostConfig },

  // --- Channel letter setters (unchanged for backward compat) ---

  setQuality: (quality) => {
    set({ quality });
  },

  setSceneMode: (sceneMode) => {
    set({ sceneMode });
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
}));
