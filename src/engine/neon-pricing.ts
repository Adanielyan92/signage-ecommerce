import type { NeonPricingParams } from "@/types/product";
import type {
  NeonSignConfiguration,
  Dimensions,
  PriceBreakdown,
  MultiplierDetail,
} from "@/types/configurator";

/**
 * Calculate the full price breakdown for an LED neon sign configuration.
 *
 * Pricing formula:
 *   1. letterCount = text stripped of whitespace length
 *   2. heightUsed = max(height, minHeightForPrice)
 *   3. basePrice = letterCount * heightUsed * pricePerInch
 *   4. backerCost = sqft * rate (clear or black acrylic)
 *   5. Apply multipliers: rgb (1.1x)
 *   6. subtotal = basePrice * multiplier + backerCost
 *   7. total = max(subtotal, minOrderPrice)
 */
export function calculateNeonPrice(
  config: NeonSignConfiguration,
  dimensions: Dimensions,
  params: NeonPricingParams
): PriceBreakdown {
  const { pricePerInch, minHeightForPrice, minOrderPrice, backerClearPerSqft, backerBlackPerSqft } = params;

  const letterCount = config.text.replace(/\s+/g, "").length;
  if (letterCount === 0) {
    return emptyBreakdown();
  }

  const heightUsed = Math.max(config.height, minHeightForPrice);
  const basePrice = letterCount * heightUsed * pricePerInch;

  // Backer cost
  const backerSqft = dimensions.squareFeet;
  let backerCost = 0;
  if (config.backer === "clear-acrylic") {
    backerCost = backerSqft * backerClearPerSqft;
  } else if (config.backer === "black-acrylic") {
    backerCost = backerSqft * backerBlackPerSqft;
  }

  // Multipliers
  const multipliers = calculateNeonMultipliers(config);
  const combinedMultiplier = multipliers.reduce((acc, m) => acc * m.value, 1);
  const priceAfterMultipliers = basePrice * combinedMultiplier;

  const subtotal = priceAfterMultipliers + backerCost;
  const total = Math.max(subtotal, minOrderPrice);
  const minOrderApplied = subtotal < minOrderPrice;

  return {
    letterPrice: round(basePrice),
    multipliers,
    priceAfterMultipliers: round(priceAfterMultipliers),
    paintingExtra: 0,
    racewayPrice: round(backerCost),
    vinylPrice: 0,
    subtotal: round(subtotal),
    total: round(total),
    minOrderApplied,
  };
}

function calculateNeonMultipliers(
  config: NeonSignConfiguration
): MultiplierDetail[] {
  const multipliers: MultiplierDetail[] = [];

  if (config.neonColor === "rgb") {
    multipliers.push({
      name: "RGB LED",
      value: 1.1,
      reason: "RGB color-changing LED neon",
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
