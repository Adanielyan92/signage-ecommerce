import { calculateChannelLetterPrice } from "../channel-letter-pricing";
import type { PricingParams } from "@/types/product";
import type { SignConfiguration, Dimensions } from "@/types/configurator";

const defaultParams: PricingParams = {
  basePricePerInch: 16,
  largeSizeThreshold: 36,
  largeSizePricePerInch: 18,
  minHeightForPrice: 12,
  minOrderPrice: 1360,
};

const defaultDimensions: Dimensions = {
  totalWidthInches: 60,
  heightInches: 12,
  squareFeet: 5,
  linearFeet: 12,
  letterWidths: [7.2, 7.2, 7.2, 7.2, 7.2],
};

function makeConfig(
  overrides: Partial<SignConfiguration> = {}
): SignConfiguration {
  return {
    productType: "front-lit-trim-cap",
    text: "HELLO",
    height: 12,
    font: "Standard",
    lit: "Lit",
    led: "3000K",
    litSides: "Face Lit",
    sideDepth: '4"',
    painting: "-",
    paintingColors: 1,
    raceway: "-",
    racewayColor: "#808080",
    vinyl: "-",
    background: "-",
    ...overrides,
  };
}

describe("calculateChannelLetterPrice", () => {
  it("returns empty breakdown for empty text", () => {
    const result = calculateChannelLetterPrice(
      makeConfig({ text: "" }),
      defaultDimensions,
      defaultParams
    );
    expect(result.total).toBe(0);
    expect(result.letterPrice).toBe(0);
  });

  it("calculates base price correctly for 5-letter word at 12 inches", () => {
    // 5 letters * 12" height * $16/inch = $960
    const result = calculateChannelLetterPrice(
      makeConfig({ text: "HELLO" }),
      defaultDimensions,
      defaultParams
    );
    expect(result.letterPrice).toBe(960);
    // No multipliers applied (all default), so subtotal = 960
    // But minimum order is 1360, so total = 1360
    expect(result.total).toBe(1360);
    expect(result.minOrderApplied).toBe(true);
  });

  it("uses large size pricing above threshold", () => {
    // 5 letters * 40" height * $18/inch = $3600
    const result = calculateChannelLetterPrice(
      makeConfig({ text: "HELLO", height: 40 }),
      defaultDimensions,
      defaultParams
    );
    expect(result.letterPrice).toBe(3600);
    expect(result.total).toBe(3600);
    expect(result.minOrderApplied).toBe(false);
  });

  it("enforces minimum height for price", () => {
    // Even at 8" tall, uses 12" (minHeightForPrice) for pricing
    // 5 letters * 12" * $16/inch = $960
    const result = calculateChannelLetterPrice(
      makeConfig({ text: "HELLO", height: 8 }),
      defaultDimensions,
      defaultParams
    );
    expect(result.letterPrice).toBe(960);
  });

  it("applies Non-Lit multiplier (0.75x)", () => {
    const result = calculateChannelLetterPrice(
      makeConfig({ text: "HELLO", height: 24, lit: "Non-Lit" }),
      defaultDimensions,
      defaultParams
    );
    // 5 * 24 * 16 = 1920, * 0.75 = 1440
    expect(result.priceAfterMultipliers).toBe(1440);
    expect(result.total).toBe(1440);
  });

  it("applies RGB LED multiplier (1.1x)", () => {
    const result = calculateChannelLetterPrice(
      makeConfig({ text: "HELLO", height: 24, led: "RGB" }),
      defaultDimensions,
      defaultParams
    );
    // 5 * 24 * 16 = 1920, * 1.1 = 2112
    expect(result.priceAfterMultipliers).toBeCloseTo(2112);
  });

  it("applies curved font multiplier (1.2x)", () => {
    const result = calculateChannelLetterPrice(
      makeConfig({ text: "HELLO", height: 24, font: "Curved" }),
      defaultDimensions,
      defaultParams
    );
    // 5 * 24 * 16 = 1920, * 1.2 = 2304
    expect(result.priceAfterMultipliers).toBeCloseTo(2304);
  });

  it("applies 5-inch depth multiplier (1.05x)", () => {
    const result = calculateChannelLetterPrice(
      makeConfig({ text: "HELLO", height: 24, sideDepth: '5"' }),
      defaultDimensions,
      defaultParams
    );
    // 5 * 24 * 16 = 1920, * 1.05 = 2016
    expect(result.priceAfterMultipliers).toBeCloseTo(2016);
  });

  it("applies Duo Lit multiplier (1.2x)", () => {
    const result = calculateChannelLetterPrice(
      makeConfig({ text: "HELLO", height: 24, litSides: "Duo Lit" }),
      defaultDimensions,
      defaultParams
    );
    // 5 * 24 * 16 = 1920, * 1.2 = 2304
    expect(result.priceAfterMultipliers).toBeCloseTo(2304);
  });

  it("applies background multiplier (1.1x)", () => {
    const result = calculateChannelLetterPrice(
      makeConfig({ text: "HELLO", height: 24, background: "Background" }),
      defaultDimensions,
      defaultParams
    );
    // 5 * 24 * 16 = 1920, * 1.1 = 2112
    expect(result.priceAfterMultipliers).toBeCloseTo(2112);
  });

  it("applies painted multiplier (1.2x)", () => {
    const result = calculateChannelLetterPrice(
      makeConfig({ text: "HELLO", height: 24, painting: "Painted" }),
      defaultDimensions,
      defaultParams
    );
    // 5 * 24 * 16 = 1920, * 1.2 = 2304
    expect(result.priceAfterMultipliers).toBeCloseTo(2304);
  });

  it("stacks multiple multipliers", () => {
    const result = calculateChannelLetterPrice(
      makeConfig({
        text: "HELLO",
        height: 24,
        led: "RGB",
        font: "Curved",
        sideDepth: '5"',
      }),
      defaultDimensions,
      defaultParams
    );
    // 5 * 24 * 16 = 1920, * 1.1 * 1.2 * 1.05 = 2661.12
    expect(result.priceAfterMultipliers).toBeCloseTo(2661.12);
  });

  it("adds multicolor painting surcharge", () => {
    const result = calculateChannelLetterPrice(
      makeConfig({
        text: "HELLO",
        height: 24,
        painting: "Painted Multicolor",
        paintingColors: 3,
      }),
      defaultDimensions,
      defaultParams
    );
    // Letters: 5 * 24 * 16 = 1920, * 1.2 (painted) = 2304
    // Painting extra: 5 letters * 300 * (3-1) = 3000
    expect(result.paintingExtra).toBe(3000);
    expect(result.total).toBe(2304 + 3000);
  });

  it("adds raceway price (per linear foot)", () => {
    const dims: Dimensions = {
      ...defaultDimensions,
      totalWidthInches: 60,
    };
    const result = calculateChannelLetterPrice(
      makeConfig({ text: "HELLO", height: 24, raceway: "Raceway" }),
      dims,
      defaultParams
    );
    // Raceway: 60" * 50 / 12 = $250
    expect(result.racewayPrice).toBeCloseTo(250);
  });

  it("adds raceway box price (per square foot)", () => {
    const dims: Dimensions = {
      ...defaultDimensions,
      squareFeet: 10,
    };
    const result = calculateChannelLetterPrice(
      makeConfig({ text: "HELLO", height: 24, raceway: "Raceway Box" }),
      dims,
      defaultParams
    );
    // Raceway Box: 10 sqft * $50 = $500
    expect(result.racewayPrice).toBe(500);
  });

  it("adds regular vinyl price", () => {
    const dims: Dimensions = {
      ...defaultDimensions,
      squareFeet: 10,
    };
    const result = calculateChannelLetterPrice(
      makeConfig({ text: "HELLO", height: 24, vinyl: "Regular" }),
      dims,
      defaultParams
    );
    // Vinyl: 10 sqft * $5 = $50
    expect(result.vinylPrice).toBe(50);
  });

  it("adds perforated vinyl price", () => {
    const dims: Dimensions = {
      ...defaultDimensions,
      squareFeet: 10,
    };
    const result = calculateChannelLetterPrice(
      makeConfig({ text: "HELLO", height: 24, vinyl: "Perforated" }),
      dims,
      defaultParams
    );
    // Vinyl: 10 sqft * $10 = $100
    expect(result.vinylPrice).toBe(100);
  });

  it("strips spaces from text for letter count", () => {
    const result = calculateChannelLetterPrice(
      makeConfig({ text: "H E L L O", height: 24 }),
      defaultDimensions,
      defaultParams
    );
    // Still 5 letters (spaces stripped)
    expect(result.letterPrice).toBe(5 * 24 * 16);
  });

  it("enforces minimum order price", () => {
    const result = calculateChannelLetterPrice(
      makeConfig({ text: "HI", height: 12 }),
      defaultDimensions,
      defaultParams
    );
    // 2 * 12 * 16 = 384, below minimum of 1360
    expect(result.subtotal).toBe(384);
    expect(result.total).toBe(1360);
    expect(result.minOrderApplied).toBe(true);
  });

  it("applies curved font multiplier for Permanent Marker (decorative font)", () => {
    const result = calculateChannelLetterPrice(
      makeConfig({ text: "HELLO", height: 24, font: "Permanent Marker" }),
      defaultDimensions,
      defaultParams
    );
    // 5 * 24 * 16 = 1920, * 1.2 = 2304
    expect(result.priceAfterMultipliers).toBeCloseTo(2304);
  });

  it("does not apply curved multiplier for Montserrat (non-decorative font)", () => {
    const result = calculateChannelLetterPrice(
      makeConfig({ text: "HELLO", height: 24, font: "Montserrat" }),
      defaultDimensions,
      defaultParams
    );
    // 5 * 24 * 16 = 1920, no multiplier
    expect(result.priceAfterMultipliers).toBe(1920);
  });

  it("works with Halo-Lit pricing params", () => {
    const haloParams: PricingParams = {
      basePricePerInch: 30,
      largeSizeThreshold: 36,
      largeSizePricePerInch: 34,
      minHeightForPrice: 12,
      minOrderPrice: 1360,
    };
    const result = calculateChannelLetterPrice(
      makeConfig({ text: "HELLO", height: 24, productType: "halo-lit" }),
      defaultDimensions,
      haloParams
    );
    // 5 * 24 * 30 = 3600
    expect(result.letterPrice).toBe(3600);
    expect(result.total).toBe(3600);
  });
});
