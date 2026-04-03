import type { PrintPricingParams } from "@/types/product";
import type {
  PrintConfiguration,
  Dimensions,
  PriceBreakdown,
} from "@/types/configurator";

/**
 * Calculate the full price breakdown for a print sign configuration.
 *
 * Pricing formula:
 *   1. Effective sqft = max(sqft, minSqft)
 *   2. Base price = effectiveSqft * basePricePerSqft
 *   3. Add grommets: "4 Corners" → 4 * $2 = $8, "Each ft" → perimeter_ft * $2
 *   4. Add lamination: sqft * $5
 *   5. Enforce minimum order price
 *
 * PriceBreakdown field mapping:
 *   letterPrice → basePrice
 *   paintingExtra → grommetsPrice
 *   racewayPrice → laminationPrice
 *   vinylPrice → 0
 */
export function calculatePrintPrice(
  config: PrintConfiguration,
  dimensions: Dimensions,
  params: PrintPricingParams
): PriceBreakdown {
  const { basePricePerSqft, minSqft, minOrderPrice } = params;

  // Zero-area guard
  if (dimensions.squareFeet === 0) {
    return emptyBreakdown();
  }

  // Enforce minimum sqft
  const effectiveSqft = Math.max(dimensions.squareFeet, minSqft);

  // Base price
  const letterPrice = effectiveSqft * basePricePerSqft;

  // Grommets add-on (mapped to paintingExtra)
  let paintingExtra = 0;
  if (config.grommets === "4 Corners") {
    paintingExtra = 4 * 2; // 4 grommets at $2 each
  } else if (config.grommets === "Each ft") {
    // Perimeter in feet
    const perimeterInches = 2 * (config.widthInches + config.heightInches);
    const perimeterFeet = perimeterInches / 12;
    paintingExtra = perimeterFeet * 2;
  }

  // Lamination add-on (mapped to racewayPrice)
  let racewayPrice = 0;
  if (config.laminated) {
    racewayPrice = effectiveSqft * 5;
  }

  const subtotal = letterPrice + paintingExtra + racewayPrice;
  const total = Math.max(subtotal, minOrderPrice);
  const minOrderApplied = subtotal < minOrderPrice;

  return {
    letterPrice,
    multipliers: [],
    priceAfterMultipliers: letterPrice,
    paintingExtra,
    racewayPrice,
    vinylPrice: 0,
    subtotal: round(subtotal),
    total: round(total),
    minOrderApplied,
  };
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
