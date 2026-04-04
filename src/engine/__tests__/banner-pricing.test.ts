import { calculateBannerPrice } from "../banner-pricing";
import type { BannerPricingParams } from "@/types/product";
import type { VinylBannerConfiguration, Dimensions } from "@/types/configurator";

const bannerParams: BannerPricingParams = {
  tiers: [
    { maxSqft: 10, pricePerSqft: 8 },
    { maxSqft: 30, pricePerSqft: 5.4 },
    { maxSqft: 50, pricePerSqft: 4.5 },
    { maxSqft: 100, pricePerSqft: 3.5 },
    { maxSqft: Infinity, pricePerSqft: 2.55 },
  ],
  minOrderPrice: 50,
};

const defaultDimensions: Dimensions = {
  totalWidthInches: 72,
  heightInches: 36,
  squareFeet: 18, // 72 * 36 / 144
  linearFeet: 18,
  letterWidths: [],
};

function makeConfig(
  overrides: Partial<VinylBannerConfiguration> = {}
): VinylBannerConfiguration {
  return {
    productCategory: "VINYL_BANNERS",
    productType: "vinyl-banner-13oz",
    widthInches: 72,
    heightInches: 36,
    material: "13oz",
    finishing: "hem-grommets",
    doubleSided: false,
    ...overrides,
  };
}

describe("calculateBannerPrice", () => {
  it("calculates base price using correct tier", () => {
    // 18 sqft falls in tier 2 (maxSqft: 30, $5.4/sqft)
    // 18 * $5.4 = $97.20
    const result = calculateBannerPrice(
      makeConfig(),
      defaultDimensions,
      bannerParams
    );
    expect(result.letterPrice).toBeCloseTo(97.2);
    expect(result.priceAfterMultipliers).toBeCloseTo(97.2);
    expect(result.subtotal).toBeCloseTo(97.2);
    expect(result.total).toBeCloseTo(97.2);
    expect(result.minOrderApplied).toBe(false);
  });

  it("uses first tier for small banners", () => {
    // 5 sqft falls in tier 1 (maxSqft: 10, $8/sqft)
    // 5 * $8 = $40
    const smallDims: Dimensions = {
      totalWidthInches: 30,
      heightInches: 24,
      squareFeet: 5,
      linearFeet: 9,
      letterWidths: [],
    };
    const result = calculateBannerPrice(
      makeConfig({ widthInches: 30, heightInches: 24 }),
      smallDims,
      bannerParams
    );
    expect(result.letterPrice).toBe(40); // 5 * 8
  });

  it("enforces minimum order price", () => {
    // 2 sqft * $8 = $16 < $50
    const tinyDims: Dimensions = {
      totalWidthInches: 18,
      heightInches: 16,
      squareFeet: 2,
      linearFeet: 5.67,
      letterWidths: [],
    };
    const result = calculateBannerPrice(
      makeConfig({ widthInches: 18, heightInches: 16 }),
      tinyDims,
      bannerParams
    );
    expect(result.subtotal).toBe(16);
    expect(result.total).toBe(50);
    expect(result.minOrderApplied).toBe(true);
  });

  it("applies 15oz and doubleSided multipliers", () => {
    // 18 sqft * $5.4 = $97.20
    // * 1.15 (15oz) * 1.8 (double) = $97.20 * 2.07 = $201.204
    const result = calculateBannerPrice(
      makeConfig({ material: "15oz", doubleSided: true }),
      defaultDimensions,
      bannerParams
    );
    expect(result.letterPrice).toBeCloseTo(97.2);
    expect(result.priceAfterMultipliers).toBeCloseTo(97.2 * 1.15 * 1.8);
    expect(result.multipliers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "15oz Heavy Duty", value: 1.15 }),
        expect.objectContaining({ name: "Double Sided", value: 1.8 }),
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
    const result = calculateBannerPrice(
      makeConfig({ widthInches: 0, heightInches: 0 }),
      zeroDims,
      bannerParams
    );
    expect(result.total).toBe(0);
    expect(result.letterPrice).toBe(0);
    expect(result.multipliers).toEqual([]);
    expect(result.minOrderApplied).toBe(false);
  });
});
