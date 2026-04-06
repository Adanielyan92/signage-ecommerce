import type { AFramePricingParams } from "@/types/product";
import type {
  AFrameConfiguration,
  Dimensions,
  PriceBreakdown,
  MultiplierDetail,
} from "@/types/configurator";

/**
 * Calculate the full price breakdown for an A-frame sign configuration.
 *
 * Pricing formula:
 *   1. basePrice = sqft * basePricePerSqft
 *   2. Apply multipliers: doubleSided (1.7x), chalkboard insert (1.15x),
 *      dry-erase insert (1.2x), base weight add-on
 *   3. total = max(result, minOrderPrice)
 */
export function calculateAFramePrice(
  config: AFrameConfiguration,
  dimensions: Dimensions,
  params: AFramePricingParams
): PriceBreakdown {
  const { basePricePerSqft, minOrderPrice } = params;

  if (dimensions.squareFeet <= 0) {
    return emptyBreakdown();
  }

  const basePrice = dimensions.squareFeet * basePricePerSqft;

  const multipliers = calculateAFrameMultipliers(config);
  const combinedMultiplier = multipliers.reduce((acc, m) => acc * m.value, 1);
  const priceAfterMultipliers = basePrice * combinedMultiplier;

  // Base weight add-on (mapped to racewayPrice)
  let racewayPrice = 0;
  if (config.baseWeight === "water-fill") racewayPrice = 25;
  else if (config.baseWeight === "sandbag") racewayPrice = 15;

  const subtotal = priceAfterMultipliers + racewayPrice;
  const total = Math.max(subtotal, minOrderPrice);
  const minOrderApplied = subtotal < minOrderPrice;

  return {
    letterPrice: round(basePrice),
    multipliers,
    priceAfterMultipliers: round(priceAfterMultipliers),
    paintingExtra: 0,
    racewayPrice: round(racewayPrice),
    vinylPrice: 0,
    subtotal: round(subtotal),
    total: round(total),
    minOrderApplied,
  };
}

function calculateAFrameMultipliers(
  config: AFrameConfiguration
): MultiplierDetail[] {
  const multipliers: MultiplierDetail[] = [];

  if (config.doubleSided) {
    multipliers.push({
      name: "Double Sided",
      value: 1.7,
      reason: "Double-sided A-frame panels",
    });
  }

  if (config.insertType === "chalkboard") {
    multipliers.push({
      name: "Chalkboard Insert",
      value: 1.15,
      reason: "Chalkboard surface insert",
    });
  } else if (config.insertType === "dry-erase") {
    multipliers.push({
      name: "Dry-Erase Insert",
      value: 1.2,
      reason: "Dry-erase surface insert",
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
