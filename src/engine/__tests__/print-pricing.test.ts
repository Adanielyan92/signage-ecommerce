import { calculatePrintPrice } from "../print-pricing";
import type { PrintPricingParams } from "@/types/product";
import type { PrintConfiguration, Dimensions } from "@/types/configurator";

const acmParams: PrintPricingParams = {
  basePricePerSqft: 25,
  minSqft: 4,
  minOrderPrice: 200,
};

const coroplastParams: PrintPricingParams = {
  basePricePerSqft: 12,
  minSqft: 4,
  minOrderPrice: 100,
};

const foamBoardParams: PrintPricingParams = {
  basePricePerSqft: 15,
  minSqft: 4,
  minOrderPrice: 100,
};

const defaultDimensions: Dimensions = {
  totalWidthInches: 48,
  heightInches: 24,
  squareFeet: 8, // 48*24/144 = 8 sqft
  linearFeet: 12,
  letterWidths: [],
};

function makeConfig(
  overrides: Partial<PrintConfiguration> = {}
): PrintConfiguration {
  return {
    productCategory: "PRINT_SIGNS",
    productType: "acm-panel",
    widthInches: 48,
    heightInches: 24,
    grommets: "-",
    laminated: false,
    ...overrides,
  };
}

describe("calculatePrintPrice", () => {
  it("calculates base price correctly (sqft-based)", () => {
    // 8 sqft * $25/sqft = $200
    const result = calculatePrintPrice(
      makeConfig(),
      defaultDimensions,
      acmParams
    );
    expect(result.letterPrice).toBe(200);
    expect(result.subtotal).toBe(200);
  });

  it("enforces minimum sqft", () => {
    // 2 sqft → clamped to 4 sqft, 4 * $25 = $100
    const config = makeConfig({ widthInches: 24, heightInches: 12 });
    const dims: Dimensions = {
      ...defaultDimensions,
      totalWidthInches: 24,
      heightInches: 12,
      squareFeet: 2, // 24*12/144 = 2 sqft, below min 4
    };
    const result = calculatePrintPrice(config, dims, acmParams);
    expect(result.letterPrice).toBe(100); // 4 * $25
  });

  it("adds grommets for 4 Corners ($8)", () => {
    // Base: 8 sqft * $25 = $200, grommets: 4 * $2 = $8
    const config = makeConfig({ grommets: "4 Corners" });
    const result = calculatePrintPrice(config, defaultDimensions, acmParams);
    expect(result.paintingExtra).toBe(8);
    expect(result.subtotal).toBe(208);
  });

  it("adds grommets for Each ft (perimeter * $2)", () => {
    // Perimeter: 2*(48+24) = 144 inches = 12 feet, grommets: 12 * $2 = $24
    const config = makeConfig({ grommets: "Each ft" });
    const result = calculatePrintPrice(config, defaultDimensions, acmParams);
    expect(result.paintingExtra).toBe(24);
    expect(result.subtotal).toBe(224);
  });

  it("adds lamination ($5/sqft)", () => {
    // Base: 8 sqft * $25 = $200, lamination: 8 * $5 = $40
    const config = makeConfig({ laminated: true });
    const result = calculatePrintPrice(config, defaultDimensions, acmParams);
    expect(result.racewayPrice).toBe(40);
    expect(result.subtotal).toBe(240);
  });

  it("enforces minimum order price", () => {
    // Small coroplast: 4 sqft (min) * $12 = $48, below min $100
    const config = makeConfig({
      productType: "coroplast",
      widthInches: 24,
      heightInches: 12,
    });
    const dims: Dimensions = {
      ...defaultDimensions,
      totalWidthInches: 24,
      heightInches: 12,
      squareFeet: 2,
    };
    const result = calculatePrintPrice(config, dims, coroplastParams);
    expect(result.letterPrice).toBe(48); // 4 * $12
    expect(result.total).toBe(100);
    expect(result.minOrderApplied).toBe(true);
  });

  it("returns zero breakdown for zero area", () => {
    const config = makeConfig({ widthInches: 0, heightInches: 0 });
    const dims: Dimensions = {
      ...defaultDimensions,
      totalWidthInches: 0,
      heightInches: 0,
      squareFeet: 0,
    };
    const result = calculatePrintPrice(config, dims, acmParams);
    expect(result.total).toBe(0);
    expect(result.letterPrice).toBe(0);
  });

  it("combines grommets and lamination", () => {
    // Base: 8 sqft * $25 = $200
    // Grommets 4 Corners: $8
    // Lamination: 8 * $5 = $40
    // Total: $248
    const config = makeConfig({ grommets: "4 Corners", laminated: true });
    const result = calculatePrintPrice(config, defaultDimensions, acmParams);
    expect(result.letterPrice).toBe(200);
    expect(result.paintingExtra).toBe(8);
    expect(result.racewayPrice).toBe(40);
    expect(result.subtotal).toBe(248);
  });

  it("works with foam board params", () => {
    // 8 sqft * $15/sqft = $120
    const config = makeConfig({ productType: "foam-board" });
    const result = calculatePrintPrice(
      config,
      defaultDimensions,
      foamBoardParams
    );
    expect(result.letterPrice).toBe(120);
  });

  it("uses actual sqft from dimensions when above minimum", () => {
    // 10 sqft (above min 4), 10 * $25 = $250
    const dims: Dimensions = {
      ...defaultDimensions,
      squareFeet: 10,
    };
    const result = calculatePrintPrice(makeConfig(), dims, acmParams);
    expect(result.letterPrice).toBe(250);
  });
});
