// src/engine/bom-generator.ts
/**
 * Bill of Materials generator.
 * Takes a product configuration + dimensions and returns material quantities.
 *
 * Isomorphic -- no DOM dependencies.
 */

import type { SignConfiguration, Dimensions } from "@/types/configurator";
import type { ChannelLetterType } from "@/types/product";

export interface BOMLineItem {
  material: string;
  quantity: number;
  unit: "sqft" | "lft" | "pcs" | "sets" | "cans";
  notes?: string;
}

export interface BOMResult {
  productName: string;
  productType: string;
  text: string;
  letterCount: number;
  heightInches: number;
  totalWidthInches: number;
  items: BOMLineItem[];
  generatedAt: string;
}

export interface BOMInput {
  config: SignConfiguration;
  dimensions: Dimensions;
  productName: string;
}

// Types that have a translucent acrylic face
const ACRYLIC_FACE_TYPES: Set<ChannelLetterType> = new Set([
  "front-lit-trim-cap",
  "trimless",
]);

// Types that use trim cap
const TRIM_CAP_TYPES: Set<ChannelLetterType> = new Set([
  "front-lit-trim-cap",
]);

// Types that are always lit (no non-lit option)
const ALWAYS_LIT_TYPES: Set<ChannelLetterType> = new Set([
  "trimless",
  "marquee-letters",
  "back-lit",
  "halo-lit",
]);

// LED modules per square foot of face area (approximate)
const LED_MODULES_PER_SQFT = 3;

// Depth in inches parsed from sideDepth string
function parseDepthInches(sideDepth: string): number {
  const match = sideDepth.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : 4;
}

/**
 * Generate a Bill of Materials for a channel letter sign configuration.
 */
export function generateBOM(input: BOMInput): BOMResult {
  const { config, dimensions, productName } = input;
  const text = config.text.replace(/\s+/g, "");
  const letterCount = text.length;

  if (letterCount === 0) {
    return {
      productName,
      productType: config.productType,
      text: config.text,
      letterCount: 0,
      heightInches: config.height,
      totalWidthInches: 0,
      items: [],
      generatedAt: new Date().toISOString(),
    };
  }

  const items: BOMLineItem[] = [];
  const depthInches = parseDepthInches(config.sideDepth);
  const faceArea = dimensions.squareFeet; // sqft of the front face

  // --- Aluminum sheet for letter returns (sides) ---
  // Perimeter of all letters * depth = return area
  // Approximate perimeter: 2 * (height + avgWidth) per letter
  const avgLetterWidth =
    dimensions.letterWidths.length > 0
      ? dimensions.letterWidths.reduce((a, b) => a + b, 0) /
        dimensions.letterWidths.length
      : dimensions.totalWidthInches / letterCount;
  const perimeterPerLetter = 2 * (config.height + avgLetterWidth);
  const totalPerimeterInches = perimeterPerLetter * letterCount;
  const returnAreaSqft = (totalPerimeterInches * depthInches) / 144;

  items.push({
    material: "Aluminum Sheet",
    quantity: round(returnAreaSqft),
    unit: "sqft",
    notes: `Returns: ${letterCount} letters x ${depthInches}" depth`,
  });

  // --- Acrylic face (front-lit types) ---
  if (ACRYLIC_FACE_TYPES.has(config.productType)) {
    items.push({
      material: "Acrylic Face",
      quantity: round(faceArea),
      unit: "sqft",
      notes: config.productType === "trimless" ? 'Acrylic 1/4"' : "Lexan 3/16",
    });
  }

  // --- Trim cap ---
  if (TRIM_CAP_TYPES.has(config.productType)) {
    // Trim cap goes around the perimeter of each letter face
    const trimCapLft = totalPerimeterInches / 12;
    items.push({
      material: "Trim Cap",
      quantity: round(trimCapLft),
      unit: "lft",
      notes: `Perimeter of ${letterCount} letters`,
    });
  }

  // --- LED modules ---
  const isLit = config.lit === "Lit" || ALWAYS_LIT_TYPES.has(config.productType);
  if (isLit) {
    const moduleCount = Math.ceil(faceArea * LED_MODULES_PER_SQFT);
    const ledDescription = config.led === "RGB" ? "RGB LED" : `${config.led} LED`;
    items.push({
      material: "LED Modules",
      quantity: moduleCount,
      unit: "pcs",
      notes: `${ledDescription}, ${config.litSides === "Duo Lit" ? "dual-sided" : "face only"}`,
    });

    // Power supply: roughly 1 per 10 modules
    const psuCount = Math.ceil(moduleCount / 10);
    items.push({
      material: "Power Supply",
      quantity: psuCount,
      unit: "pcs",
      notes: `For ${moduleCount} LED modules`,
    });
  }

  // --- Raceway ---
  if (config.raceway === "Raceway") {
    items.push({
      material: "Raceway",
      quantity: round(dimensions.totalWidthInches / 12),
      unit: "lft",
      notes: `Linear raceway, ${round(dimensions.totalWidthInches)}" wide`,
    });
  } else if (config.raceway === "Raceway Box") {
    items.push({
      material: "Raceway",
      quantity: round(dimensions.squareFeet),
      unit: "sqft",
      notes: "Box raceway",
    });
  }

  // --- Vinyl ---
  if (config.vinyl === "Regular" || config.vinyl === "Perforated") {
    items.push({
      material: "Vinyl",
      quantity: round(faceArea),
      unit: "sqft",
      notes: `${config.vinyl} vinyl overlay`,
    });
  }

  // --- Paint ---
  if (config.painting === "Painted" || config.painting === "Painted Multicolor") {
    const colorCount =
      config.painting === "Painted Multicolor" ? config.paintingColors : 1;
    items.push({
      material: "Paint",
      quantity: colorCount,
      unit: "cans",
      notes: `${colorCount} color${colorCount > 1 ? "s" : ""}`,
    });
  }

  // --- Background panel ---
  if (config.background === "Background") {
    items.push({
      material: "Background Panel",
      quantity: round(dimensions.squareFeet * 1.2), // 20% larger than letters
      unit: "sqft",
      notes: "Aluminum background panel",
    });
  }

  // --- Mounting hardware ---
  items.push({
    material: "Mounting Hardware",
    quantity: letterCount,
    unit: "sets",
    notes: `Studs and spacers for ${letterCount} letters`,
  });

  return {
    productName,
    productType: config.productType,
    text: config.text,
    letterCount,
    heightInches: config.height,
    totalWidthInches: dimensions.totalWidthInches,
    items,
    generatedAt: new Date().toISOString(),
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
