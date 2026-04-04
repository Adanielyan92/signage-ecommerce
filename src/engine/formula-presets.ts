import type { FormulaNode, FormulaDefinition, FormulaVariable } from "./formula-types";

// ---------------------------------------------------------------------------
// AST builder helpers
// ---------------------------------------------------------------------------

const v = (name: string): FormulaNode => ({ type: "variable", name });
const lit = (value: number): FormulaNode => ({ type: "literal", value });
const mul = (left: FormulaNode, right: FormulaNode): FormulaNode => ({ type: "binaryOp", op: "*", left, right });
const add = (left: FormulaNode, right: FormulaNode): FormulaNode => ({ type: "binaryOp", op: "+", left, right });
const div = (left: FormulaNode, right: FormulaNode): FormulaNode => ({ type: "binaryOp", op: "/", left, right });
const max = (left: FormulaNode, right: FormulaNode): FormulaNode => ({ type: "binaryOp", op: "max", left, right });

/** Ternary: if left > right then thenNode else elseNode */
const ifGt = (
  left: FormulaNode,
  right: FormulaNode,
  thenNode: FormulaNode,
  elseNode: FormulaNode,
): FormulaNode => ({
  type: "conditional",
  condition: { type: "compare", left, op: ">", right },
  then: thenNode,
  else: elseNode,
});

/** Ternary: if left >= right then thenNode else elseNode */
const ifGte = (
  left: FormulaNode,
  right: FormulaNode,
  thenNode: FormulaNode,
  elseNode: FormulaNode,
): FormulaNode => ({
  type: "conditional",
  condition: { type: "compare", left, op: ">=", right },
  then: thenNode,
  else: elseNode,
});

function param(name: string, label: string, description: string): FormulaVariable {
  return { name, label, source: "param", description };
}

function dimension(name: string, label: string, description: string): FormulaVariable {
  return { name, label, source: "dimension", description };
}

function computed(name: string, label: string, description: string): FormulaVariable {
  return { name, label, source: "computed", description };
}

// ---------------------------------------------------------------------------
// Preset IDs
// ---------------------------------------------------------------------------

export const PRESET_IDS = {
  PER_INCH_LETTER:      "preset-per-inch-letter",
  PER_SQFT:             "preset-per-sqft",
  PER_SQINCH:           "preset-per-sqinch",
  PER_UNIT_SIZE_TIER:   "preset-per-unit-size-tier",
  BASE_PLUS_LINEAR_FT:  "preset-base-plus-linear-ft",
  BASE_PLUS_SQFT:       "preset-base-plus-sqft",
  FLAT_RATE:            "preset-flat-rate",
  PER_CHARACTER:        "preset-per-character",
  TIERED_VOLUME:        "preset-tiered-volume",
  WEIGHT_BASED:         "preset-weight-based",
  RUSH_SURCHARGE:       "preset-rush-surcharge",
  COMPOSITE:            "preset-composite",
} as const;

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

/**
 * 1. PER_INCH_LETTER
 * letterCount * max(height, minHeightForPrice) * (height > largeSizeThreshold ? largeSizePricePerInch : basePricePerInch)
 */
const PER_INCH_LETTER: FormulaDefinition = {
  id: PRESET_IDS.PER_INCH_LETTER,
  name: "Per-Inch Letter Pricing",
  description:
    "Price per letter based on height in inches. Uses a two-tier rate (base vs large-size) and enforces a minimum effective height.",
  variables: [
    computed("letterCount", "Letter Count", "Number of non-whitespace characters in the sign text"),
    dimension("height", "Height (inches)", "Letter height in inches"),
    param("basePricePerInch", "Base Price / Inch", "Price per inch for letters at or below the large-size threshold"),
    param("largeSizePricePerInch", "Large Price / Inch", "Price per inch for letters above the large-size threshold"),
    param("largeSizeThreshold", "Large Size Threshold (inches)", "Height above which the large-size rate applies"),
    param("minHeightForPrice", "Min Height for Pricing (inches)", "Minimum effective height used when calculating price"),
    param("minOrderPrice", "Minimum Order Price ($)", "Floor price applied to the total"),
  ],
  // letterCount * max(height, minHeightForPrice) * (height > largeSizeThreshold ? largeSizePricePerInch : basePricePerInch)
  formula: mul(
    mul(
      v("letterCount"),
      max(v("height"), v("minHeightForPrice")),
    ),
    ifGt(
      v("height"),
      v("largeSizeThreshold"),
      v("largeSizePricePerInch"),
      v("basePricePerInch"),
    ),
  ),
  addOns: [],
  minOrderPrice: v("minOrderPrice"),
};

