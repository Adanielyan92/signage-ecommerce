// src/engine/__tests__/bom-generator.test.ts
import {
  generateBOM,
  type BOMInput,
  type BOMLineItem,
} from "../bom-generator";
import type { SignConfiguration, Dimensions } from "@/types/configurator";

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
    vinyl: "-",
    background: "-",
    ...overrides,
  };
}

const defaultDimensions: Dimensions = {
  totalWidthInches: 60,
  heightInches: 12,
  squareFeet: 5,
  linearFeet: 12,
  letterWidths: [12, 12, 12, 12, 12],
};

describe("generateBOM", () => {
  it("returns aluminum sheet for returns (face area based on letter count * height * depth)", () => {
    const input: BOMInput = {
      config: makeConfig(),
      dimensions: defaultDimensions,
      productName: "Front-Lit with Trim Cap",
    };
    const bom = generateBOM(input);
    const aluminum = bom.items.find((i) => i.material === "Aluminum Sheet");
    expect(aluminum).toBeDefined();
    expect(aluminum!.quantity).toBeGreaterThan(0);
    expect(aluminum!.unit).toBe("sqft");
  });

  it("includes acrylic face for front-lit types", () => {
    const input: BOMInput = {
      config: makeConfig({ productType: "front-lit-trim-cap" }),
      dimensions: defaultDimensions,
      productName: "Front-Lit with Trim Cap",
    };
    const bom = generateBOM(input);
    const acrylic = bom.items.find((i) => i.material === "Acrylic Face");
    expect(acrylic).toBeDefined();
    expect(acrylic!.unit).toBe("sqft");
  });

  it("does not include acrylic face for back-lit type", () => {
    const input: BOMInput = {
      config: makeConfig({ productType: "back-lit" }),
      dimensions: defaultDimensions,
      productName: "Back-Lit Letters",
    };
    const bom = generateBOM(input);
    const acrylic = bom.items.find((i) => i.material === "Acrylic Face");
    expect(acrylic).toBeUndefined();
  });

  it("includes trim cap for front-lit-trim-cap", () => {
    const input: BOMInput = {
      config: makeConfig({ productType: "front-lit-trim-cap" }),
      dimensions: defaultDimensions,
      productName: "Front-Lit with Trim Cap",
    };
    const bom = generateBOM(input);
    const trim = bom.items.find((i) => i.material === "Trim Cap");
    expect(trim).toBeDefined();
    expect(trim!.unit).toBe("lft");
  });

  it("does not include trim cap for trimless type", () => {
    const input: BOMInput = {
      config: makeConfig({ productType: "trimless" }),
      dimensions: defaultDimensions,
      productName: "Trimless",
    };
    const bom = generateBOM(input);
    const trim = bom.items.find((i) => i.material === "Trim Cap");
    expect(trim).toBeUndefined();
  });

  it("includes LED modules when lit", () => {
    const input: BOMInput = {
      config: makeConfig({ lit: "Lit" }),
      dimensions: defaultDimensions,
      productName: "Front-Lit with Trim Cap",
    };
    const bom = generateBOM(input);
    const led = bom.items.find((i) => i.material === "LED Modules");
    expect(led).toBeDefined();
    expect(led!.unit).toBe("pcs");
    expect(led!.quantity).toBeGreaterThan(0);
  });

  it("does not include LED modules when non-lit", () => {
    const input: BOMInput = {
      config: makeConfig({ lit: "Non-Lit", productType: "non-lit" }),
      dimensions: defaultDimensions,
      productName: "Non-Lit Letters",
    };
    const bom = generateBOM(input);
    const led = bom.items.find((i) => i.material === "LED Modules");
    expect(led).toBeUndefined();
  });

  it("includes raceway material when raceway is selected", () => {
    const input: BOMInput = {
      config: makeConfig({ raceway: "Raceway" }),
      dimensions: defaultDimensions,
      productName: "Front-Lit with Trim Cap",
    };
    const bom = generateBOM(input);
    const raceway = bom.items.find((i) => i.material === "Raceway");
    expect(raceway).toBeDefined();
    expect(raceway!.unit).toBe("lft");
  });

  it("includes vinyl when selected", () => {
    const input: BOMInput = {
      config: makeConfig({ vinyl: "Regular" }),
      dimensions: defaultDimensions,
      productName: "Front-Lit with Trim Cap",
    };
    const bom = generateBOM(input);
    const vinyl = bom.items.find((i) => i.material === "Vinyl");
    expect(vinyl).toBeDefined();
    expect(vinyl!.unit).toBe("sqft");
  });

  it("includes paint when painting is selected", () => {
    const input: BOMInput = {
      config: makeConfig({ painting: "Painted", paintingColors: 1 }),
      dimensions: defaultDimensions,
      productName: "Front-Lit with Trim Cap",
    };
    const bom = generateBOM(input);
    const paint = bom.items.find((i) => i.material === "Paint");
    expect(paint).toBeDefined();
    expect(paint!.notes).toContain("1 color");
  });

  it("includes background panel when selected", () => {
    const input: BOMInput = {
      config: makeConfig({ background: "Background" }),
      dimensions: defaultDimensions,
      productName: "Front-Lit with Trim Cap",
    };
    const bom = generateBOM(input);
    const bg = bom.items.find((i) => i.material === "Background Panel");
    expect(bg).toBeDefined();
    expect(bg!.unit).toBe("sqft");
  });

  it("returns totals summary", () => {
    const input: BOMInput = {
      config: makeConfig(),
      dimensions: defaultDimensions,
      productName: "Front-Lit with Trim Cap",
    };
    const bom = generateBOM(input);
    expect(bom.productName).toBe("Front-Lit with Trim Cap");
    expect(bom.letterCount).toBe(5);
    expect(bom.items.length).toBeGreaterThan(0);
  });

  it("handles empty text gracefully", () => {
    const input: BOMInput = {
      config: makeConfig({ text: "" }),
      dimensions: { ...defaultDimensions, totalWidthInches: 0, squareFeet: 0 },
      productName: "Front-Lit with Trim Cap",
    };
    const bom = generateBOM(input);
    expect(bom.letterCount).toBe(0);
    expect(bom.items.length).toBe(0);
  });
});
