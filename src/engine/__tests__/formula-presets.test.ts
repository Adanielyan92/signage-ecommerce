import { getPresetFormula, getAllPresetFormulas, PRESET_IDS } from "../formula-presets";
import { evaluateFormulaDefinition } from "../schema-pricing";

describe("PRESET_IDS", () => {
  it("exports 12 preset ID constants", () => {
    const ids = Object.values(PRESET_IDS);
    expect(ids).toHaveLength(12);
  });
});

describe("getAllPresetFormulas", () => {
  it("returns 12 presets", () => {
    expect(getAllPresetFormulas()).toHaveLength(12);
  });

  it("each preset has required fields", () => {
    for (const preset of getAllPresetFormulas()) {
      expect(preset.id).toBeTruthy();
      expect(preset.name).toBeTruthy();
      expect(preset.description).toBeTruthy();
      expect(Array.isArray(preset.variables)).toBe(true);
      expect(Array.isArray(preset.addOns)).toBe(true);
      expect(preset.formula).toBeDefined();
    }
  });
});

describe("getPresetFormula", () => {
  it("returns the correct preset by ID", () => {
    const preset = getPresetFormula(PRESET_IDS.PER_INCH_LETTER);
    expect(preset.id).toBe("preset-per-inch-letter");
  });

  it("throws for unknown ID", () => {
    expect(() => getPresetFormula("unknown-id")).toThrow();
  });
});

describe("preset: per-inch-letter", () => {
  const preset = getPresetFormula(PRESET_IDS.PER_INCH_LETTER);

  it("5 letters * 12in * $16/in = $960 → min order $1360 applied", () => {
    const result = evaluateFormulaDefinition(preset, {
      letterCount: 5,
      height: 12,
      basePricePerInch: 16,
      largeSizePricePerInch: 18,
      largeSizeThreshold: 36,
      minHeightForPrice: 12,
      minOrderPrice: 1360,
    });
    // 5 * max(12,12) * 16 = 960, min order 1360 applied
    expect(result.subtotal).toBe(960);
    expect(result.total).toBe(1360);
    expect(result.minOrderApplied).toBe(true);
  });

  it("3 letters * 48in * $18/in = $2592 (above threshold, above min order)", () => {
    const result = evaluateFormulaDefinition(preset, {
      letterCount: 3,
      height: 48,
      basePricePerInch: 16,
      largeSizePricePerInch: 18,
      largeSizeThreshold: 36,
      minHeightForPrice: 12,
      minOrderPrice: 1360,
    });
    // 3 * max(48,12) * 18 = 2592
    expect(result.subtotal).toBe(2592);
    expect(result.total).toBe(2592);
    expect(result.minOrderApplied).toBe(false);
  });

  it("5 letters * 8in uses minHeightForPrice 12 → $960 → min order applied", () => {
    const result = evaluateFormulaDefinition(preset, {
      letterCount: 5,
      height: 8,
      basePricePerInch: 16,
      largeSizePricePerInch: 18,
      largeSizeThreshold: 36,
      minHeightForPrice: 12,
      minOrderPrice: 1360,
    });
    // height 8 < threshold 36, price per inch = 16
    // 5 * max(8,12) * 16 = 5 * 12 * 16 = 960, min order applied
    expect(result.subtotal).toBe(960);
    expect(result.total).toBe(1360);
    expect(result.minOrderApplied).toBe(true);
  });
});

describe("preset: per-sqft", () => {
  const preset = getPresetFormula(PRESET_IDS.PER_SQFT);

  it("48x36 panel at $75/sqft = $900 → min order $1500 applied", () => {
    const result = evaluateFormulaDefinition(preset, {
      widthInches: 48,
      heightInches: 36,
      basePricePerSqft: 75,
      minSqft: 1,
      minOrderPrice: 1500,
    });
    // max(48*36/144, 1) * 75 = max(12, 1) * 75 = 900
    expect(result.subtotal).toBe(900);
    expect(result.total).toBe(1500);
    expect(result.minOrderApplied).toBe(true);
  });

  it("large panel above min order", () => {
    const result = evaluateFormulaDefinition(preset, {
      widthInches: 96,
      heightInches: 48,
      basePricePerSqft: 75,
      minSqft: 1,
      minOrderPrice: 1500,
    });
    // max(96*48/144, 1) * 75 = 32 * 75 = 2400
    expect(result.subtotal).toBe(2400);
    expect(result.total).toBe(2400);
    expect(result.minOrderApplied).toBe(false);
  });
});

describe("preset: flat-rate", () => {
  const preset = getPresetFormula(PRESET_IDS.FLAT_RATE);

  it("$250 fixed", () => {
    const result = evaluateFormulaDefinition(preset, {
      fixedPrice: 250,
      minOrderPrice: 0,
    });
    expect(result.total).toBe(250);
  });

  it("min order applied when fixed price is below minimum", () => {
    const result = evaluateFormulaDefinition(preset, {
      fixedPrice: 100,
      minOrderPrice: 500,
    });
    expect(result.total).toBe(500);
    expect(result.minOrderApplied).toBe(true);
  });
});