/**
 * 2. PER_SQFT
 * max(widthInches * heightInches / 144, minSqft) * basePricePerSqft
 */
const PER_SQFT: FormulaDefinition = {
  id: PRESET_IDS.PER_SQFT,
  name: "Per Square Foot Pricing",
  description:
    "Price based on panel square footage (width × height ÷ 144), with a minimum square-footage floor.",
  variables: [
    dimension("widthInches", "Width (inches)", "Panel width in inches"),
    dimension("heightInches", "Height (inches)", "Panel height in inches"),
    param("basePricePerSqft", "Price / Sq Ft ($)", "Price per square foot"),
    param("minSqft", "Min Square Footage", "Minimum billable square footage"),
    param("minOrderPrice", "Minimum Order Price ($)", "Floor price applied to the total"),
  ],
  formula: mul(
    max(div(mul(v("widthInches"), v("heightInches")), lit(144)), v("minSqft")),
    v("basePricePerSqft"),
  ),
  addOns: [],
  minOrderPrice: v("minOrderPrice"),
};

/**
 * 3. PER_SQINCH
 * max(widthInches, minDimension) * max(heightInches, minDimension) * basePricePerSqInch
 */
const PER_SQINCH: FormulaDefinition = {
  id: PRESET_IDS.PER_SQINCH,
  name: "Per Square Inch Pricing",
  description:
    "Price based on total square inches with a minimum dimension applied to both axes.",
  variables: [
    dimension("widthInches", "Width (inches)", "Width in inches"),
    dimension("heightInches", "Height (inches)", "Height in inches"),
    param("basePricePerSqInch", "Price / Sq Inch ($)", "Price per square inch"),
    param("minDimension", "Min Dimension (inches)", "Minimum effective dimension for each axis"),
    param("minOrderPrice", "Minimum Order Price ($)", "Floor price applied to the total"),
  ],
  formula: mul(
    mul(
      max(v("widthInches"), v("minDimension")),
      max(v("heightInches"), v("minDimension")),
    ),
    v("basePricePerSqInch"),
  ),
  addOns: [],
  minOrderPrice: v("minOrderPrice"),
};

/**
 * 4. PER_UNIT_SIZE_TIER
 * quantity * (height > sizeThreshold ? largeUnitPrice : smallUnitPrice)
 */
const PER_UNIT_SIZE_TIER: FormulaDefinition = {
  id: PRESET_IDS.PER_UNIT_SIZE_TIER,
  name: "Per-Unit Size-Tiered Pricing",
  description:
    "Price per unit with two size tiers: small and large, determined by a height threshold.",
  variables: [
    computed("quantity", "Quantity", "Number of units ordered"),
    dimension("height", "Height (inches)", "Unit height in inches"),
    param("sizeThreshold", "Size Threshold (inches)", "Height above which the large unit price applies"),
    param("smallUnitPrice", "Small Unit Price ($)", "Price per unit when height is at or below the threshold"),
    param("largeUnitPrice", "Large Unit Price ($)", "Price per unit when height exceeds the threshold"),
    param("minOrderPrice", "Minimum Order Price ($)", "Floor price applied to the total"),
  ],
  formula: mul(
    v("quantity"),
    ifGt(v("height"), v("sizeThreshold"), v("largeUnitPrice"), v("smallUnitPrice")),
  ),
  addOns: [],
  minOrderPrice: v("minOrderPrice"),
};

/**
 * 5. BASE_PLUS_LINEAR_FT
 * basePrice + (widthInches / 12) * pricePerFt
 */
