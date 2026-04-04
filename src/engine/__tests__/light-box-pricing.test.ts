import { calculateLightBoxPrice } from "../light-box-pricing";
import type { SqftPricingParams } from "@/types/product";
import type { LightBoxConfiguration, Dimensions } from "@/types/configurator";

const singleFaceParams: SqftPricingParams = {
  basePricePerSqft: 85,
  minSqft: 4,
  minOrderPrice: 1200,
};

const defaultDimensions: Dimensions = {
  totalWidthInches: 48,
  heightInches: 36,
  squareFeet: 12, // 48 * 36 / 144
  linearFeet: 14,
  letterWidths: [],
};

function makeConfig(
  overrides: Partial<LightBoxConfiguration> = {}
): LightBoxConfiguration {
  return {
    productCategory: "LIGHT_BOX_SIGNS",
    productType: "light-box-single",
    widthInches: 48,
    heightInches: 36,
    depth: "4",
    led: "3000K",
    faceType: "translucent",
    shape: "rectangular",
    mounting: "wall",
    ...overrides,
  };
}

describe("calculateLightBoxPrice", () => {
  it("calculates base price from sqft correctly", () => {
    // 12 sqft * $85/sqft = $1020
    const result = calculateLightBoxPrice(
      makeConfig(),
      defaultDimensions,
      singleFaceParams
    );
    expect(result.letterPrice).toBe(1020);
    expect(result.priceAfterMultipliers).toBe(1020);
    expect(result.subtotal).toBe(1020);
    // $1020 < $1200 min order
    expect(result.total).toBe(1200);
    expect(result.minOrderApplied).toBe(true);
  });

  it("enforces minimum sqft", () => {
    // Small sign: 2 sqft, but min is 4 sqft
    // Should use 4 sqft: 4 * $85 = $340
    const smallDims: Dimensions = {
      totalWidthInches: 18,
      heightInches: 16,
      squareFeet: 2,
      linearFeet: 5.67,
      letterWidths: [],
    };
    const result = calculateLightBoxPrice(
      makeConfig({ widthInches: 18, heightInches: 16 }),
      smallDims,
      singleFaceParams
    );
    expect(result.letterPrice).toBe(340); // 4 * 85
  });

  it("enforces minimum order price", () => {
    // 12 sqft * $85 = $1020 < $1200
    const result = calculateLightBoxPrice(
      makeConfig(),
      defaultDimensions,
      singleFaceParams
    );
    expect(result.subtotal).toBe(1020);
    expect(result.total).toBe(1200);
    expect(result.minOrderApplied).toBe(true);
  });

  it("applies push-through face multiplier (1.4x)", () => {
    // 12 sqft * $85 = $1020, * 1.4 = $1428
    const result = calculateLightBoxPrice(
      makeConfig({ faceType: "push-through" }),
      defaultDimensions,
      singleFaceParams
    );
    expect(result.priceAfterMultipliers).toBeCloseTo(1428);
    expect(result.multipliers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Push-Through Face", value: 1.4 }),
      ])
    );
    expect(result.total).toBe(1428);
    expect(result.minOrderApplied).toBe(false);
  });

  it("applies hanging mount multiplier (1.1x)", () => {
    // 12 sqft * $85 = $1020, * 1.1 = $1122
    const result = calculateLightBoxPrice(
      makeConfig({ mounting: "hanging" }),
      defaultDimensions,
      singleFaceParams
    );
    expect(result.priceAfterMultipliers).toBeCloseTo(1122);
    expect(result.multipliers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Hanging Mount", value: 1.1 }),
      ])
    );
  });

  it("returns empty breakdown for zero-area input", () => {
    const zeroDims: Dimensions = {
      totalWidthInches: 0,
      heightInches: 0,
      squareFeet: 0,
      linearFeet: 0,
      letterWidths: [],
    };
    const result = calculateLightBoxPrice(
      makeConfig({ widthInches: 0, heightInches: 0 }),
      zeroDims,
      singleFaceParams
    );
    expect(result.total).toBe(0);
    expect(result.letterPrice).toBe(0);
    expect(result.multipliers).toEqual([]);
    expect(result.minOrderApplied).toBe(false);
  });
});
