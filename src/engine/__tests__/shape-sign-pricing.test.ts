import { calculateShapeSignPrice } from "../shape-sign-pricing";
import type { SqftPricingParams } from "@/types/product";
import type { LitShapeConfiguration, Dimensions } from "@/types/configurator";

const cloudParams: SqftPricingParams = {
  basePricePerSqft: 85,
  minSqft: 4,
  minOrderPrice: 1500,
};

const logoShapeParams: SqftPricingParams = {
  basePricePerSqft: 95,
  minSqft: 4,
  minOrderPrice: 1500,
};

const defaultDimensions: Dimensions = {
  totalWidthInches: 48,
  heightInches: 24,
  squareFeet: 8,
  linearFeet: 12,
  letterWidths: [],
};

function makeConfig(
  overrides: Partial<LitShapeConfiguration> = {}
): LitShapeConfiguration {
  return {
    productCategory: "LIT_SHAPES",
    productType: "cloud-sign",
    widthInches: 48,
    heightInches: 24,
    led: "3000K",
    painting: "-",
    paintingColors: 1,
    mounting: "flush",
    ...overrides,
  };
}

describe("calculateShapeSignPrice", () => {
  it("calculates base price from sqft correctly", () => {
    // 8 sqft * $85/sqft = $680
    const result = calculateShapeSignPrice(
      makeConfig(),
      defaultDimensions,
      cloudParams
    );
    expect(result.letterPrice).toBe(680);
    // No multipliers, subtotal = 680, below min order $1500
    expect(result.subtotal).toBe(680);
  });

  it("enforces minimum sqft", () => {
    // 2 sqft actual, but minSqft is 4 → use 4 sqft
    // 4 * $85 = $340
    const dims: Dimensions = {
      ...defaultDimensions,
      squareFeet: 2,
    };
    const result = calculateShapeSignPrice(makeConfig(), dims, cloudParams);
    expect(result.letterPrice).toBe(340);
  });

  it("enforces minimum order price", () => {
    // 8 sqft * $85 = $680, below min $1500
    const result = calculateShapeSignPrice(
      makeConfig(),
      defaultDimensions,
      cloudParams
    );
    expect(result.subtotal).toBe(680);
    expect(result.total).toBe(1500);
    expect(result.minOrderApplied).toBe(true);
  });

  it("does not apply minimum order when subtotal exceeds it", () => {
    // 20 sqft * $85 = $1700, above min $1500
    const dims: Dimensions = {
      ...defaultDimensions,
      squareFeet: 20,
    };
    const result = calculateShapeSignPrice(makeConfig(), dims, cloudParams);
    expect(result.subtotal).toBe(1700);
    expect(result.total).toBe(1700);
    expect(result.minOrderApplied).toBe(false);
  });

  it("applies RGB LED multiplier (1.1x)", () => {
    // 8 sqft * $85 = $680, * 1.1 = $748
    const result = calculateShapeSignPrice(
      makeConfig({ led: "RGB" }),
      defaultDimensions,
      cloudParams
    );
    expect(result.priceAfterMultipliers).toBeCloseTo(748);
    expect(result.multipliers).toHaveLength(1);
    expect(result.multipliers[0].name).toBe("RGB LED");
    expect(result.multipliers[0].value).toBe(1.1);
  });

  it("applies painted multiplier (1.2x)", () => {
    // 8 sqft * $85 = $680, * 1.2 = $816
    const result = calculateShapeSignPrice(
      makeConfig({ painting: "Painted" }),
      defaultDimensions,
      cloudParams
    );
    expect(result.priceAfterMultipliers).toBeCloseTo(816);
    expect(result.multipliers).toHaveLength(1);
    expect(result.multipliers[0].name).toBe("Painted");
    expect(result.multipliers[0].value).toBe(1.2);
  });

  it("applies Painted Multicolor multiplier (1.2x)", () => {
    // Same multiplier as Painted
    const result = calculateShapeSignPrice(
      makeConfig({ painting: "Painted Multicolor", paintingColors: 2 }),
      defaultDimensions,
      cloudParams
    );
    expect(result.priceAfterMultipliers).toBeCloseTo(816);
    expect(result.multipliers).toHaveLength(1);
    expect(result.multipliers[0].name).toBe("Painted");
  });

  it("applies standoff mount multiplier (1.05x)", () => {
    // 8 sqft * $85 = $680, * 1.05 = $714
    const result = calculateShapeSignPrice(
      makeConfig({ mounting: "standoff" }),
      defaultDimensions,
      cloudParams
    );
    expect(result.priceAfterMultipliers).toBeCloseTo(714);
    expect(result.multipliers).toHaveLength(1);
    expect(result.multipliers[0].name).toBe("Standoff Mount");
    expect(result.multipliers[0].value).toBe(1.05);
  });

  it("stacks multiple multipliers", () => {
    // 8 sqft * $85 = $680
    // * 1.1 (RGB) * 1.2 (Painted) * 1.05 (Standoff) = $680 * 1.386 = $942.48
    const result = calculateShapeSignPrice(
      makeConfig({
        led: "RGB",
        painting: "Painted",
        mounting: "standoff",
      }),
      defaultDimensions,
      cloudParams
    );
    expect(result.priceAfterMultipliers).toBeCloseTo(680 * 1.1 * 1.2 * 1.05);
    expect(result.multipliers).toHaveLength(3);
  });

  it("returns empty breakdown for zero-area input", () => {
    const dims: Dimensions = {
      ...defaultDimensions,
      squareFeet: 0,
    };
    const result = calculateShapeSignPrice(makeConfig(), dims, cloudParams);
    expect(result.total).toBe(0);
    expect(result.letterPrice).toBe(0);
    expect(result.multipliers).toHaveLength(0);
    expect(result.minOrderApplied).toBe(false);
  });

  it("works with logo-shape pricing params", () => {
    // 8 sqft * $95 = $760
    const result = calculateShapeSignPrice(
      makeConfig({ productType: "logo-shape" }),
      defaultDimensions,
      logoShapeParams
    );
    expect(result.letterPrice).toBe(760);
  });

  it("sets paintingExtra, racewayPrice, and vinylPrice to zero", () => {
    const result = calculateShapeSignPrice(
      makeConfig(),
      defaultDimensions,
      cloudParams
    );
    expect(result.paintingExtra).toBe(0);
    expect(result.racewayPrice).toBe(0);
    expect(result.vinylPrice).toBe(0);
  });

  it("does not apply non-LED multipliers when no options selected", () => {
    // Default config: led=3000K, painting="-", mounting="flush"
    // No multipliers should apply
    const result = calculateShapeSignPrice(
      makeConfig(),
      defaultDimensions,
      cloudParams
    );
    expect(result.multipliers).toHaveLength(0);
    expect(result.priceAfterMultipliers).toBe(680);
  });
});
