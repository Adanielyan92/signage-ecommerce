import type { PlaquePricingParams } from "@/types/product";
import type {
  PlaqueConfiguration,
  Dimensions,
  PriceBreakdown,
  MultiplierDetail,
} from "@/types/configurator";

/**
 * Calculate the full price breakdown for a plaque configuration.
 *
 * Pricing formula:
 *   1. area = width * height (square inches)
 *   2. basePrice = area * basePricePerSqInch
 *   3. Apply multipliers: thickness (1/4" = 1.15x, 3/8" = 1.3x),
 *      standoff mounting (1.2x), polished finish (1.15x), textEngraving (1.1x)
 *   4. total = max(result, minOrderPrice)
 */
export function calculatePlaquePrice(
  config: PlaqueConfiguration,
  dimensions: Dimensions,
  params: PlaquePricingParams
): PriceBreakdown {
  const { basePricePerSqInch, minOrderPrice } = params;

  const area = config.widthInches * config.heightInches;
  if (area <= 0) {
    return emptyBreakdown();
  }

  const basePrice = area * basePricePerSqInch;

  const multipliers = calculatePlaqueMultipliers(config);
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

function calculatePlaqueMultipliers(
  config: PlaqueConfiguration
): MultiplierDetail[] {
  const multipliers: MultiplierDetail[] = [];

  if (config.thickness === "1/4") {
    multipliers.push({
      name: '1/4" Thickness',
      value: 1.15,
      reason: "Thicker 1/4 inch material",
    });
  } else if (config.thickness === "3/8") {
    multipliers.push({
      name: '3/8" Thickness',
      value: 1.3,
      reason: "Thickest 3/8 inch material",
    });
  }

  if (config.mounting === "standoffs") {
    multipliers.push({
      name: "Standoff Mounting",
      value: 1.2,
      reason: "Standoff hardware included",
    });
  }

  if (config.finish === "polished") {
    multipliers.push({
      name: "Polished Finish",
      value: 1.15,
      reason: "Mirror polished finish",
    });
  }

  if (config.textEngraving) {
    multipliers.push({
      name: "Text Engraving",
      value: 1.1,
      reason: "Custom text engraving",
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
