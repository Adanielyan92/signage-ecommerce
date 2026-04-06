import { calculateDimensionalPrice } from "../dimensional-pricing";
import type { PricingParams } from "@/types/product";
import type {
  DimensionalLetterConfiguration,
  Dimensions,
} from "@/types/configurator";

// Acrylic params
const acrylicParams: PricingParams = {
  basePricePerInch: 8,
  largeSizeThreshold: 36,
  largeSizePricePerInch: 10,
  minHeightForPrice: 12,
  minOrderPrice: 800,
};

// Painted metal params
const paintedMetalParams: PricingParams = {
  basePricePerInch: 12,
  largeSizeThreshold: 36,
  largeSizePricePerInch: 14,
  minHeightForPrice: 12,
  minOrderPrice: 1000,
};

// Brushed metal params
const brushedMetalParams: PricingParams = {
  basePricePerInch: 14,
  largeSizeThreshold: 36,
  largeSizePricePerInch: 16,
  minHeightForPrice: 12,
  minOrderPrice: 1000,
};

// Flat-cut aluminum params
const flatCutAluminumParams: PricingParams = {
  basePricePerInch: 10,
  largeSizeThreshold: 36,
  largeSizePricePerInch: 12,
  minHeightForPrice: 12,
  minOrderPrice: 800,
};

const defaultDimensions: Dimensions = {
  totalWidthInches: 60,
  heightInches: 12,
  squareFeet: 5,
  linearFeet: 12,
  letterWidths: [7.2, 7.2, 7.2, 7.2, 7.2],
};

function makeConfig(
  overrides: Partial<DimensionalLetterConfiguration> = {}
): DimensionalLetterConfiguration {
  return {
    productCategory: "DIMENSIONAL_LETTERS",
    productType: "acrylic",
    text: "HELLO",
    height: 12,
    font: "Standard",
    thickness: "0.25",
    painting: "-",
    paintingColors: 1,
    mounting: "stud",
    ...overrides,
  };
}