const BASE_PLUS_LINEAR_FT: FormulaDefinition = {
  id: PRESET_IDS.BASE_PLUS_LINEAR_FT,
  name: "Base + Linear Foot Pricing",
  description:
    "Fixed base price plus a per-linear-foot charge based on width.",
  variables: [
    param("basePrice", "Base Price ($)", "Fixed base component of the price"),
    dimension("widthInches", "Width (inches)", "Width in inches (converted to feet internally)"),
    param("pricePerFt", "Price / Linear Ft ($)", "Charge per linear foot of width"),
    param("minOrderPrice", "Minimum Order Price ($)", "Floor price applied to the total"),
  ],
  formula: add(
    v("basePrice"),
    mul(div(v("widthInches"), lit(12)), v("pricePerFt")),
  ),
  addOns: [],
  minOrderPrice: v("minOrderPrice"),
};

/**
 * 6. BASE_PLUS_SQFT
 * basePrice + sqft * pricePerSqft
 */
const BASE_PLUS_SQFT: FormulaDefinition = {
  id: PRESET_IDS.BASE_PLUS_SQFT,
  name: "Base + Square Foot Pricing",
  description:
    "Fixed base price plus a per-square-foot material or production charge.",
  variables: [
    param("basePrice", "Base Price ($)", "Fixed base component of the price"),
    computed("sqft", "Square Footage", "Panel area in square feet"),
    param("pricePerSqft", "Price / Sq Ft ($)", "Charge per square foot"),
    param("minOrderPrice", "Minimum Order Price ($)", "Floor price applied to the total"),
  ],
  formula: add(v("basePrice"), mul(v("sqft"), v("pricePerSqft"))),
  addOns: [],
  minOrderPrice: v("minOrderPrice"),
};

/**
 * 7. FLAT_RATE
 * fixedPrice
 */
const FLAT_RATE: FormulaDefinition = {
  id: PRESET_IDS.FLAT_RATE,
  name: "Flat Rate Pricing",
  description: "A single fixed price regardless of dimensions or quantity.",
  variables: [
    param("fixedPrice", "Fixed Price ($)", "The flat price charged for this item"),
    param("minOrderPrice", "Minimum Order Price ($)", "Floor price applied to the total"),
  ],
  formula: v("fixedPrice"),
  addOns: [],
  minOrderPrice: v("minOrderPrice"),
};

/**
 * 8. PER_CHARACTER
 * charCount * pricePerChar
 */
const PER_CHARACTER: FormulaDefinition = {
  id: PRESET_IDS.PER_CHARACTER,
  name: "Per Character Pricing",
  description: "Price based on the total number of characters in the sign text.",
  variables: [
    computed("charCount", "Character Count", "Total number of characters (including spaces)"),
    param("pricePerChar", "Price / Character ($)", "Charge per character"),
    param("minOrderPrice", "Minimum Order Price ($)", "Floor price applied to the total"),
  ],
  formula: mul(v("charCount"), v("pricePerChar")),
  addOns: [],
  minOrderPrice: v("minOrderPrice"),
};

/**
 * 9. TIERED_VOLUME
 * quantity * (quantity >= 50 ? tier3Price : quantity >= 10 ? tier2Price : tier1Price)
 */
const TIERED_VOLUME: FormulaDefinition = {
  id: PRESET_IDS.TIERED_VOLUME,
  name: "Tiered Volume Pricing",
  description:
    "Per-unit price drops at quantity thresholds (10 and 50 units).",
  variables: [
    computed("quantity", "Quantity", "Number of units ordered"),
    param("tier1Price", "Tier 1 Price / Unit ($)", "Price per unit for fewer than 10 units"),
    param("tier2Price", "Tier 2 Price / Unit ($)", "Price per unit for 10–49 units"),
    param("tier3Price", "Tier 3 Price / Unit ($)", "Price per unit for 50 or more units"),
    param("minOrderPrice", "Minimum Order Price ($)", "Floor price applied to the total"),
  ],
  // quantity * (quantity >= 50 ? tier3 : quantity >= 10 ? tier2 : tier1)
  formula: mul(
    v("quantity"),
    ifGte(
      v("quantity"),
      lit(50),
      v("tier3Price"),
      ifGte(v("quantity"), lit(10), v("tier2Price"), v("tier1Price")),
    ),
  ),
  addOns: [],
  minOrderPrice: v("minOrderPrice"),
};

