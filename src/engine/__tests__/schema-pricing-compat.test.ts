import { evaluateFormulaDefinition } from "../schema-pricing";
import { getPresetFormula, PRESET_IDS } from "../formula-presets";

/**
 * Default pricing params matching the Front-Lit with Trim Cap product definition
 * (basePricePerInch: 16, largeSizePricePerInch: 18, largeSizeThreshold: 36,
 *  minHeightForPrice: 12, minOrderPrice: 1360)
 */
const DEFAULT_PARAMS = {
  basePricePerInch: 16,
  largeSizePricePerInch: 18,
  largeSizeThreshold: 36,
  minHeightForPrice: 12,
  minOrderPrice: 1360,
};

function letterCount(text: string): number {
  return text.replace(/\s+/g, "").length;
}

describe("schema-pricing backward-compatibility with hardcoded engine", () => {
  const preset = getPresetFormula(PRESET_IDS.PER_INCH_LETTER);

  test('"HELLO" at 12in → base price $960 (5 * 12 * $16)', () => {
    const vars = {
      ...DEFAULT_PARAMS,
      letterCount: letterCount("HELLO"),
      height: 12,
    };
    const result = evaluateFormulaDefinition(preset, vars);
    expect(result.basePrice).toBe(960);
  });

  test('"HELLO" at 48in → base price $4320 (above threshold: 5 * 48 * $18)', () => {
    const vars = {
      ...DEFAULT_PARAMS,
      letterCount: letterCount("HELLO"),
      height: 48,
    };
    const result = evaluateFormulaDefinition(preset, vars);
    expect(result.basePrice).toBe(4320);
  });

  test('"HELLO" at 8in → base price $960 (below min: uses minHeightForPrice 12)', () => {
    const vars = {
      ...DEFAULT_PARAMS,
      letterCount: letterCount("HELLO"),
      height: 8,
    };
    const result = evaluateFormulaDefinition(preset, vars);
    // max(8, 12) = 12 → 5 * 12 * 16 = 960
    expect(result.basePrice).toBe(960);
  });

  test('"A" at 24in → base price $384 (1 * 24 * $16)', () => {
    const vars = {
      ...DEFAULT_PARAMS,
      letterCount: letterCount("A"),
      height: 24,
    };
    const result = evaluateFormulaDefinition(preset, vars);
    expect(result.basePrice).toBe(384);
  });

  test('"ABCDEFGHIJ" at 12in → base price $1920 (10 * 12 * $16)', () => {
    const vars = {
      ...DEFAULT_PARAMS,
      letterCount: letterCount("ABCDEFGHIJ"),
      height: 12,
    };
    const result = evaluateFormulaDefinition(preset, vars);
    expect(result.basePrice).toBe(1920);
  });

  test('min order enforcement: "HELLO" at 12in → $960 < $1360 minimum → total $1360', () => {
    const vars = {
      ...DEFAULT_PARAMS,
      letterCount: letterCount("HELLO"),
      height: 12,
    };
    const result = evaluateFormulaDefinition(preset, vars);
    expect(result.basePrice).toBe(960);
    expect(result.subtotal).toBe(960);
    expect(result.minOrderApplied).toBe(true);
    expect(result.total).toBe(1360);
  });
});
