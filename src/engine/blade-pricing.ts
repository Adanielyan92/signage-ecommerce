import type { BladePricingParams } from "@/types/product";
import type {
  BladeSignConfiguration,
  Dimensions,
  PriceBreakdown,
  MultiplierDetail,
} from "@/types/configurator";

/**
 * Calculate the full price breakdown for a blade sign configuration.
 *
 * Pricing formula:
 *   1. Use litPricePerSqft if illuminated, else basePricePerSqft
 *   2. basePrice = max(sqft, minSqft) * pricePerSqft
 *   3. Apply multipliers: doubleSided (1.6x)
 *   4. Enforce minimum order price
 */
export function calculateBladePrice(
  config: BladeSignConfiguration,
  dimensions: Dimensions,
  params: BladePricingParams
): PriceBreakdown {
  const { basePricePerSqft, litPricePerSqft, minSqft, minOrderPrice } = params;

  if (dimensions.squareFeet <= 0) {
    return emptyBreakdown();
  }

  const pricePerSqft = config.illuminated ? litPricePerSqft : basePricePerSqft;
  const sqftUsedForPrice = Math.max(dimensions.squareFeet, minSqft);
  const basePrice = sqftUsedForPrice * pricePerSqft;

  const multipliers = calculateBladeMultipliers(config);
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

function calculateBladeMultipliers(
  config: BladeSignConfiguration
): MultiplierDetail[] {
  const multipliers: MultiplierDetail[] = [];

  if (config.doubleSided) {
    multipliers.push({
      name: "Double Sided",
      value: 1.6,
      reason: "Double-sided blade sign construction",
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
