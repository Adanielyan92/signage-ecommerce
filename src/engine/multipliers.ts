import type { SignConfiguration, MultiplierDetail } from "@/types/configurator";
import { CURVED_FONTS } from "@/engine/font-map";

/**
 * Calculate all applicable multipliers for a channel letter configuration.
 * Returns an array of multiplier details for transparency in price breakdown.
 */
export function calculateMultipliers(
  config: SignConfiguration
): MultiplierDetail[] {
  const multipliers: MultiplierDetail[] = [];

  // Non-Lit discount
  if (config.lit === "Non-Lit") {
    multipliers.push({
      name: "Non-Lit",
      value: 0.75,
      reason: "No LED illumination",
    });
  }

  // RGB LED premium
  if (config.lit === "Lit" && config.led === "RGB") {
    multipliers.push({
      name: "RGB LED",
      value: 1.1,
      reason: "Color-changing RGB LED modules",
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

  // 5" depth premium
  if (config.sideDepth === '5"') {
    multipliers.push({
      name: '5" Depth',
      value: 1.05,
      reason: "Deeper letter returns",
    });
  }

  // Duo Lit premium
  if (config.lit === "Lit" && config.litSides === "Duo Lit") {
    multipliers.push({
      name: "Duo Lit",
      value: 1.2,
      reason: "Front and side illumination",
    });
  }

  // Background premium
  if (config.background === "Background") {
    multipliers.push({
      name: "Background",
      value: 1.1,
      reason: "Background panel included",
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

/**
 * Combine all multiplier values into a single factor.
 */
export function getCombinedMultiplier(multipliers: MultiplierDetail[]): number {
  return multipliers.reduce((acc, m) => acc * m.value, 1);
}
