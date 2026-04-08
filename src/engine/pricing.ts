/**
 * Main pricing entry point.
 * Isomorphic module — works on both client and server (no DOM dependencies).
 */

import type {
  PricingParams,
  SqftPricingParams,
  LogoPricingParams,
  PrintPricingParams,
  SignPostPricingParams,
  BladePricingParams,
  NeonPricingParams,
  BannerPricingParams,
  AFramePricingParams,
  YardSignPricingParams,
  PlaquePricingParams,
  VinylGraphicPricingParams,
  WayfindingPricingParams,
  PushThroughPricingParams,
} from "@/types/product";
import type {
  SignConfiguration,
  Dimensions,
  PriceBreakdown,
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
import { calculateChannelLetterPrice } from "./channel-letter-pricing";
import { calculateShapeSignPrice } from "./shape-sign-pricing";
import { calculateCabinetPrice } from "./cabinet-pricing";
import { calculateDimensionalPrice } from "./dimensional-pricing";
import { calculateLogoPrice } from "./logo-pricing";
import { calculatePrintPrice } from "./print-pricing";
import { calculateSignPostPrice } from "./sign-post-pricing";
import { calculateLightBoxPrice } from "./light-box-pricing";
import { calculateBladePrice } from "./blade-pricing";
import { calculateNeonPrice } from "./neon-pricing";
import { calculateBannerPrice } from "./banner-pricing";
import { calculateAFramePrice } from "./a-frame-pricing";
import { calculateYardSignPrice } from "./yard-sign-pricing";
import { calculatePlaquePrice } from "./plaque-pricing";
import { calculateVinylGraphicPrice } from "./vinyl-graphic-pricing";
import { calculateWayfindingPrice } from "./wayfinding-pricing";
import { calculatePushThroughPrice } from "./push-through-pricing";
import { getAnyProductBySlug } from "./product-definitions";

export { calculateChannelLetterPrice } from "./channel-letter-pricing";
export {
  calculateMultipliers,
  getCombinedMultiplier,
  evaluateCustomRules,
  evaluateAdditiveRules,
  DEFAULT_CHANNEL_LETTER_RULES,
} from "./multipliers";

/**
 * Calculate price for any channel letter product type.
 * All 6 types use the same formula — only the pricing params differ.
 */
export function calculatePrice(
  config: SignConfiguration,
  dimensions: Dimensions,
  params: PricingParams
): PriceBreakdown {
  return calculateChannelLetterPrice(config, dimensions, params);
}

/**
 * Calculate dimensions from configuration.
 * Uses letter count and average width ratio for estimation.
 * On the client, the 3D renderer provides exact measurements.
 * On the server, this provides an approximation for validation.
 */
export function estimateDimensions(config: SignConfiguration): Dimensions {
  const text = config.text.replace(/\s+/g, "");
  const letterCount = text.length;
  const height = config.height || 12;

  // Average letter width is ~60% of height for standard fonts, ~70% for curved
  const avgWidthRatio = config.font === "Curved" ? 0.7 : 0.6;
  const avgLetterWidth = height * avgWidthRatio;
  const letterWidths = Array(letterCount).fill(avgLetterWidth);
  const totalWidthInches = letterCount * avgLetterWidth;

  const squareFeet = (totalWidthInches * height) / 144;
  const linearFeet = ((totalWidthInches + height) * 2) / 12;

  return {
    totalWidthInches,
    heightInches: height,
    squareFeet,
    linearFeet,
    letterWidths,
  };
}

/**
 * Validate that a client-provided price matches server calculation.
 * Returns true if prices are within acceptable tolerance (1%).
 */
export function validatePrice(
  clientPrice: number,
  config: SignConfiguration,
  params: PricingParams
): { valid: boolean; serverPrice: number; difference: number } {
  const dimensions = estimateDimensions(config);
  const serverBreakdown = calculatePrice(config, dimensions, params);
  const difference = Math.abs(clientPrice - serverBreakdown.total);
  const tolerance = serverBreakdown.total * 0.01; // 1% tolerance

  return {
    valid: difference <= tolerance,
    serverPrice: serverBreakdown.total,
    difference,
  };
}

// ---------------------------------------------------------------------------
// Unified pricing router — routes to the correct engine by product category
// ---------------------------------------------------------------------------

/**
 * Calculate price for any product category.
 * Routes to the correct pricing engine based on productCategory.
 *
 * For legacy SignConfiguration objects (channel letters without a productCategory
 * field), this falls through to the existing calculatePrice() path.
 */
export function calculatePriceUnified(
  config: AnySignConfiguration,
  dimensions: Dimensions,
  overrideParams?: any
): PriceBreakdown {
  const product = getAnyProductBySlug(config.productType);
  if (!product) return emptyBreakdown();

  const finalParams = overrideParams || product.pricingParams;

  // Legacy SignConfiguration (channel letters) has no productCategory field
  if (!("productCategory" in config)) {
    return calculatePrice(
      config as SignConfiguration,
      dimensions,
      finalParams as PricingParams,
    );
  }

  switch (config.productCategory) {
    case "LIT_SHAPES":
      return calculateShapeSignPrice(
        config as LitShapeConfiguration,
        dimensions,
        finalParams as SqftPricingParams,
      );
    case "CABINET_SIGNS":
      return calculateCabinetPrice(
        config as CabinetConfiguration,
        dimensions,
        finalParams as SqftPricingParams,
      );
    case "DIMENSIONAL_LETTERS":
      return calculateDimensionalPrice(
        config as DimensionalLetterConfiguration,
        dimensions,
        finalParams as PricingParams,
      );
    case "LOGOS":
      return calculateLogoPrice(
        config as LogoConfiguration,
        dimensions,
        finalParams as LogoPricingParams,
      );
    case "PRINT_SIGNS":
      return calculatePrintPrice(
        config as PrintConfiguration,
        dimensions,
        finalParams as PrintPricingParams,
      );
    case "SIGN_POSTS":
      return calculateSignPostPrice(
        config as SignPostConfiguration,
        dimensions,
        finalParams as SignPostPricingParams,
      );
    case "LIGHT_BOX_SIGNS":
      return calculateLightBoxPrice(
        config as LightBoxConfiguration,
        dimensions,
        finalParams as SqftPricingParams,
      );
    case "BLADE_SIGNS":
      return calculateBladePrice(
        config as BladeSignConfiguration,
        dimensions,
        finalParams as BladePricingParams,
      );
    case "NEON_SIGNS":
      return calculateNeonPrice(
        config as NeonSignConfiguration,
        dimensions,
        finalParams as NeonPricingParams,
      );
    case "VINYL_BANNERS":
      return calculateBannerPrice(
        config as VinylBannerConfiguration,
        dimensions,
        finalParams as BannerPricingParams,
      );
    case "A_FRAME_SIGNS":
      return calculateAFramePrice(
        config as AFrameConfiguration,
        dimensions,
        finalParams as AFramePricingParams,
      );
    case "YARD_SIGNS":
      return calculateYardSignPrice(
        config as YardSignConfiguration,
        dimensions,
        finalParams as YardSignPricingParams,
      );
    case "PLAQUES":
      return calculatePlaquePrice(
        config as PlaqueConfiguration,
        dimensions,
        finalParams as PlaquePricingParams,
      );
    case "VINYL_GRAPHICS":
      return calculateVinylGraphicPrice(
        config as VinylGraphicConfiguration,
        dimensions,
        finalParams as VinylGraphicPricingParams,
      );
    case "WAYFINDING_SIGNS":
      return calculateWayfindingPrice(
        config as WayfindingConfiguration,
        dimensions,
        finalParams as WayfindingPricingParams,
      );
    case "PUSH_THROUGH_SIGNS":
      return calculatePushThroughPrice(
        config as PushThroughConfiguration,
        dimensions,
        finalParams as PushThroughPricingParams,
      );
    default:
      return emptyBreakdown();
  }
}

/**
 * Returns a zeroed-out PriceBreakdown for unknown/invalid product types.
 */
function emptyBreakdown(): PriceBreakdown {
  return {
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
}
