import type { PricingParams } from "@/types/product";
import type {
  SignConfiguration,
  Dimensions,
  PriceBreakdown,
} from "@/types/configurator";
import { calculateMultipliers, getCombinedMultiplier, evaluateAdditiveRules } from "./multipliers";

/**
 * Calculate the full price breakdown for a channel letter sign configuration.
 *
 * Ported from:
 *   - signage-price-calculator/src/pages/canvas-calc/utils/priceCalculator.ts
 *   - signage-price-calculator/src/pages/calc/utils/useCalculate.ts (calculateChannelLetterPrice)
 *
 * Pricing formula:
 *   1. Per-letter price = heightUsedForPrice * pricePerInch
 *   2. Total letter price = letterCount * perLetterPrice
 *   3. Apply multipliers (lit, LED, font, depth, litSides, background, painting)
 *   4. Add multicolor painting surcharge: letterCount * 300 * (colorCount - 1)
 *   5. Add raceway: width * $50/12 (linear) or sqft * $50 (box)
 *   6. Add vinyl: sqft * $5 (regular) or sqft * $10 (perforated)
 *   7. Add any additive custom rules (fixed_add, per_unit_add, per_sqft_add)
 *   8. Enforce minimum order price
 */
export function calculateChannelLetterPrice(
  config: SignConfiguration,
  dimensions: Dimensions,
  params: PricingParams
): PriceBreakdown {
  const {
    basePricePerInch,
    largeSizeThreshold,
    largeSizePricePerInch,
    minHeightForPrice,
    minOrderPrice,
    rules,
  } = params;

  // Count letters (no spaces)
  const text = config.text.replace(/\s+/g, "");
  const letterCount = text.length;

  if (letterCount === 0) {
    return emptyBreakdown();
  }

  // Price per inch based on height threshold
  const pricePerInch =
    config.height > largeSizeThreshold
      ? largeSizePricePerInch
      : basePricePerInch;

  // Use minimum height for pricing if actual height is smaller
  const heightUsedForPrice = Math.max(config.height, minHeightForPrice);

  // Base letter price
  const perLetterPrice = heightUsedForPrice * pricePerInch;
  const letterPrice = letterCount * perLetterPrice;

  // Multipliers — pass custom rules if available
  const multipliers = calculateMultipliers(config, rules);
  const combinedMultiplier = getCombinedMultiplier(multipliers);
  const priceAfterMultipliers = letterPrice * combinedMultiplier;

  // Multicolor painting surcharge (always uses hardcoded formula)
  let paintingExtra = 0;
  if (
    config.painting === "Painted Multicolor" &&
    config.paintingColors > 1
  ) {
    paintingExtra = letterCount * 300 * (config.paintingColors - 1);
  }

  // Raceway add-on
  let racewayPrice = 0;
  if (config.raceway === "Raceway" && dimensions.totalWidthInches > 0) {
    racewayPrice = (dimensions.totalWidthInches * 50) / 12; // per foot
  } else if (
    config.raceway === "Raceway Box" &&
    dimensions.squareFeet > 0
  ) {
    racewayPrice = dimensions.squareFeet * 50;
  }

  // Vinyl add-on
  let vinylPrice = 0;
  if (config.vinyl === "Regular" && dimensions.squareFeet > 0) {
    vinylPrice = dimensions.squareFeet * 5;
  } else if (config.vinyl === "Perforated" && dimensions.squareFeet > 0) {
    vinylPrice = dimensions.squareFeet * 10;
  }

  // Additive custom rules (fixed_add, per_unit_add, per_sqft_add)
  let customAdditives = 0;
  if (rules && rules.length > 0) {
    customAdditives = evaluateAdditiveRules(
      config,
      rules,
      letterCount,
      dimensions.squareFeet
    );
  }

  const subtotal =
    priceAfterMultipliers + paintingExtra + racewayPrice + vinylPrice + customAdditives;
  const total = Math.max(subtotal, minOrderPrice);
  const minOrderApplied = subtotal < minOrderPrice;

  return {
    letterPrice,
    multipliers,
    priceAfterMultipliers,
    paintingExtra,
    racewayPrice,
    vinylPrice,
    subtotal: round(subtotal),
    total: round(total),
    minOrderApplied,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

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
