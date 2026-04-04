import type { SqftPricingParams } from "@/types/product";
import type {
  LightBoxConfiguration,
  Dimensions,
  PriceBreakdown,
  MultiplierDetail,
} from "@/types/configurator";

/**
 * Calculate the full price breakdown for a light box sign configuration.
 *
 * Pricing formula:
 *   1. basePrice = max(sqft, minSqft) * basePricePerSqft
 *   2. Apply multipliers: push-through face (1.4x), hanging mount (1.1x)
 *   3. Enforce minimum order price
 */
export function calculateLightBoxPrice(
  config: LightBoxConfiguration,
  dimensions: Dimensions,
  params: SqftPricingParams
): PriceBreakdown {
  const { basePricePerSqft, minSqft, minOrderPrice } = params;

  if (dimensions.squareFeet <= 0) {
    return emptyBreakdown();
  }

  const sqftUsedForPrice = Math.max(dimensions.squareFeet, minSqft);
  const basePrice = sqftUsedForPrice * basePricePerSqft;

  const multipliers = calculateLightBoxMultipliers(config);
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

function calculateLightBoxMultipliers(
  config: LightBoxConfiguration
): MultiplierDetail[] {
  const multipliers: MultiplierDetail[] = [];

  if (config.faceType === "push-through") {
    multipliers.push({
      name: "Push-Through Face",
      value: 1.4,
      reason: "Push-through letter face construction",
    });
  }

  if (config.mounting === "hanging") {
    multipliers.push({
      name: "Hanging Mount",
      value: 1.1,
      reason: "Hanging mount hardware and installation",
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
