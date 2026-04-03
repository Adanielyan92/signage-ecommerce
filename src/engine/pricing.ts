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
} from "@/types/configurator";
import { calculateChannelLetterPrice } from "./channel-letter-pricing";
import { calculateShapeSignPrice } from "./shape-sign-pricing";
import { calculateCabinetPrice } from "./cabinet-pricing";
import { calculateDimensionalPrice } from "./dimensional-pricing";
import { calculateLogoPrice } from "./logo-pricing";
import { calculatePrintPrice } from "./print-pricing";
import { calculateSignPostPrice } from "./sign-post-pricing";
import { getAnyProductBySlug } from "./product-definitions";

export { calculateChannelLetterPrice } from "./channel-letter-pricing";
export { calculateMultipliers, getCombinedMultiplier } from "./multipliers";

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
): PriceBreakdown {
  const product = getAnyProductBySlug(config.productType);
  if (!product) return emptyBreakdown();

  // Legacy SignConfiguration (channel letters) has no productCategory field
  if (!("productCategory" in config)) {
    return calculatePrice(
      config as SignConfiguration,
      dimensions,
      product.pricingParams as PricingParams,
    );
  }

  switch (config.productCategory) {
    case "LIT_SHAPES":
      return calculateShapeSignPrice(
        config as LitShapeConfiguration,
        dimensions,
        product.pricingParams as SqftPricingParams,
      );
    case "CABINET_SIGNS":
      return calculateCabinetPrice(
        config as CabinetConfiguration,
        dimensions,
        product.pricingParams as SqftPricingParams,
      );
    case "DIMENSIONAL_LETTERS":
      return calculateDimensionalPrice(
        config as DimensionalLetterConfiguration,
        dimensions,
        product.pricingParams as PricingParams,
      );
    case "LOGOS":
      return calculateLogoPrice(
        config as LogoConfiguration,
        dimensions,
        product.pricingParams as LogoPricingParams,
      );
    case "PRINT_SIGNS":
      return calculatePrintPrice(
        config as PrintConfiguration,
        dimensions,
        product.pricingParams as PrintPricingParams,
      );
    case "SIGN_POSTS":
      return calculateSignPostPrice(
        config as SignPostConfiguration,
        dimensions,
        product.pricingParams as SignPostPricingParams,
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
