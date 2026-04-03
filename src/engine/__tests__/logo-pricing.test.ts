import { calculateLogoPrice } from "../logo-pricing";
import type { LogoPricingParams } from "@/types/product";
import type { LogoConfiguration, Dimensions } from "@/types/configurator";

const litParams: LogoPricingParams = {
  basePricePerSqInch: 0.5,
  minDimension: 12,
  minOrderPrice: 1000,
};

const nonLitParams: LogoPricingParams = {
  basePricePerSqInch: 0.3,
  minDimension: 12,
  minOrderPrice: 800,
};

const defaultDimensions: Dimensions = {
  totalWidthInches: 36,
  heightInches: 24,
  squareFeet: 6,
  linearFeet: 10,
  letterWidths: [],
};

function makeConfig(
  overrides: Partial<LogoConfiguration> = {}
): LogoConfiguration {
  return {
    productCategory: "LOGOS",
    productType: "lit-logo",
    widthInches: 36,
    heightInches: 24,
    led: "3000K",
    painting: "-",
    paintingColors: 1,
    depth: '4"',
    ...overrides,
  };
}

describe("calculateLogoPrice", () => {
  it("calculates base price correctly (area-based)", () => {
    // 36 * 24 * $0.50 = $432
    const result = calculateLogoPrice(
      makeConfig(),
      defaultDimensions,
      litParams
    );
    expect(result.letterPrice).toBe(432);
    expect(result.subtotal).toBe(432);
  });

  it("enforces minimum dimension on width", () => {
    // Width 8" → clamped to 12", height 24"
    // 12 * 24 * $0.50 = $144
    const config = makeConfig({ widthInches: 8, heightInches: 24 });
    const dims: Dimensions = {
      ...defaultDimensions,
      totalWidthInches: 8,
      heightInches: 24,
    };
    const result = calculateLogoPrice(config, dims, litParams);
    expect(result.letterPrice).toBe(144);
  });

  it("enforces minimum dimension on height", () => {
    // Width 36", height 6" → clamped to 12"
    // 36 * 12 * $0.50 = $216
    const config = makeConfig({ widthInches: 36, heightInches: 6 });
    const dims: Dimensions = {
      ...defaultDimensions,
      totalWidthInches: 36,
      heightInches: 6,
    };
    const result = calculateLogoPrice(config, dims, litParams);
    expect(result.letterPrice).toBe(216);
  });

  it("enforces minimum order price", () => {
    // Small logo: 12" x 12" * $0.50 = $72, below min $1000
    const config = makeConfig({ widthInches: 12, heightInches: 12 });
    const dims: Dimensions = {
      ...defaultDimensions,
      totalWidthInches: 12,
      heightInches: 12,
    };
    const result = calculateLogoPrice(config, dims, litParams);
    expect(result.letterPrice).toBe(72);
    expect(result.subtotal).toBe(72);
    expect(result.total).toBe(1000);
    expect(result.minOrderApplied).toBe(true);
  });

  it("applies RGB LED multiplier (1.1x)", () => {
    // 36 * 24 * $0.50 = $432, * 1.1 = $475.20
    const config = makeConfig({ led: "RGB" });
    const result = calculateLogoPrice(config, defaultDimensions, litParams);
    expect(result.priceAfterMultipliers).toBeCloseTo(475.2);
    expect(result.multipliers).toContainEqual(
      expect.objectContaining({ name: "RGB LED", value: 1.1 })
    );
  });

  it("applies painted multiplier (1.2x)", () => {
    // 36 * 24 * $0.50 = $432, * 1.2 = $518.40
    const config = makeConfig({ painting: "Painted" });
    const result = calculateLogoPrice(config, defaultDimensions, litParams);
    expect(result.priceAfterMultipliers).toBeCloseTo(518.4);
    expect(result.multipliers).toContainEqual(
      expect.objectContaining({ name: "Painted", value: 1.2 })
    );
  });

  it("applies 5-inch depth multiplier (1.05x)", () => {
    // 36 * 24 * $0.50 = $432, * 1.05 = $453.60
    const config = makeConfig({ depth: '5"' });
    const result = calculateLogoPrice(config, defaultDimensions, litParams);
    expect(result.priceAfterMultipliers).toBeCloseTo(453.6);
    expect(result.multipliers).toContainEqual(
      expect.objectContaining({ name: '5" Depth', value: 1.05 })
    );
  });

  it("stacks multiple multipliers", () => {
    // 36 * 24 * $0.50 = $432, * 1.1 * 1.2 * 1.05 = $598.752
    const config = makeConfig({
      led: "RGB",
      painting: "Painted",
      depth: '5"',
    });
    const result = calculateLogoPrice(config, defaultDimensions, litParams);
    expect(result.priceAfterMultipliers).toBeCloseTo(598.752);
  });

  it("returns zero breakdown for zero-area logo", () => {
    const config = makeConfig({ widthInches: 0, heightInches: 0 });
    const dims: Dimensions = {
      ...defaultDimensions,
      totalWidthInches: 0,
      heightInches: 0,
    };
    const result = calculateLogoPrice(config, dims, litParams);
    expect(result.total).toBe(0);
    expect(result.letterPrice).toBe(0);
  });

  it("works with non-lit logo params", () => {
    // 36 * 24 * $0.30 = $259.20
    const config = makeConfig({ productType: "non-lit-logo" });
    const result = calculateLogoPrice(config, defaultDimensions, nonLitParams);
    expect(result.letterPrice).toBeCloseTo(259.2);
  });

  it("does not apply RGB multiplier when LED is not RGB", () => {
    const config = makeConfig({ led: "3000K" });
    const result = calculateLogoPrice(config, defaultDimensions, litParams);
    expect(result.multipliers).not.toContainEqual(
      expect.objectContaining({ name: "RGB LED" })
    );
    // No multipliers, so priceAfterMultipliers === letterPrice
    expect(result.priceAfterMultipliers).toBe(result.letterPrice);
  });
});
