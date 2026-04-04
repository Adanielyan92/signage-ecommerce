import type { BannerPricingParams } from "@/types/product";
import type {
  VinylBannerConfiguration,
  Dimensions,
  PriceBreakdown,
  MultiplierDetail,
} from "@/types/configurator";

/**
 * Calculate the full price breakdown for a vinyl banner configuration.
 *
 * Pricing formula:
 *   1. Find tier: iterate tiers, use first where sqft <= maxSqft
 *   2. basePrice = sqft * tieredRate
 *   3. Apply multipliers: 15oz (1.15x), mesh (1.2x), doubleSided (1.8x)
 *   4. total = max(result, minOrderPrice)
 */
export function calculateBannerPrice(
  config: VinylBannerConfiguration,
  dimensions: Dimensions,
  params: BannerPricingParams
): PriceBreakdown {
  const { tiers, minOrderPrice } = params;

  if (dimensions.squareFeet <= 0) {
    return emptyBreakdown();
  }

  const sqft = dimensions.squareFeet;

  // Find the applicable tier
  const tier = tiers.find((t) => sqft <= t.maxSqft);
  const tieredRate = tier ? tier.pricePerSqft : tiers[tiers.length - 1].pricePerSqft;

  const basePrice = sqft * tieredRate;

  const multipliers = calculateBannerMultipliers(config);
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

function calculateBannerMultipliers(
  config: VinylBannerConfiguration
): MultiplierDetail[] {
  const multipliers: MultiplierDetail[] = [];

  if (config.material === "15oz") {
    multipliers.push({
      name: "15oz Heavy Duty",
      value: 1.15,
      reason: "Heavy duty 15oz vinyl material",
    });
  } else if (config.material === "mesh") {
    multipliers.push({
      name: "Mesh Material",
      value: 1.2,
      reason: "Mesh banner material",
    });
  }

  if (config.doubleSided) {
    multipliers.push({
      name: "Double Sided",
      value: 1.8,
      reason: "Double-sided banner printing",
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
