import { calculateBladePrice } from "../blade-pricing";
import type { BladePricingParams } from "@/types/product";
import type { BladeSignConfiguration, Dimensions } from "@/types/configurator";

const bladeParams: BladePricingParams = {
  basePricePerSqft: 60,
  litPricePerSqft: 90,
  minSqft: 2,
  minOrderPrice: 800,
};

const defaultDimensions: Dimensions = {
  totalWidthInches: 36,
  heightInches: 24,
  squareFeet: 6, // 36 * 24 / 144
  linearFeet: 10,
  letterWidths: [],
};

function makeConfig(
  overrides: Partial<BladeSignConfiguration> = {}
): BladeSignConfiguration {
  return {
    productCategory: "BLADE_SIGNS",
    productType: "blade-rectangular",
    widthInches: 36,
    heightInches: 24,
    depth: "3",
    illuminated: false,
    led: "3000K",
    doubleSided: false,
    shape: "rectangular",
    ...overrides,
  };
}

describe("calculateBladePrice", () => {
  it("calculates base price using non-lit rate correctly", () => {
    // 6 sqft * $60/sqft = $360
    const result = calculateBladePrice(
      makeConfig(),
      defaultDimensions,
      bladeParams
    );
    expect(result.letterPrice).toBe(360);
    expect(result.priceAfterMultipliers).toBe(360);
    expect(result.subtotal).toBe(360);
    // $360 < $800 min order
    expect(result.total).toBe(800);
    expect(result.minOrderApplied).toBe(true);
  });

  it("enforces minimum sqft", () => {
    // Small sign: 1 sqft, but min is 2 sqft
    // Should use 2 sqft: 2 * $60 = $120
    const smallDims: Dimensions = {
      totalWidthInches: 12,
      heightInches: 12,
      squareFeet: 1,
      linearFeet: 4,
      letterWidths: [],
    };
    const result = calculateBladePrice(
      makeConfig({ widthInches: 12, heightInches: 12 }),
      smallDims,
      bladeParams
    );
    expect(result.letterPrice).toBe(120); // 2 * 60
  });

  it("enforces minimum order price", () => {
    // 6 sqft * $60 = $360 < $800
    const result = calculateBladePrice(
      makeConfig(),
      defaultDimensions,
      bladeParams
    );
    expect(result.subtotal).toBe(360);
    expect(result.total).toBe(800);
    expect(result.minOrderApplied).toBe(true);
  });

  it("uses lit price when illuminated and applies doubleSided multiplier", () => {
    // 6 sqft * $90/sqft (lit) = $540, * 1.6 (double) = $864
    const result = calculateBladePrice(
      makeConfig({ illuminated: true, doubleSided: true }),
      defaultDimensions,
      bladeParams
    );
    expect(result.letterPrice).toBe(540);
    expect(result.priceAfterMultipliers).toBeCloseTo(864);
    expect(result.multipliers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Double Sided", value: 1.6 }),
      ])
    );
    expect(result.total).toBe(864);
    expect(result.minOrderApplied).toBe(false);
  });

  it("returns empty breakdown for zero-area input", () => {
    const zeroDims: Dimensions = {
      totalWidthInches: 0,
      heightInches: 0,
      squareFeet: 0,
      linearFeet: 0,
      letterWidths: [],
    };
    const result = calculateBladePrice(
      makeConfig({ widthInches: 0, heightInches: 0 }),
      zeroDims,
      bladeParams
    );
    expect(result.total).toBe(0);
    expect(result.letterPrice).toBe(0);
    expect(result.multipliers).toEqual([]);
    expect(result.minOrderApplied).toBe(false);
  });
});
