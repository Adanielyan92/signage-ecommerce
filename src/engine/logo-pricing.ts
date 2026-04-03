import type { LogoPricingParams } from "@/types/product";
import type {
  LogoConfiguration,
  Dimensions,
  PriceBreakdown,
  MultiplierDetail,
} from "@/types/configurator";

/**
 * Calculate the full price breakdown for a logo configuration.
 *
 * Pricing formula:
 *   1. Effective dimensions = max(dimension, minDimension) for each side
 *   2. Area = effectiveWidth * effectiveHeight
 *   3. Base price = area * basePricePerSqInch
 *   4. Apply multipliers: RGB LED (1.1x), Painted (1.2x), 5" depth (1.05x)
 *   5. Enforce minimum order price
 */
export function calculateLogoPrice(
  config: LogoConfiguration,
  _dimensions: Dimensions,
  params: LogoPricingParams
): PriceBreakdown {
  const { basePricePerSqInch, minDimension, minOrderPrice } = params;

  // Zero-area guard
  if (config.widthInches === 0 && config.heightInches === 0) {
    return emptyBreakdown();
  }

  // Enforce minimum dimension on each side
  const effectiveWidth = Math.max(config.widthInches, minDimension);
  const effectiveHeight = Math.max(config.heightInches, minDimension);

  // Area-based pricing
  const area = effectiveWidth * effectiveHeight;
  const letterPrice = area * basePricePerSqInch;

  // Multipliers
  const multipliers = calculateLogoMultipliers(config);
  const combinedMultiplier = multipliers.reduce((acc, m) => acc * m.value, 1);
  const priceAfterMultipliers = letterPrice * combinedMultiplier;

  const subtotal = priceAfterMultipliers;
  const total = Math.max(subtotal, minOrderPrice);
  const minOrderApplied = subtotal < minOrderPrice;

  return {
    letterPrice,
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

/**
 * Calculate applicable multipliers for a logo configuration.
 */
function calculateLogoMultipliers(
  config: LogoConfiguration
): MultiplierDetail[] {
  const multipliers: MultiplierDetail[] = [];

  // RGB LED premium
  if (config.led === "RGB") {
    multipliers.push({
      name: "RGB LED",
      value: 1.1,
      reason: "Color-changing RGB LED modules",
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

  // 5" depth premium
  if (config.depth === '5"') {
    multipliers.push({
      name: '5" Depth',
      value: 1.05,
      reason: "Deeper logo returns",
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
