import type { PricingParams } from "@/types/product";
import type {
  DimensionalLetterConfiguration,
  Dimensions,
  PriceBreakdown,
  MultiplierDetail,
} from "@/types/configurator";
import { CURVED_FONTS } from "@/engine/font-map";

/**
 * Calculate the full price breakdown for a dimensional letter configuration.
 *
 * Similar to channel letters but simpler — no LED, vinyl, raceway, or background options.
 *
 * Pricing formula:
 *   1. Per-letter price = heightUsedForPrice * pricePerInch
 *   2. Total letter price = letterCount * perLetterPrice
 *   3. Apply multipliers (thickness, curved font, painting)
 *   4. Add multicolor painting surcharge: letterCount * 300 * (colorCount - 1)
 *   5. Enforce minimum order price
 */
export function calculateDimensionalPrice(
  config: DimensionalLetterConfiguration,
  dimensions: Dimensions,
  params: PricingParams
): PriceBreakdown {
  const {
    basePricePerInch,
    largeSizeThreshold,
    largeSizePricePerInch,
    minHeightForPrice,
    minOrderPrice,
  } = params;

  // Count letters (no spaces)
  const text = config.text.replace(/\s+/g, "");
  const letterCount = text.length;

  if (letterCount === 0) {
    return emptyBreakdown();
  }

  // Price per inch based on height threshold
  const pricePerInch =
    config.height > largeSizeThreshold
      ? largeSizePricePerInch
      : basePricePerInch;

  // Use minimum height for pricing if actual height is smaller
  const heightUsedForPrice = Math.max(config.height, minHeightForPrice);

  // Base letter price
  const perLetterPrice = heightUsedForPrice * pricePerInch;
  const letterPrice = letterCount * perLetterPrice;

  // Multipliers
  const multipliers = calculateDimensionalMultipliers(config);
  const combinedMultiplier = multipliers.reduce((acc, m) => acc * m.value, 1);
  const priceAfterMultipliers = letterPrice * combinedMultiplier;

  // Multicolor painting surcharge
  let paintingExtra = 0;
  if (
    config.painting === "Painted Multicolor" &&
    config.paintingColors > 1
  ) {
    paintingExtra = letterCount * 300 * (config.paintingColors - 1);
  }

  // No raceway or vinyl for dimensional letters
  const racewayPrice = 0;
  const vinylPrice = 0;

  const subtotal = priceAfterMultipliers + paintingExtra;
  const total = Math.max(subtotal, minOrderPrice);
  const minOrderApplied = subtotal < minOrderPrice;

  return {
    letterPrice,
    multipliers,
    priceAfterMultipliers,
    paintingExtra,
    racewayPrice,
    vinylPrice,
    subtotal: round(subtotal),
    total: round(total),
    minOrderApplied,
  };
}

/**
 * Calculate multipliers specific to dimensional letters.
 * Only thickness, curved font, and painting apply (no LED, lit sides, depth, background).
 */
function calculateDimensionalMultipliers(
  config: DimensionalLetterConfiguration
): MultiplierDetail[] {
  const multipliers: MultiplierDetail[] = [];

  // Thickness premium (base price assumes 1/4"; thicker stock costs more)
  if (config.thickness === "0.75") {
    multipliers.push({
      name: 'Thickness 3/4"',
      value: 1.1,
      reason: "Thicker material (3/4 inch)",
    });
  } else if (config.thickness === "1") {
    multipliers.push({
      name: 'Thickness 1"',
      value: 1.2,
      reason: "Thicker material (1 inch)",
    });
  }

  // Curved/decorative font premium
  if (CURVED_FONTS.has(config.font)) {
    multipliers.push({
      name: "Curved Font",
      value: 1.2,
      reason: "Decorative letterforms require more fabrication time",
    });
  }

  // Painting premium
  if (
    config.painting === "Painted" ||
    config.painting === "Painted Multicolor"
  ) {
    multipliers.push({
      name: "Painted",
      value: 1.2,
      reason: "Custom paint finish",
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
