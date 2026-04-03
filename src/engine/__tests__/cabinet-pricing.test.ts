import { calculateCabinetPrice } from "../cabinet-pricing";
import type { SqftPricingParams } from "@/types/product";
import type { CabinetConfiguration, Dimensions } from "@/types/configurator";

// Single-face squared: $75/sqft, min 6 sqft, min order $1500
const singleFaceSquaredParams: SqftPricingParams = {
  basePricePerSqft: 75,
  minSqft: 6,
  minOrderPrice: 1500,
};

// Double-face squared: $120/sqft, min 6 sqft, min order $2000
const doubleFaceSquaredParams: SqftPricingParams = {
  basePricePerSqft: 120,
  minSqft: 6,
  minOrderPrice: 2000,
};

// Single-face shaped: $90/sqft, min 6 sqft, min order $1500
const singleFaceShapedParams: SqftPricingParams = {
  basePricePerSqft: 90,
  minSqft: 6,
  minOrderPrice: 1500,
};

// Double-face shaped: $140/sqft, min 6 sqft, min order $2000
const doubleFaceShapedParams: SqftPricingParams = {
  basePricePerSqft: 140,
  minSqft: 6,
  minOrderPrice: 2000,
};

const defaultDimensions: Dimensions = {
  totalWidthInches: 48,
  heightInches: 36,
  squareFeet: 12, // 48 * 36 / 144 = 12 sqft
  linearFeet: 14, // (48+36)*2/12
  letterWidths: [],
};

function makeConfig(
  overrides: Partial<CabinetConfiguration> = {}
): CabinetConfiguration {
  return {
    productCategory: "CABINET_SIGNS",
    productType: "single-face-squared",
    widthInches: 48,
    heightInches: 36,
    led: "3000K",
    printedFace: false,
    mounting: "wall",
    ...overrides,
  };
}

