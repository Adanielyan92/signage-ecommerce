import type { SqftPricingParams } from "@/types/product";
import type {
  LitShapeConfiguration,
  Dimensions,
  PriceBreakdown,
  MultiplierDetail,
} from "@/types/configurator";

/**
 * Calculate the full price breakdown for a lit shape sign configuration.
 *
 * Pricing formula:
 *   1. sqftUsed = max(squareFeet, minSqft)
 *   2. basePrice = sqftUsed * basePricePerSqft
 *   3. Apply multipliers (RGB LED, Painted, Standoff mount)
 *   4. Enforce minimum order price
 *
 * Maps to PriceBreakdown fields:
 *   - letterPrice → basePrice (sqft * rate)
 *   - paintingExtra → 0 (not applicable for shapes)
 *   - racewayPrice → 0 (not applicable for shapes)
 *   - vinylPrice → 0 (not applicable for shapes)
 */
export function calculateShapeSignPrice(
  config: LitShapeConfiguration,
  dimensions: Dimensions,
  params: SqftPricingParams
): PriceBreakdown {
  const { basePricePerSqft, minSqft, minOrderPrice } = params;

  // Zero-area → empty breakdown
  if (dimensions.squareFeet <= 0) {
    return emptyBreakdown();
  }

  // Enforce minimum sqft
  const sqftUsed = Math.max(dimensions.squareFeet, minSqft);

  // Base price (area-based)
  const basePrice = sqftUsed * basePricePerSqft;

  // Calculate multipliers
  const multipliers = calculateShapeMultipliers(config);
  const combinedMultiplier = multipliers.reduce((acc, m) => acc * m.value, 1);
  const priceAfterMultipliers = basePrice * combinedMultiplier;

  // No add-ons for shape signs
  const paintingExtra = 0;
  const racewayPrice = 0;
  const vinylPrice = 0;

  const subtotal = priceAfterMultipliers + paintingExtra + racewayPrice + vinylPrice;
  const total = Math.max(subtotal, minOrderPrice);
  const minOrderApplied = subtotal < minOrderPrice;

  return {
    letterPrice: basePrice,
    multipliers,
    priceAfterMultipliers: round(priceAfterMultipliers),
    paintingExtra,
    racewayPrice,
    vinylPrice,
    subtotal: round(subtotal),
    total: round(total),
    minOrderApplied,
  };
}

/**
 * Calculate all applicable multipliers for a lit shape configuration.
 */
function calculateShapeMultipliers(
  config: LitShapeConfiguration
): MultiplierDetail[] {
  const multipliers: MultiplierDetail[] = [];

  // RGB LED premium
  if (config.led === "RGB") {
    multipliers.push({
      name: "RGB LED",
      value: 1.1,
      reason: "Color-changing RGB LED modules",
    });
  }

  // Painting premium
  if (
    config.painting === "Painted" ||
    config.painting === "Painted Multicolor"
  ) {
    multipliers.push({
      name: "Painted",
      value: 1.2,
      reason: "Custom paint finish",
    });
  }

  // Standoff mount premium
  if (config.mounting === "standoff") {
    multipliers.push({
      name: "Standoff Mount",
      value: 1.05,
      reason: "Standoff mounting hardware",
    });
  }

  return multipliers;
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
