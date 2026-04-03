import { calculateSignPostPrice } from "../sign-post-pricing";
import type { SignPostPricingParams } from "@/types/product";
import type { SignPostConfiguration, Dimensions } from "@/types/configurator";

const singlePostParams: SignPostPricingParams = {
  basePrice: 450,
  pricePerSqftSign: 25,
  minOrderPrice: 600,
};

const doublePostParams: SignPostPricingParams = {
  basePrice: 750,
  pricePerSqftSign: 25,
  minOrderPrice: 900,
};

const monumentParams: SignPostPricingParams = {
  basePrice: 1200,
  pricePerSqftSign: 30,
  minOrderPrice: 1500,
};

const defaultDimensions: Dimensions = {
  totalWidthInches: 48,
  heightInches: 36,
  squareFeet: 12, // sign panel area
  linearFeet: 14,
  letterWidths: [],
};

function makeConfig(
  overrides: Partial<SignPostConfiguration> = {}
): SignPostConfiguration {
  return {
    productCategory: "SIGN_POSTS",
    productType: "single-post",
    postHeight: 96,
    signWidthInches: 48,
    signHeightInches: 36,
    doubleSided: false,
    ...overrides,
  };
}

describe("calculateSignPostPrice", () => {
  it("calculates base post price + sign area price", () => {
    // Sign area: 48*36/144 = 12 sqft
    // Base: $450 + 12 * $25 = $450 + $300 = $750
    const result = calculateSignPostPrice(
      makeConfig(),
      defaultDimensions,
      singlePostParams
    );
    expect(result.letterPrice).toBe(450); // base post price
    expect(result.priceAfterMultipliers).toBe(750); // base + sign panel
    expect(result.total).toBe(750);
  });

  it("applies double-sided multiplier (1.6x on sign panel only)", () => {
    // Sign area: 12 sqft, sign panel price: 12 * $25 = $300
    // Double-sided sign panel: $300 * 1.6 = $480
    // Total: $450 (base) + $480 = $930
    const config = makeConfig({ doubleSided: true });
    const result = calculateSignPostPrice(
      config,
      defaultDimensions,
      singlePostParams
    );
    expect(result.letterPrice).toBe(450);
    expect(result.priceAfterMultipliers).toBe(930); // 450 + 300*1.6
    expect(result.total).toBe(930);
  });

  it("enforces minimum order price", () => {
    // Small sign: 2 sqft, base $450 + 2*$25 = $500, below min $600
    const config = makeConfig({
      signWidthInches: 24,
      signHeightInches: 12,
    });
    const dims: Dimensions = {
      ...defaultDimensions,
      totalWidthInches: 24,
      heightInches: 12,
      squareFeet: 2,
    };
    const result = calculateSignPostPrice(config, dims, singlePostParams);
    expect(result.priceAfterMultipliers).toBe(500); // 450 + 50
    expect(result.total).toBe(600);
    expect(result.minOrderApplied).toBe(true);
  });

  it("returns zero breakdown for zero sign area", () => {
    const config = makeConfig({
      signWidthInches: 0,
      signHeightInches: 0,
    });
    const dims: Dimensions = {
      ...defaultDimensions,
      totalWidthInches: 0,
      heightInches: 0,
      squareFeet: 0,
    };
    const result = calculateSignPostPrice(config, dims, singlePostParams);
    expect(result.total).toBe(0);
    expect(result.letterPrice).toBe(0);
  });

  it("works with double post params", () => {
    // Base: $750 + 12 * $25 = $750 + $300 = $1050
    const config = makeConfig({ productType: "double-post" });
    const result = calculateSignPostPrice(
      config,
      defaultDimensions,
      doublePostParams
    );
    expect(result.letterPrice).toBe(750);
    expect(result.priceAfterMultipliers).toBe(1050);
    expect(result.total).toBe(1050);
  });

  it("works with monument base params", () => {
    // Base: $1200 + 12 * $30 = $1200 + $360 = $1560
    const config = makeConfig({ productType: "monument-base" });
    const result = calculateSignPostPrice(
      config,
      defaultDimensions,
      monumentParams
    );
    expect(result.letterPrice).toBe(1200);
    expect(result.priceAfterMultipliers).toBe(1560);
    expect(result.total).toBe(1560);
  });

  it("double-sided does not affect base post price", () => {
    // Double post, double-sided
    // Base: $750, sign panel: 12 * $25 = $300, double-sided: $300 * 1.6 = $480
    // Total: $750 + $480 = $1230
    const config = makeConfig({
      productType: "double-post",
      doubleSided: true,
    });
    const result = calculateSignPostPrice(
      config,
      defaultDimensions,
      doublePostParams
    );
    expect(result.letterPrice).toBe(750);
    expect(result.priceAfterMultipliers).toBe(1230);
    expect(result.total).toBe(1230);
  });

  it("maps unused PriceBreakdown fields to zero", () => {
    const result = calculateSignPostPrice(
      makeConfig(),
      defaultDimensions,
      singlePostParams
    );
    expect(result.paintingExtra).toBe(0);
    expect(result.racewayPrice).toBe(0);
    expect(result.vinylPrice).toBe(0);
  });
});