/**
 * 10. WEIGHT_BASED
 * weight * pricePerLb + shippingBase
 */
const WEIGHT_BASED: FormulaDefinition = {
  id: PRESET_IDS.WEIGHT_BASED,
  name: "Weight-Based Pricing",
  description: "Price calculated from item weight plus a flat shipping base charge.",
  variables: [
    computed("weight", "Weight (lbs)", "Item weight in pounds"),
    param("pricePerLb", "Price / Lb ($)", "Charge per pound of weight"),
    param("shippingBase", "Shipping Base ($)", "Flat shipping/handling fee added to the weight charge"),
    param("minOrderPrice", "Minimum Order Price ($)", "Floor price applied to the total"),
  ],
  formula: add(mul(v("weight"), v("pricePerLb")), v("shippingBase")),
  addOns: [],
  minOrderPrice: v("minOrderPrice"),
};

/**
 * 11. RUSH_SURCHARGE
 * subtotal * rushMultiplier
 */
const RUSH_SURCHARGE: FormulaDefinition = {
  id: PRESET_IDS.RUSH_SURCHARGE,
  name: "Rush Surcharge Pricing",
  description:
    "Applies a rush multiplier to an existing subtotal for expedited production orders.",
  variables: [
    computed("subtotal", "Subtotal ($)", "Base price before the rush surcharge is applied"),
    param("rushMultiplier", "Rush Multiplier", "Multiplier applied to the subtotal (e.g. 1.25 = 25% surcharge)"),
    param("minOrderPrice", "Minimum Order Price ($)", "Floor price applied to the total"),
  ],
  formula: mul(v("subtotal"), v("rushMultiplier")),
  addOns: [],
  minOrderPrice: v("minOrderPrice"),
};

/**
 * 12. COMPOSITE
 * letterPrice + racewayPrice + vinylPrice
 */
const COMPOSITE: FormulaDefinition = {
  id: PRESET_IDS.COMPOSITE,
  name: "Composite Channel Letter Pricing",
  description:
    "Combines independently computed letter, raceway, and vinyl wrap prices into a single total.",
  variables: [
    computed("letterPrice", "Letter Price ($)", "Pre-calculated cost for the channel letters"),
    computed("racewayPrice", "Raceway Price ($)", "Pre-calculated cost for the raceway or mounting system"),
    computed("vinylPrice", "Vinyl Price ($)", "Pre-calculated cost for vinyl graphics"),
    param("minOrderPrice", "Minimum Order Price ($)", "Floor price applied to the total"),
  ],
  formula: add(add(v("letterPrice"), v("racewayPrice")), v("vinylPrice")),
  addOns: [],
  minOrderPrice: v("minOrderPrice"),
};

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

const ALL_PRESETS: FormulaDefinition[] = [
  PER_INCH_LETTER,
  PER_SQFT,
  PER_SQINCH,
  PER_UNIT_SIZE_TIER,
  BASE_PLUS_LINEAR_FT,
  BASE_PLUS_SQFT,
  FLAT_RATE,
  PER_CHARACTER,
  TIERED_VOLUME,
  WEIGHT_BASED,
  RUSH_SURCHARGE,
  COMPOSITE,
];

const PRESET_MAP = new Map<string, FormulaDefinition>(
  ALL_PRESETS.map((p) => [p.id, p]),
);

export function getPresetFormula(id: string): FormulaDefinition {
  const preset = PRESET_MAP.get(id);
  if (!preset) {
    throw new Error(`Unknown preset formula ID: "${id}". Valid IDs: ${[...PRESET_MAP.keys()].join(", ")}`);
  }
  return preset;
}

export function getAllPresetFormulas(): FormulaDefinition[] {
  return [...ALL_PRESETS];
}
