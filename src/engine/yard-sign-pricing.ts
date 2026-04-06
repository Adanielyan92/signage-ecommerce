import type { YardSignPricingParams } from "@/types/product";
import type {
  YardSignConfiguration,
  Dimensions,
  PriceBreakdown,
  MultiplierDetail,
} from "@/types/configurator";

/**
 * Calculate the full price breakdown for a yard sign configuration.
 *
 * Pricing formula:
 *   1. basePrice = sqft * basePricePerSqft
 *   2. Apply multipliers: doubleSided (1.6x)
 *   3. Multiply by quantity
 *   4. Apply quantity discounts: 10+ = 10%, 25+ = 15%, 50+ = 20%, 100+ = 25%
 *   5. total = max(result, minOrderPrice)
 */
export function calculateYardSignPrice(
  config: YardSignConfiguration,
  dimensions: Dimensions,
  params: YardSignPricingParams
): PriceBreakdown {
  const { basePricePerSqft, minOrderPrice } = params;

  if (dimensions.squareFeet <= 0) {
    return emptyBreakdown();
  }

  const basePrice = dimensions.squareFeet * basePricePerSqft;

  const multipliers = calculateYardSignMultipliers(config);
  const combinedMultiplier = multipliers.reduce((acc, m) => acc * m.value, 1);
  const priceAfterMultipliers = basePrice * combinedMultiplier;

  // Stake add-on (mapped to racewayPrice)
  let racewayPrice = 0;
  if (config.stakeType === "h-stake") racewayPrice = 3 * config.quantity;
  else if (config.stakeType === "spider-stake") racewayPrice = 5 * config.quantity;

  const subtotalPerUnit = priceAfterMultipliers;
  const subtotalAll = subtotalPerUnit * config.quantity + racewayPrice;

  // Quantity discount
  let discount = 0;
  if (config.quantity >= 100) discount = 0.25;
  else if (config.quantity >= 50) discount = 0.20;
  else if (config.quantity >= 25) discount = 0.15;
  else if (config.quantity >= 10) discount = 0.10;

  const discountedTotal = subtotalAll * (1 - discount);
  const total = Math.max(discountedTotal, minOrderPrice);
  const minOrderApplied = discountedTotal < minOrderPrice;

  return {
    letterPrice: round(basePrice),
    multipliers,
    priceAfterMultipliers: round(priceAfterMultipliers),
    paintingExtra: 0,
    racewayPrice: round(racewayPrice),
    vinylPrice: 0,
    subtotal: round(subtotalAll),
    total: round(total),
    minOrderApplied,
  };
}

function calculateYardSignMultipliers(
  config: YardSignConfiguration
): MultiplierDetail[] {
  const multipliers: MultiplierDetail[] = [];

  if (config.doubleSided) {
    multipliers.push({
      name: "Double Sided",
      value: 1.6,
      reason: "Double-sided yard sign printing",
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
