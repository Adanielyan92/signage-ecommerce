import type { SignConfiguration, MultiplierDetail } from "@/types/configurator";
import type { OptionPricingRule } from "@/types/product";
import { CURVED_FONTS } from "@/engine/font-map";

/**
 * Default pricing rules for channel letter products.
 * These encode the same logic that was previously hardcoded.
 * When a product has no custom rules, we fall back to the hardcoded logic.
 */
export const DEFAULT_CHANNEL_LETTER_RULES: OptionPricingRule[] = [
  { id: "r1", optionId: "lit", optionValue: "Non-Lit", effectType: "multiplier", effectValue: 0.75, label: "Non-Lit Discount" },
  { id: "r2", optionId: "led", optionValue: "RGB", effectType: "multiplier", effectValue: 1.1, label: "RGB LED Premium" },
  { id: "r3", optionId: "font", optionValue: "_curved_", effectType: "multiplier", effectValue: 1.2, label: "Curved Font Premium" },
  { id: "r4", optionId: "side_depth", optionValue: '5"', effectType: "multiplier", effectValue: 1.05, label: '5" Depth Premium' },
  { id: "r5", optionId: "lit_sides", optionValue: "Duo Lit", effectType: "multiplier", effectValue: 1.2, label: "Duo Lit Premium" },
  { id: "r6", optionId: "background", optionValue: "Background", effectType: "multiplier", effectValue: 1.1, label: "Background Panel" },
  { id: "r7", optionId: "painting", optionValue: "Painted", effectType: "multiplier", effectValue: 1.2, label: "Painted Finish" },
  { id: "r8", optionId: "painting", optionValue: "Painted Multicolor", effectType: "multiplier", effectValue: 1.2, label: "Multicolor Paint" },
];

/**
 * Map from optionId in rules to the corresponding SignConfiguration key.
 */
const OPTION_TO_CONFIG_KEY: Record<string, keyof SignConfiguration> = {
  lit: "lit",
  led: "led",
  font: "font",
  side_depth: "sideDepth",
  lit_sides: "litSides",
  background: "background",
  painting: "painting",
  raceway: "raceway",
  vinyl: "vinyl",
};

/**
 * Evaluate custom pricing rules against the current configuration.
 * Only processes "multiplier" effectType rules — additive rules are handled
 * separately in the pricing engine.
 */
export function evaluateCustomRules(
  config: SignConfiguration,
  rules: OptionPricingRule[]
): MultiplierDetail[] {
  const multipliers: MultiplierDetail[] = [];

  for (const rule of rules) {
    if (rule.effectType !== "multiplier") continue;

    const configKey = OPTION_TO_CONFIG_KEY[rule.optionId];
    if (!configKey) continue;

    const configValue = String(config[configKey]);

    // Special handling for font: "_curved_" matches any font in CURVED_FONTS
    if (rule.optionId === "font" && rule.optionValue === "_curved_") {
      if (CURVED_FONTS.has(config.font)) {
        multipliers.push({
          name: rule.label,
          value: rule.effectValue,
          reason: rule.label,
        });
      }
      continue;
    }

    // Special handling for led: only applies when lit === "Lit"
    if (rule.optionId === "led" && config.lit !== "Lit") {
      continue;
    }

    // Special handling for lit_sides: only applies when lit === "Lit"
    if (rule.optionId === "lit_sides" && config.lit !== "Lit") {
      continue;
    }

    if (configValue === rule.optionValue) {
      multipliers.push({
        name: rule.label,
        value: rule.effectValue,
        reason: rule.label,
      });
    }
  }

  return multipliers;
}

/**
 * Evaluate additive rules (fixed_add, per_unit_add, per_sqft_add) from custom rules.
 * Returns the total additive amount.
 */
export function evaluateAdditiveRules(
  config: SignConfiguration,
  rules: OptionPricingRule[],
  letterCount: number,
  squareFeet: number
): number {
  let total = 0;

  for (const rule of rules) {
    if (rule.effectType === "multiplier") continue;

    const configKey = OPTION_TO_CONFIG_KEY[rule.optionId];
    if (!configKey) continue;

    const configValue = String(config[configKey]);

    // Same conditional logic as multiplier rules
    if (rule.optionId === "font" && rule.optionValue === "_curved_") {
      if (!CURVED_FONTS.has(config.font)) continue;
    } else {
      if (rule.optionId === "led" && config.lit !== "Lit") continue;
      if (rule.optionId === "lit_sides" && config.lit !== "Lit") continue;
      if (configValue !== rule.optionValue) continue;
    }

    switch (rule.effectType) {
      case "fixed_add":
        total += rule.effectValue;
        break;
      case "per_unit_add":
        total += rule.effectValue * letterCount;
        break;
      case "per_sqft_add":
        total += rule.effectValue * squareFeet;
        break;
    }
  }

  return total;
}

/**
 * Calculate all applicable multipliers for a channel letter configuration.
 * Returns an array of multiplier details for transparency in price breakdown.
 *
 * If customRules are provided, uses them instead of hardcoded logic.
 */
export function calculateMultipliers(
  config: SignConfiguration,
  customRules?: OptionPricingRule[]
): MultiplierDetail[] {
  // If custom rules provided, use them
  if (customRules && customRules.length > 0) {
    return evaluateCustomRules(config, customRules);
  }

  // Fall back to hardcoded rules for backward compatibility
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
