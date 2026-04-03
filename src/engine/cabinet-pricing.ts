import type { SqftPricingParams } from "@/types/product";
import type {
  CabinetConfiguration,
  Dimensions,
  PriceBreakdown,
  MultiplierDetail,
} from "@/types/configurator";

/**
 * Calculate the full price breakdown for a cabinet sign configuration.
 *
 * Pricing formula:
 *   1. basePrice = sqftUsedForPrice * basePricePerSqft
 *   2. sqftUsedForPrice = max(squareFeet, minSqft)
 *   3. Apply multipliers: printed face (1.1x), pole mount (1.15x), roof mount (1.2x)
 *   4. Enforce minimum order price
 *
 * Cabinet signs have no painting extra, raceway, or vinyl — those fields
 * are set to 0 for PriceBreakdown compatibility.
 */
export function calculateCabinetPrice(
  config: CabinetConfiguration,
  dimensions: Dimensions,
  params: SqftPricingParams
): PriceBreakdown {
  const { basePricePerSqft, minSqft, minOrderPrice } = params;

  // Zero-area sign → empty breakdown
  if (dimensions.squareFeet <= 0) {
    return emptyBreakdown();
  }

  // Enforce minimum sqft
  const sqftUsedForPrice = Math.max(dimensions.squareFeet, minSqft);

  // Base price (mapped to letterPrice field for PriceBreakdown compatibility)
  const basePrice = sqftUsedForPrice * basePricePerSqft;

  // Calculate multipliers
  const multipliers = calculateCabinetMultipliers(config);
  const combinedMultiplier = multipliers.reduce((acc, m) => acc * m.value, 1);
  const priceAfterMultipliers = basePrice * combinedMultiplier;

  // Cabinet signs have no painting extra, raceway, or vinyl add-ons
  const paintingExtra = 0;
  const racewayPrice = 0;
  const vinylPrice = 0;

  const subtotal = priceAfterMultipliers + paintingExtra + racewayPrice + vinylPrice;
  const total = Math.max(subtotal, minOrderPrice);
  const minOrderApplied = subtotal < minOrderPrice;

  return {
    letterPrice: round(basePrice),
    multipliers,
    priceAfterMultipliers: round(priceAfterMultipliers),
    paintingExtra,
    racewayPrice,
    vinylPrice,
    subtotal: round(subtotal),
    total: round(total),
    minOrderApplied,
  };
}

/**
 * Calculate applicable multipliers for a cabinet sign configuration.
 */
function calculateCabinetMultipliers(
  config: CabinetConfiguration
): MultiplierDetail[] {
  const multipliers: MultiplierDetail[] = [];

  // Printed face premium
  if (config.printedFace) {
    multipliers.push({
      name: "Printed Face",
      value: 1.1,
      reason: "Custom printed face panel",
    });
  }

  // Mounting premiums
  if (config.mounting === "pole") {
    multipliers.push({
      name: "Pole Mount",
      value: 1.15,
      reason: "Pole mounting hardware and installation",
    });
  } else if (config.mounting === "roof") {
    multipliers.push({
      name: "Roof Mount",
      value: 1.2,
      reason: "Roof mounting structure and installation",
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
