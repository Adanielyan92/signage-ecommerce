import type { VinylGraphicPricingParams } from "@/types/product";
import type {
  VinylGraphicConfiguration,
  Dimensions,
  PriceBreakdown,
  MultiplierDetail,
} from "@/types/configurator";

/**
 * Calculate the full price breakdown for a vinyl graphic configuration.
 *
 * Pricing formula:
 *   1. basePrice = sqft * basePricePerSqft
 *   2. Apply multipliers: lamination (matte 1.1x, gloss 1.15x),
 *      contour cut (1.2x)
 *   3. total = max(result, minOrderPrice)
 */
export function calculateVinylGraphicPrice(
  config: VinylGraphicConfiguration,
  dimensions: Dimensions,
  params: VinylGraphicPricingParams
): PriceBreakdown {
  const { basePricePerSqft, minOrderPrice } = params;

  if (dimensions.squareFeet <= 0) {
    return emptyBreakdown();
  }

  const basePrice = dimensions.squareFeet * basePricePerSqft;

  const multipliers = calculateVinylGraphicMultipliers(config);
  const combinedMultiplier = multipliers.reduce((acc, m) => acc * m.value, 1);
  const priceAfterMultipliers = basePrice * combinedMultiplier;

  const subtotal = priceAfterMultipliers;
  const total = Math.max(subtotal, minOrderPrice);
  const minOrderApplied = subtotal < minOrderPrice;

  return {
    letterPrice: round(basePrice),
    multipliers,
    priceAfterMultipliers: round(priceAfterMultipliers),
    paintingExtra: 0,
    racewayPrice: 0,
    vinylPrice: 0,
    subtotal: round(subtotal),
    total: round(total),
    minOrderApplied,
  };
}

function calculateVinylGraphicMultipliers(
  config: VinylGraphicConfiguration
): MultiplierDetail[] {
  const multipliers: MultiplierDetail[] = [];

  if (config.lamination === "matte") {
    multipliers.push({
      name: "Matte Lamination",
      value: 1.1,
      reason: "Matte protective lamination",
    });
  } else if (config.lamination === "gloss") {
    multipliers.push({
      name: "Gloss Lamination",
      value: 1.15,
      reason: "Gloss protective lamination",
    });
  }

  if (config.contourCut) {
    multipliers.push({
      name: "Contour Cut",
      value: 1.2,
      reason: "Custom contour cutting",
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
