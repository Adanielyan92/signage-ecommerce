import type { PushThroughPricingParams } from "@/types/product";
import type {
  PushThroughConfiguration,
  Dimensions,
  PriceBreakdown,
  MultiplierDetail,
} from "@/types/configurator";

/**
 * Calculate the full price breakdown for a push-through sign configuration.
 *
 * Pricing formula:
 *   1. cabinetPrice = sqft * cabinetPricePerSqft
 *   2. letterCount = text.replace(/\s+/g, '').length
 *   3. letterPrice = letterCount * letterHeight * letterPricePerInch
 *   4. Apply multipliers: double-sided (1.6x), polycarbonate face (1.15x),
 *      brushed frame (1.1x)
 *   5. total = max(result, minOrderPrice)
 */
export function calculatePushThroughPrice(
  config: PushThroughConfiguration,
  dimensions: Dimensions,
  params: PushThroughPricingParams
): PriceBreakdown {
  const { cabinetPricePerSqft, letterPricePerInch, minOrderPrice } = params;

  if (dimensions.squareFeet <= 0) {
    return emptyBreakdown();
  }

  const cabinetPrice = dimensions.squareFeet * cabinetPricePerSqft;

  const letterCount = config.text.replace(/\s+/g, "").length;
  const letterCost = letterCount * config.letterHeight * letterPricePerInch;

  const basePrice = cabinetPrice + letterCost;

  const multipliers = calculatePushThroughMultipliers(config);
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

function calculatePushThroughMultipliers(
  config: PushThroughConfiguration
): MultiplierDetail[] {
  const multipliers: MultiplierDetail[] = [];

  if (config.productType === "push-through-double") {
    multipliers.push({
      name: "Double Sided",
      value: 1.6,
      reason: "Double-sided push-through construction",
    });
  }

  if (config.faceMaterial === "polycarbonate") {
    multipliers.push({
      name: "Polycarbonate Face",
      value: 1.15,
      reason: "Impact-resistant polycarbonate face",
    });
  }

  if (config.frameFinish === "brushed") {
    multipliers.push({
      name: "Brushed Frame",
      value: 1.1,
      reason: "Brushed aluminum frame finish",
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