describe("calculateDimensionalPrice", () => {
  it("calculates base price: letterCount × height × pricePerInch", () => {
    // 5 letters * 12" * $8/inch = $480
    const result = calculateDimensionalPrice(
      makeConfig(),
      defaultDimensions,
      acrylicParams
    );
    expect(result.letterPrice).toBe(480);
  });

  it("uses large size pricing above threshold", () => {
    // 5 letters * 40" * $10/inch (large) = $2000
    const result = calculateDimensionalPrice(
      makeConfig({ height: 40 }),
      defaultDimensions,
      acrylicParams
    );
    expect(result.letterPrice).toBe(2000);
    expect(result.total).toBe(2000);
    expect(result.minOrderApplied).toBe(false);
  });

  it("enforces minimum height for price", () => {
    // Height is 8" but min is 12", so uses 12"
    // 5 letters * 12" * $8/inch = $480
    const result = calculateDimensionalPrice(
      makeConfig({ height: 8 }),
      defaultDimensions,
      acrylicParams
    );
    expect(result.letterPrice).toBe(480);
  });

  it("applies thickness multiplier for 3/4 inch (1.1x)", () => {
    // 5 letters * 24" * $8/inch = $960, * 1.1 = $1056
    const result = calculateDimensionalPrice(
      makeConfig({ height: 24, thickness: "0.75" }),
      defaultDimensions,
      acrylicParams
    );
    expect(result.letterPrice).toBe(960);
    expect(result.priceAfterMultipliers).toBeCloseTo(1056);
    expect(result.multipliers).toContainEqual(
      expect.objectContaining({ name: 'Thickness 3/4"', value: 1.1 })
    );
  });

  it("applies thickness multiplier for 1 inch (1.2x)", () => {
    // 5 letters * 24" * $8/inch = $960, * 1.2 = $1152
    const result = calculateDimensionalPrice(
      makeConfig({ height: 24, thickness: "1" }),
      defaultDimensions,
      acrylicParams
    );
    expect(result.letterPrice).toBe(960);
    expect(result.priceAfterMultipliers).toBeCloseTo(1152);
    expect(result.multipliers).toContainEqual(
      expect.objectContaining({ name: 'Thickness 1"', value: 1.2 })
    );
  });

  it("does not apply thickness multiplier for 1/4 inch or 1/2 inch", () => {
    const result025 = calculateDimensionalPrice(
      makeConfig({ height: 24, thickness: "0.25" }),
      defaultDimensions,
      acrylicParams
    );
    expect(result025.multipliers.filter((m) => m.name.startsWith("Thickness"))).toHaveLength(0);
    expect(result025.priceAfterMultipliers).toBe(960);

    const result05 = calculateDimensionalPrice(
      makeConfig({ height: 24, thickness: "0.5" }),
      defaultDimensions,
      acrylicParams
    );
    expect(result05.multipliers.filter((m) => m.name.startsWith("Thickness"))).toHaveLength(0);
    expect(result05.priceAfterMultipliers).toBe(960);
  });

  it("applies curved font multiplier (1.2x)", () => {
    // 5 letters * 24" * $8/inch = $960, * 1.2 = $1152
    const result = calculateDimensionalPrice(
      makeConfig({ height: 24, font: "Curved" }),
      defaultDimensions,
      acrylicParams
    );
    expect(result.priceAfterMultipliers).toBeCloseTo(1152);
    expect(result.multipliers).toContainEqual(
      expect.objectContaining({ name: "Curved Font", value: 1.2 })
    );
  });

  it("does not apply curved font multiplier for non-decorative font", () => {
    const result = calculateDimensionalPrice(
      makeConfig({ height: 24, font: "Montserrat" }),
      defaultDimensions,
      acrylicParams
    );
    expect(result.priceAfterMultipliers).toBe(960);
    expect(result.multipliers.filter((m) => m.name === "Curved Font")).toHaveLength(0);
  });

  it("applies painted multiplier (1.2x)", () => {
    // 5 letters * 24" * $8/inch = $960, * 1.2 = $1152
    const result = calculateDimensionalPrice(
      makeConfig({ height: 24, painting: "Painted" }),
      defaultDimensions,
      acrylicParams
    );
    expect(result.priceAfterMultipliers).toBeCloseTo(1152);
    expect(result.multipliers).toContainEqual(
      expect.objectContaining({ name: "Painted", value: 1.2 })
    );
  });

  it("applies painted multiplier for Painted Multicolor too", () => {
    const result = calculateDimensionalPrice(
      makeConfig({ height: 24, painting: "Painted Multicolor", paintingColors: 2 }),
      defaultDimensions,
      acrylicParams
    );
    // Painted multiplier applied: 960 * 1.2 = 1152
    expect(result.priceAfterMultipliers).toBeCloseTo(1152);
    expect(result.multipliers).toContainEqual(
      expect.objectContaining({ name: "Painted", value: 1.2 })
    );
  });

  it("stacks multipliers (thickness + curved + painted)", () => {
    // 5 letters * 24" * $8/inch = $960
    // Multipliers: 1.1 (thickness 3/4") * 1.2 (curved) * 1.2 (painted) = 1.584
    // 960 * 1.584 = $1520.64
    const result = calculateDimensionalPrice(
      makeConfig({
        height: 24,
        thickness: "0.75",
        font: "Curved",
        painting: "Painted",
      }),
      defaultDimensions,
      acrylicParams
    );
    expect(result.multipliers).toHaveLength(3);
    expect(result.priceAfterMultipliers).toBeCloseTo(1520.64);
  });

  it("enforces minimum order price", () => {
    // 2 letters * 12" * $8/inch = $192, below minimum of $800
    const result = calculateDimensionalPrice(
      makeConfig({ text: "HI" }),
      defaultDimensions,
      acrylicParams
    );
    expect(result.subtotal).toBe(192);
    expect(result.total).toBe(800);
    expect(result.minOrderApplied).toBe(true);
  });

  it("returns empty breakdown for empty text", () => {
    const result = calculateDimensionalPrice(
      makeConfig({ text: "" }),
      defaultDimensions,
      acrylicParams
    );
    expect(result.total).toBe(0);
    expect(result.letterPrice).toBe(0);
    expect(result.multipliers).toEqual([]);
    expect(result.minOrderApplied).toBe(false);
  });

  it("strips spaces from letter count", () => {
    // "H E L L O" → 5 letters (spaces stripped)
    // 5 * 24 * $8 = $960
    const result = calculateDimensionalPrice(
      makeConfig({ text: "H E L L O", height: 24 }),
      defaultDimensions,
      acrylicParams
    );
    expect(result.letterPrice).toBe(5 * 24 * 8);
  });

  it("adds multicolor painting surcharge", () => {
    // 5 letters * 24" * $8 = $960
    // Painted multiplier: * 1.2 = $1152
    // Multicolor surcharge: 5 letters * 300 * (3 - 1) = $3000
    const result = calculateDimensionalPrice(
      makeConfig({
        height: 24,
        painting: "Painted Multicolor",
        paintingColors: 3,
      }),
      defaultDimensions,
      acrylicParams
    );
    expect(result.paintingExtra).toBe(3000);
    expect(result.subtotal).toBeCloseTo(1152 + 3000);
  });

  it("works with painted metal params", () => {
    // 5 letters * 24" * $12/inch = $1440
    const result = calculateDimensionalPrice(
      makeConfig({ height: 24, productType: "painted-metal" }),
      defaultDimensions,
      paintedMetalParams
    );
    expect(result.letterPrice).toBe(1440);
    expect(result.total).toBe(1440);
  });

  it("works with brushed metal params", () => {
    // 5 letters * 24" * $14/inch = $1680
    const result = calculateDimensionalPrice(
      makeConfig({ height: 24, productType: "brushed-metal" }),
      defaultDimensions,
      brushedMetalParams
    );
    expect(result.letterPrice).toBe(1680);
    expect(result.total).toBe(1680);
  });

  it("works with flat-cut aluminum params", () => {
    // 5 letters * 24" * $10/inch = $1200
    const result = calculateDimensionalPrice(
      makeConfig({ height: 24, productType: "flat-cut-aluminum" }),
      defaultDimensions,
      flatCutAluminumParams
    );
    expect(result.letterPrice).toBe(1200);
    expect(result.total).toBe(1200);
  });

  it("uses large size pricing for brushed metal above threshold", () => {
    // 5 letters * 40" * $16/inch (large) = $3200
    const result = calculateDimensionalPrice(
      makeConfig({ height: 40, productType: "brushed-metal" }),
      defaultDimensions,
      brushedMetalParams
    );
    expect(result.letterPrice).toBe(3200);
  });

  it("sets racewayPrice and vinylPrice to 0 (not applicable for dimensional letters)", () => {
    const result = calculateDimensionalPrice(
      makeConfig({ height: 24 }),
      defaultDimensions,
      acrylicParams
    );
    expect(result.racewayPrice).toBe(0);
    expect(result.vinylPrice).toBe(0);
  });

  it("applies curved font multiplier for Permanent Marker (decorative font)", () => {
    // 5 letters * 24" * $8/inch = $960, * 1.2 = $1152
    const result = calculateDimensionalPrice(
      makeConfig({ height: 24, font: "Permanent Marker" }),
      defaultDimensions,
      acrylicParams
    );
    expect(result.priceAfterMultipliers).toBeCloseTo(1152);
  });
});
