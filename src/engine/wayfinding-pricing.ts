import type { WayfindingPricingParams } from "@/types/product";
import type {
  WayfindingConfiguration,
  Dimensions,
  PriceBreakdown,
  MultiplierDetail,
} from "@/types/configurator";

/**
 * Calculate the full price breakdown for a wayfinding/ADA sign configuration.
 *
 * Pricing formula:
 *   1. basePrice = params.basePrice (per unit)
 *   2. charPrice = charCount * pricePerCharacter
 *   3. Apply multipliers: ADA compliant (1.25x), projecting mount (1.3x),
 *      ceiling hung (1.4x)
 *   4. total = max(result, minOrderPrice)
 */
export function calculateWayfindingPrice(
  config: WayfindingConfiguration,
  dimensions: Dimensions,
  params: WayfindingPricingParams
): PriceBreakdown {
  const { basePrice, pricePerCharacter, minOrderPrice } = params;

  const charCount = config.text.replace(/\s+/g, "").length;
  const charPrice = charCount * pricePerCharacter;
  const letterPrice = basePrice + charPrice;

  const multipliers = calculateWayfindingMultipliers(config);
  const combinedMultiplier = multipliers.reduce((acc, m) => acc * m.value, 1);
  const priceAfterMultipliers = letterPrice * combinedMultiplier;

  const subtotal = priceAfterMultipliers;
  const total = Math.max(subtotal, minOrderPrice);
  const minOrderApplied = subtotal < minOrderPrice;

  return {
    letterPrice: round(letterPrice),
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

function calculateWayfindingMultipliers(
  config: WayfindingConfiguration
): MultiplierDetail[] {
  const multipliers: MultiplierDetail[] = [];

  if (config.adaCompliant) {
    multipliers.push({
      name: "ADA Compliant",
      value: 1.25,
      reason: "Tactile text and Grade 2 Braille",
    });
  }

  if (config.mounting === "projecting") {
    multipliers.push({
      name: "Projecting Mount",
      value: 1.3,
      reason: "Projecting wall mount hardware",
    });
  } else if (config.mounting === "ceiling-hung") {
    multipliers.push({
      name: "Ceiling Hung",
      value: 1.4,
      reason: "Ceiling hung mount hardware",
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
