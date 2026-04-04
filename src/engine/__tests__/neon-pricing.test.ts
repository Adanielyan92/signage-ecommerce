import { calculateNeonPrice } from "../neon-pricing";
import type { NeonPricingParams } from "@/types/product";
import type { NeonSignConfiguration, Dimensions } from "@/types/configurator";

const neonParams: NeonPricingParams = {
  pricePerInch: 12,
  minHeightForPrice: 8,
  minOrderPrice: 500,
  backerClearPerSqft: 15,
  backerBlackPerSqft: 20,
};

const defaultDimensions: Dimensions = {
  totalWidthInches: 36,
  heightInches: 12,
  squareFeet: 3, // 36 * 12 / 144
  linearFeet: 8,
  letterWidths: [],
};

function makeConfig(
  overrides: Partial<NeonSignConfiguration> = {}
): NeonSignConfiguration {
  return {
    productCategory: "NEON_SIGNS",
    productType: "led-neon",
    text: "HELLO",
    height: 12,
    font: "Standard",
    neonColor: "warm-white",
    backer: "none",
    backerShape: "rectangular",
    ...overrides,
  };
}

describe("calculateNeonPrice", () => {
  it("calculates base price correctly", () => {
    // 5 letters * 12" height * $12/inch = $720
    const result = calculateNeonPrice(
      makeConfig(),
      defaultDimensions,
      neonParams
    );
    expect(result.letterPrice).toBe(720);
    expect(result.priceAfterMultipliers).toBe(720);
    expect(result.subtotal).toBe(720);
    expect(result.total).toBe(720);
    expect(result.minOrderApplied).toBe(false);
  });

  it("enforces minimum height for price", () => {
    // 5 letters * 8" (min, since height=5 < 8) * $12 = $480
    const result = calculateNeonPrice(
      makeConfig({ height: 5 }),
      defaultDimensions,
      neonParams
    );
    expect(result.letterPrice).toBe(480);
    // $480 < $500 min order
    expect(result.total).toBe(500);
    expect(result.minOrderApplied).toBe(true);
  });

  it("enforces minimum order price", () => {
    // 2 letters ("HI") * 8" (min) * $12 = $192 < $500
    const result = calculateNeonPrice(
      makeConfig({ text: "HI", height: 5 }),
      defaultDimensions,
      neonParams
    );
    expect(result.subtotal).toBe(192);
    expect(result.total).toBe(500);
    expect(result.minOrderApplied).toBe(true);
  });

  it("applies rgb multiplier and backer cost", () => {
    // 5 letters * 12" * $12 = $720
    // RGB multiplier: $720 * 1.1 = $792
    // Clear backer: 3 sqft * $15 = $45
    // subtotal = $792 + $45 = $837
    const result = calculateNeonPrice(
      makeConfig({ neonColor: "rgb", backer: "clear-acrylic" }),
      defaultDimensions,
      neonParams
    );
    expect(result.letterPrice).toBe(720);
    expect(result.priceAfterMultipliers).toBeCloseTo(792);
    expect(result.racewayPrice).toBe(45); // backer cost stored in racewayPrice
    expect(result.subtotal).toBeCloseTo(837);
    expect(result.multipliers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "RGB LED", value: 1.1 }),
      ])
    );
  });

  it("returns empty breakdown for empty text", () => {
    const result = calculateNeonPrice(
      makeConfig({ text: "" }),
      defaultDimensions,
      neonParams
    );
    expect(result.total).toBe(0);
    expect(result.letterPrice).toBe(0);
    expect(result.multipliers).toEqual([]);
    expect(result.minOrderApplied).toBe(false);
  });
});
