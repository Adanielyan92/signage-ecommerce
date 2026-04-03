import type { SignPostPricingParams } from "@/types/product";
import type {
  SignPostConfiguration,
  Dimensions,
  PriceBreakdown,
} from "@/types/configurator";

/**
 * Calculate the full price breakdown for a sign post configuration.
 *
 * Pricing formula:
 *   1. Base price for the post type (fixed)
 *   2. Sign panel price = signArea(sqft) * pricePerSqftSign
 *   3. If double-sided: sign panel price *= 1.6
 *   4. Total = base + sign panel price
 *   5. Enforce minimum order price
 *
 * PriceBreakdown field mapping:
 *   letterPrice → basePostPrice
 *   priceAfterMultipliers → basePostPrice + signPanelPrice (with double-sided)
 *   paintingExtra / racewayPrice / vinylPrice → 0
 */
export function calculateSignPostPrice(
  config: SignPostConfiguration,
  dimensions: Dimensions,
  params: SignPostPricingParams
): PriceBreakdown {
  const { basePrice, pricePerSqftSign, minOrderPrice } = params;

  // Zero-area guard
  if (dimensions.squareFeet === 0) {
    return emptyBreakdown();
  }

  // Base post price
  const letterPrice = basePrice;

  // Sign panel price
  let signPanelPrice = dimensions.squareFeet * pricePerSqftSign;

  // Double-sided multiplier applies only to sign panel, not base
  const doubleSidedMultiplier = config.doubleSided ? 1.6 : 1;
  signPanelPrice = signPanelPrice * doubleSidedMultiplier;

  // Combined price
  const priceAfterMultipliers = letterPrice + signPanelPrice;

  // Multipliers array for transparency
  const multipliers = config.doubleSided
    ? [
        {
          name: "Double-Sided",
          value: 1.6,
          reason: "Double-sided sign panel (1.6x on panel price)",
        },
      ]
    : [];

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