describe("preset: per-character", () => {
  const preset = getPresetFormula(PRESET_IDS.PER_CHARACTER);

  it("8 chars * $50 = $400", () => {
    const result = evaluateFormulaDefinition(preset, {
      charCount: 8,
      pricePerChar: 50,
      minOrderPrice: 0,
    });
    expect(result.total).toBe(400);
  });

  it("min order applied when below minimum", () => {
    const result = evaluateFormulaDefinition(preset, {
      charCount: 2,
      pricePerChar: 50,
      minOrderPrice: 200,
    });
    expect(result.total).toBe(200);
    expect(result.minOrderApplied).toBe(true);
  });
});

describe("preset: base-plus-sqft", () => {
  const preset = getPresetFormula(PRESET_IDS.BASE_PLUS_SQFT);

  it("$1200 base + 20sqft * $30 = $1800", () => {
    const result = evaluateFormulaDefinition(preset, {
      basePrice: 1200,
      sqft: 20,
      pricePerSqft: 30,
      minOrderPrice: 0,
    });
    expect(result.total).toBe(1800);
  });
});

describe("preset: per-sqinch", () => {
  const preset = getPresetFormula(PRESET_IDS.PER_SQINCH);

  it("12x12 at $0.5/sqin = $72", () => {
    const result = evaluateFormulaDefinition(preset, {
      widthInches: 12,
      heightInches: 12,
      basePricePerSqInch: 0.5,
      minDimension: 6,
      minOrderPrice: 0,
    });
    // max(12,6) * max(12,6) * 0.5 = 12 * 12 * 0.5 = 72
    expect(result.total).toBe(72);
  });
});

describe("preset: per-unit-size-tier", () => {
  const preset = getPresetFormula(PRESET_IDS.PER_UNIT_SIZE_TIER);

  it("small units use smallUnitPrice", () => {
    const result = evaluateFormulaDefinition(preset, {
      quantity: 5,
      height: 20,
      sizeThreshold: 36,
      smallUnitPrice: 100,
      largeUnitPrice: 150,
      minOrderPrice: 0,
    });
    // 5 * 100 = 500
    expect(result.total).toBe(500);
  });

  it("large units use largeUnitPrice", () => {
    const result = evaluateFormulaDefinition(preset, {
      quantity: 5,
      height: 48,
      sizeThreshold: 36,
      smallUnitPrice: 100,
      largeUnitPrice: 150,
      minOrderPrice: 0,
    });
    // 5 * 150 = 750
    expect(result.total).toBe(750);
  });
});

describe("preset: base-plus-linear-ft", () => {
  const preset = getPresetFormula(PRESET_IDS.BASE_PLUS_LINEAR_FT);

  it("$500 base + 24in/12 * $100/ft = $700", () => {
    const result = evaluateFormulaDefinition(preset, {
      basePrice: 500,
      widthInches: 24,
      pricePerFt: 100,
      minOrderPrice: 0,
    });
    // 500 + (24/12) * 100 = 500 + 200 = 700
    expect(result.total).toBe(700);
  });
});

describe("preset: tiered-volume", () => {
  const preset = getPresetFormula(PRESET_IDS.TIERED_VOLUME);

  it("qty < 10 uses tier1Price", () => {
    const result = evaluateFormulaDefinition(preset, {
      quantity: 5,
      tier1Price: 20,
      tier2Price: 15,
      tier3Price: 10,
      minOrderPrice: 0,
    });
    expect(result.total).toBe(100);
  });

  it("qty >= 10 uses tier2Price", () => {
    const result = evaluateFormulaDefinition(preset, {
      quantity: 10,
      tier1Price: 20,
      tier2Price: 15,
      tier3Price: 10,
      minOrderPrice: 0,
    });
    expect(result.total).toBe(150);
  });

  it("qty >= 50 uses tier3Price", () => {
    const result = evaluateFormulaDefinition(preset, {
      quantity: 50,
      tier1Price: 20,
      tier2Price: 15,
      tier3Price: 10,
      minOrderPrice: 0,
    });
    expect(result.total).toBe(500);
  });
});

describe("preset: weight-based", () => {
  const preset = getPresetFormula(PRESET_IDS.WEIGHT_BASED);

  it("10 lbs at $5/lb + $50 shipping = $100", () => {
    const result = evaluateFormulaDefinition(preset, {
      weight: 10,
      pricePerLb: 5,
      shippingBase: 50,
      minOrderPrice: 0,
    });
    expect(result.total).toBe(100);
  });
});

describe("preset: rush-surcharge", () => {
  const preset = getPresetFormula(PRESET_IDS.RUSH_SURCHARGE);

  it("$1000 subtotal * 1.25 rush = $1250", () => {
    const result = evaluateFormulaDefinition(preset, {
      subtotal: 1000,
      rushMultiplier: 1.25,
      minOrderPrice: 0,
    });
    expect(result.total).toBe(1250);
  });
});

describe("preset: composite", () => {
  const preset = getPresetFormula(PRESET_IDS.COMPOSITE);

  it("letterPrice + racewayPrice + vinylPrice", () => {
    const result = evaluateFormulaDefinition(preset, {
      letterPrice: 1000,
      racewayPrice: 300,
      vinylPrice: 50,
      minOrderPrice: 0,
    });
    expect(result.total).toBe(1350);
  });
});