describe("calculateCabinetPrice", () => {
  it("calculates base price from sqft correctly", () => {
    // 12 sqft * $75/sqft = $900
    // But min sqft is 6 and actual is 12, so no enforcement needed
    const result = calculateCabinetPrice(
      makeConfig(),
      defaultDimensions,
      singleFaceSquaredParams
    );
    expect(result.letterPrice).toBe(900); // letterPrice maps to basePrice
    expect(result.priceAfterMultipliers).toBe(900); // no multipliers
    expect(result.subtotal).toBe(900);
    // Min order is $1500, subtotal is $900, so min order applies
    expect(result.total).toBe(1500);
    expect(result.minOrderApplied).toBe(true);
  });

  it("enforces minimum sqft", () => {
    // Small sign: 24" x 24" = 4 sqft, but min is 6 sqft
    // Should use 6 sqft for pricing: 6 * $75 = $450
    const smallDims: Dimensions = {
      totalWidthInches: 24,
      heightInches: 24,
      squareFeet: 4, // 24*24/144 = 4 sqft
      linearFeet: 8,
      letterWidths: [],
    };
    const result = calculateCabinetPrice(
      makeConfig({ widthInches: 24, heightInches: 24 }),
      smallDims,
      singleFaceSquaredParams
    );
    // Enforced min sqft: 6 * $75 = $450
    expect(result.letterPrice).toBe(450);
  });

  it("enforces minimum order price", () => {
    // 12 sqft * $75/sqft = $900 < $1500 min order
    const result = calculateCabinetPrice(
      makeConfig(),
      defaultDimensions,
      singleFaceSquaredParams
    );
    expect(result.subtotal).toBe(900);
    expect(result.total).toBe(1500);
    expect(result.minOrderApplied).toBe(true);
  });

  it("does not apply minimum order when subtotal exceeds it", () => {
    // 12 sqft * $140/sqft = $1680 + pole mount 1.15x = $1932
    // Double-face shaped min order is $2000, so min applies
    // Let's use a bigger sign to exceed
    const bigDims: Dimensions = {
      totalWidthInches: 96,
      heightInches: 48,
      squareFeet: 32, // 96*48/144 = 32 sqft
      linearFeet: 24,
      letterWidths: [],
    };
    const result = calculateCabinetPrice(
      makeConfig({ productType: "double-face-shaped", widthInches: 96, heightInches: 48 }),
      bigDims,
      doubleFaceShapedParams
    );
    // 32 * $140 = $4480 > $2000
    expect(result.subtotal).toBe(4480);
    expect(result.total).toBe(4480);
    expect(result.minOrderApplied).toBe(false);
  });

  it("applies printed face multiplier (1.1x)", () => {
    // 12 sqft * $75 = $900, * 1.1 = $990
    const result = calculateCabinetPrice(
      makeConfig({ printedFace: true }),
      defaultDimensions,
      singleFaceSquaredParams
    );
    expect(result.priceAfterMultipliers).toBeCloseTo(990);
    expect(result.multipliers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Printed Face", value: 1.1 }),
      ])
    );
  });

  it("applies pole mount multiplier (1.15x)", () => {
    // 12 sqft * $75 = $900, * 1.15 = $1035
    const result = calculateCabinetPrice(
      makeConfig({ mounting: "pole" }),
      defaultDimensions,
      singleFaceSquaredParams
    );
    expect(result.priceAfterMultipliers).toBeCloseTo(1035);
    expect(result.multipliers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Pole Mount", value: 1.15 }),
      ])
    );
  });

  it("applies roof mount multiplier (1.2x)", () => {
    // 12 sqft * $75 = $900, * 1.2 = $1080
    const result = calculateCabinetPrice(
      makeConfig({ mounting: "roof" }),
      defaultDimensions,
      singleFaceSquaredParams
    );
    expect(result.priceAfterMultipliers).toBeCloseTo(1080);
    expect(result.multipliers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Roof Mount", value: 1.2 }),
      ])
    );
  });

  it("does not apply multiplier for wall mount", () => {
    const result = calculateCabinetPrice(
      makeConfig({ mounting: "wall" }),
      defaultDimensions,
      singleFaceSquaredParams
    );
    expect(result.multipliers.find((m) => m.name.includes("Mount"))).toBeUndefined();
    expect(result.priceAfterMultipliers).toBe(900);
  });

  it("stacks multiple multipliers", () => {
    // 12 sqft * $75 = $900, * 1.1 (printed) * 1.15 (pole) = $1138.50
    const result = calculateCabinetPrice(
      makeConfig({ printedFace: true, mounting: "pole" }),
      defaultDimensions,
      singleFaceSquaredParams
    );
    expect(result.priceAfterMultipliers).toBeCloseTo(900 * 1.1 * 1.15);
  });

  it("stacks printed face and roof mount multipliers", () => {
    // 12 sqft * $75 = $900, * 1.1 (printed) * 1.2 (roof) = $1188
    const result = calculateCabinetPrice(
      makeConfig({ printedFace: true, mounting: "roof" }),
      defaultDimensions,
      singleFaceSquaredParams
    );
    expect(result.priceAfterMultipliers).toBeCloseTo(900 * 1.1 * 1.2);
  });

  it("returns empty breakdown for zero-area input", () => {
    const zeroDims: Dimensions = {
      totalWidthInches: 0,
      heightInches: 0,
      squareFeet: 0,
      linearFeet: 0,
      letterWidths: [],
    };
    const result = calculateCabinetPrice(
      makeConfig({ widthInches: 0, heightInches: 0 }),
      zeroDims,
      singleFaceSquaredParams
    );
    expect(result.total).toBe(0);
    expect(result.letterPrice).toBe(0);
    expect(result.multipliers).toEqual([]);
    expect(result.minOrderApplied).toBe(false);
  });

  it("works with double-face squared params", () => {
    // 12 sqft * $120/sqft = $1440
    const result = calculateCabinetPrice(
      makeConfig({ productType: "double-face-squared" }),
      defaultDimensions,
      doubleFaceSquaredParams
    );
    expect(result.letterPrice).toBe(1440);
    // $1440 < $2000 min order
    expect(result.total).toBe(2000);
    expect(result.minOrderApplied).toBe(true);
  });

  it("works with single-face shaped params", () => {
    // 12 sqft * $90/sqft = $1080
    const result = calculateCabinetPrice(
      makeConfig({ productType: "single-face-shaped" }),
      defaultDimensions,
      singleFaceShapedParams
    );
    expect(result.letterPrice).toBe(1080);
    // $1080 < $1500 min order
    expect(result.total).toBe(1500);
    expect(result.minOrderApplied).toBe(true);
  });

  it("works with double-face shaped params", () => {
    // 12 sqft * $140/sqft = $1680
    const result = calculateCabinetPrice(
      makeConfig({ productType: "double-face-shaped" }),
      defaultDimensions,
      doubleFaceShapedParams
    );
    expect(result.letterPrice).toBe(1680);
    // $1680 < $2000 min order
    expect(result.total).toBe(2000);
    expect(result.minOrderApplied).toBe(true);
  });

  it("sets unused add-on fields to zero", () => {
    const result = calculateCabinetPrice(
      makeConfig(),
      defaultDimensions,
      singleFaceSquaredParams
    );
    expect(result.paintingExtra).toBe(0);
    expect(result.racewayPrice).toBe(0);
    expect(result.vinylPrice).toBe(0);
  });
});
