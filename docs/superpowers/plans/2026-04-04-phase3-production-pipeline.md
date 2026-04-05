# Phase 3: Production Pipeline & Templates -- Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Generate manufacturing-ready files (SVG cut paths, BOM, PDF spec sheet) from orders and build a template system for reusable product configurations.

**Architecture:** The production pipeline triggers after Stripe webhook creates an order. A new `production-files` engine module generates SVG cut files using opentype.js glyph outlines, BOM from product config + dimensions, and a PDF spec sheet. Files are stored via an abstract `FileStorage` interface (local disk in dev, S3/Blob in prod). A new `ProductionFile` Prisma model tracks generated files per order item. Templates are stored as `ProductTemplate` records that can be cloned into tenant-scoped `Product` rows.

**Tech Stack:** Next.js 16, opentype.js, Prisma, Tailwind CSS, lucide-react, jsPDF (for PDF generation)

---

## Task 1: SVG Cut File Generator (TDD)

Write the SVG generator that takes text + font + height and produces valid SVG with cut paths from opentype.js glyph outlines. This is an isomorphic engine module (no DOM).

### Files

- `src/engine/svg-generator.ts` (new)
- `src/engine/__tests__/svg-generator.test.ts` (new)

### Steps

- [ ] **1.1** Create test file `src/engine/__tests__/svg-generator.test.ts` with the following tests:

```typescript
// src/engine/__tests__/svg-generator.test.ts
import { generateSvgCutFile, type SvgGeneratorInput } from "../svg-generator";

const defaultInput: SvgGeneratorInput = {
  text: "HELLO",
  fontName: "Standard",
  heightInches: 12,
  letterSpacingInches: 0.5,
};

describe("generateSvgCutFile", () => {
  it("returns valid SVG string with xml header", async () => {
    const svg = await generateSvgCutFile(defaultInput);
    expect(svg).toContain('<?xml version="1.0"');
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });

  it("contains one <path> per non-space character", async () => {
    const svg = await generateSvgCutFile(defaultInput);
    const pathMatches = svg.match(/<path /g);
    // HELLO = 5 characters, each gets at least one path
    expect(pathMatches).not.toBeNull();
    expect(pathMatches!.length).toBeGreaterThanOrEqual(5);
  });

  it("uses inches as the SVG unit (viewBox scaled to real dimensions)", async () => {
    const svg = await generateSvgCutFile(defaultInput);
    // viewBox should contain the height in inches
    const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);
    expect(viewBoxMatch).not.toBeNull();
    const [, , , , height] = viewBoxMatch![1].split(" ").map(Number);
    expect(height).toBeCloseTo(12, 0);
  });

  it("returns empty SVG for empty text", async () => {
    const svg = await generateSvgCutFile({ ...defaultInput, text: "" });
    expect(svg).toContain("<svg");
    expect(svg).not.toContain("<path");
  });

  it("strips spaces from text", async () => {
    const svg = await generateSvgCutFile({ ...defaultInput, text: "H E L" });
    const pathMatches = svg.match(/<path /g);
    expect(pathMatches!.length).toBeGreaterThanOrEqual(3);
  });

  it("sets each path with a unique id based on character index", async () => {
    const svg = await generateSvgCutFile(defaultInput);
    expect(svg).toContain('id="letter-0"');
    expect(svg).toContain('id="letter-4"');
  });

  it("includes dimension metadata as data attributes", async () => {
    const svg = await generateSvgCutFile(defaultInput);
    expect(svg).toContain('data-height-inches="12"');
    expect(svg).toContain('data-font="Standard"');
  });

  it("works with curved font", async () => {
    const svg = await generateSvgCutFile({
      ...defaultInput,
      fontName: "Curved",
    });
    expect(svg).toContain("<path");
  });
});
```

- [ ] **1.2** Create `src/engine/svg-generator.ts`:

```typescript
// src/engine/svg-generator.ts
/**
 * SVG cut file generator for CNC/laser cutting.
 * Uses opentype.js to extract glyph outlines and converts them to SVG paths.
 *
 * Isomorphic -- no DOM dependencies. Runs on server for production file generation.
 */

import { loadFont } from "@/engine/letter-measurement";
import type { Font, Path as OTPath } from "opentype.js";

export interface SvgGeneratorInput {
  text: string;
  fontName: string;
  heightInches: number;
  /** Space between letters in inches. Defaults to 0.5 */
  letterSpacingInches?: number;
  /** Stroke width for cut lines in inches. Defaults to 0.01 */
  strokeWidthInches?: number;
}

export interface SvgGeneratorResult {
  svg: string;
  totalWidthInches: number;
  totalHeightInches: number;
  letterCount: number;
}

/**
 * Generate an SVG cut file from text + font configuration.
 * Returns a valid SVG string with paths for each letter, sized in inches.
 *
 * Each letter is a separate `<path>` element with an id like "letter-0".
 * The SVG viewBox is in inches matching real-world dimensions.
 */
export async function generateSvgCutFile(
  input: SvgGeneratorInput
): Promise<string> {
  const {
    text,
    fontName,
    heightInches,
    letterSpacingInches = 0.5,
    strokeWidthInches = 0.01,
  } = input;

  const strippedText = text.replace(/\s+/g, "");

  if (strippedText.length === 0) {
    return buildSvg({
      paths: [],
      totalWidth: 0,
      totalHeight: heightInches,
      heightInches,
      fontName,
      strokeWidthInches,
    });
  }

  const font = await loadFont(fontName);
  const scale = heightInches / font.unitsPerEm;

  const paths: LetterPath[] = [];
  let cursorX = 0;

  for (let i = 0; i < strippedText.length; i++) {
    const char = strippedText[i];
    const glyph = font.charToGlyph(char);
    const glyphPath = glyph.getPath(0, 0, font.unitsPerEm);

    // Convert opentype path commands to SVG path data, applying scale and offset
    const svgPathData = opentypePathToSvgPath(glyphPath, scale, cursorX, heightInches);

    const advanceWidth = (glyph.advanceWidth || font.unitsPerEm * 0.6) * scale;

    paths.push({
      id: `letter-${i}`,
      char,
      d: svgPathData,
      xOffset: cursorX,
      width: advanceWidth,
    });

    cursorX += advanceWidth;

    // Add kerning
    if (i < strippedText.length - 1) {
      const nextGlyph = font.charToGlyph(strippedText[i + 1]);
      const kerning = font.getKerningValue(glyph, nextGlyph) * scale;
      cursorX += kerning;
    }

    // Add letter spacing (except after last letter)
    if (i < strippedText.length - 1) {
      cursorX += letterSpacingInches;
    }
  }

  return buildSvg({
    paths,
    totalWidth: cursorX,
    totalHeight: heightInches,
    heightInches,
    fontName,
    strokeWidthInches,
  });
}

// ---------------------------------------------------------------------------
// Internal types and helpers
// ---------------------------------------------------------------------------

interface LetterPath {
  id: string;
  char: string;
  d: string;
  xOffset: number;
  width: number;
}

interface BuildSvgOptions {
  paths: LetterPath[];
  totalWidth: number;
  totalHeight: number;
  heightInches: number;
  fontName: string;
  strokeWidthInches: number;
}

/**
 * Convert an opentype.js Path object to an SVG path `d` attribute string.
 * Applies scaling (font units to inches) and positioning.
 *
 * opentype.js uses a Y-down coordinate system for path commands but glyphs
 * are designed with Y-up baseline. We flip Y so that the SVG renders correctly
 * with Y-down (SVG default).
 */
function opentypePathToSvgPath(
  otPath: OTPath,
  scale: number,
  offsetX: number,
  heightInches: number
): string {
  const commands: string[] = [];

  for (const cmd of otPath.commands) {
    // opentype.js Y is baseline-relative with Y-up in glyph space.
    // The getPath(x, y, fontSize) call uses Y-down screen coordinates,
    // so y values from commands are already in screen space.
    // We scale and offset them into our inch-based SVG coordinate system.
    switch (cmd.type) {
      case "M":
        commands.push(
          `M ${round(cmd.x * scale + offsetX)} ${round(cmd.y * scale)}`
        );
        break;
      case "L":
        commands.push(
          `L ${round(cmd.x * scale + offsetX)} ${round(cmd.y * scale)}`
        );
        break;
      case "Q":
        commands.push(
          `Q ${round(cmd.x1 * scale + offsetX)} ${round(cmd.y1 * scale)} ${round(cmd.x * scale + offsetX)} ${round(cmd.y * scale)}`
        );
        break;
      case "C":
        commands.push(
          `C ${round(cmd.x1 * scale + offsetX)} ${round(cmd.y1 * scale)} ${round(cmd.x2 * scale + offsetX)} ${round(cmd.y2 * scale)} ${round(cmd.x * scale + offsetX)} ${round(cmd.y * scale)}`
        );
        break;
      case "Z":
        commands.push("Z");
        break;
    }
  }

  return commands.join(" ");
}

function round(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function buildSvg(opts: BuildSvgOptions): string {
  const { paths, totalWidth, totalHeight, heightInches, fontName, strokeWidthInches } = opts;

  const padding = 0.5; // 0.5 inch padding
  const svgWidth = Math.max(totalWidth + padding * 2, 1);
  const svgHeight = totalHeight + padding * 2;

  const lines: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg"`,
    `  width="${round(svgWidth)}in"`,
    `  height="${round(svgHeight)}in"`,
    `  viewBox="0 0 ${round(svgWidth)} ${round(svgHeight)}"`,
    `  data-height-inches="${heightInches}"`,
    `  data-total-width-inches="${round(totalWidth)}"`,
    `  data-font="${escapeXml(fontName)}"`,
    `  data-letter-count="${paths.length}">`,
    `  <g transform="translate(${padding}, ${padding})"`,
    `    fill="none"`,
    `    stroke="#000000"`,
    `    stroke-width="${strokeWidthInches}">`,
  ];

  for (const p of paths) {
    lines.push(
      `    <path id="${p.id}" d="${p.d}" data-char="${escapeXml(p.char)}" />`
    );
  }

  lines.push(`  </g>`);
  lines.push(`</svg>`);

  return lines.join("\n");
}
```

- [ ] **1.3** Run tests: `npx jest src/engine/__tests__/svg-generator.test.ts` -- all 8 tests should pass.
- [ ] **1.4** Commit: `feat(engine): add SVG cut file generator with opentype.js glyph outlines`

---

## Task 2: BOM (Bill of Materials) Generator (TDD)

Compute material quantities from a product configuration + dimensions: aluminum sheet area, trim cap linear footage, LED module count, raceway length, vinyl area, etc.

### Files

- `src/engine/bom-generator.ts` (new)
- `src/engine/__tests__/bom-generator.test.ts` (new)

### Steps

- [ ] **2.1** Create test file `src/engine/__tests__/bom-generator.test.ts`:

```typescript
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
```

- [ ] **2.2** Create `src/engine/bom-generator.ts`:

```typescript
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
```

- [ ] **2.3** Run tests: `npx jest src/engine/__tests__/bom-generator.test.ts` -- all 12 tests should pass.
- [ ] **2.4** Commit: `feat(engine): add BOM generator for material quantity computation`

---

## Task 3: File Storage Abstraction

Create a storage layer that writes to `public/uploads/orders/` in dev and can be swapped to S3/Vercel Blob in production via environment variable.

### Files

- `src/lib/file-storage.ts` (new)

### Steps

- [ ] **3.1** Create `src/lib/file-storage.ts`:

```typescript
// src/lib/file-storage.ts
/**
 * Abstract file storage layer.
 *
 * In development: writes to public/uploads/ on local disk.
 * In production: swap to S3 or Vercel Blob by setting FILE_STORAGE_PROVIDER env var.
 *
 * All paths are relative to the storage root (e.g. "orders/abc123/cut-file.svg").
 */

import fs from "fs/promises";
import path from "path";

export interface StoredFile {
  /** Relative path within storage (e.g. "orders/abc123/cut-file.svg") */
  key: string;
  /** Public URL to access the file */
  url: string;
  /** File size in bytes */
  sizeBytes: number;
}

export interface FileStorageProvider {
  write(key: string, data: Buffer | string, contentType: string): Promise<StoredFile>;
  read(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  getUrl(key: string): string;
}

// ---------------------------------------------------------------------------
// Local disk provider (development)
// ---------------------------------------------------------------------------

class LocalFileStorage implements FileStorageProvider {
  private root: string;

  constructor() {
    this.root = path.join(process.cwd(), "public", "uploads");
  }

  async write(key: string, data: Buffer | string, _contentType: string): Promise<StoredFile> {
    const filePath = path.join(this.root, key);
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });

    const buffer = typeof data === "string" ? Buffer.from(data, "utf-8") : data;
    await fs.writeFile(filePath, buffer);

    return {
      key,
      url: this.getUrl(key),
      sizeBytes: buffer.length,
    };
  }

  async read(key: string): Promise<Buffer> {
    const filePath = path.join(this.root, key);
    return fs.readFile(filePath);
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.root, key);
    await fs.unlink(filePath).catch(() => {});
  }

  async exists(key: string): Promise<boolean> {
    const filePath = path.join(this.root, key);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  getUrl(key: string): string {
    return `/uploads/${key}`;
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

let _instance: FileStorageProvider | null = null;

export function getFileStorage(): FileStorageProvider {
  if (_instance) return _instance;

  const provider = process.env.FILE_STORAGE_PROVIDER ?? "local";

  switch (provider) {
    case "local":
      _instance = new LocalFileStorage();
      break;
    // Future: case "s3": _instance = new S3FileStorage(); break;
    // Future: case "vercel-blob": _instance = new VercelBlobStorage(); break;
    default:
      _instance = new LocalFileStorage();
  }

  return _instance;
}
```

- [ ] **3.2** Add `public/uploads/` to `.gitignore`:

Append this line to `.gitignore`:
```
# Uploaded production files (dev only)
public/uploads/
```

- [ ] **3.3** Commit: `feat(lib): add file storage abstraction for production files`

---

## Task 4: Prisma Schema -- ProductionFile and ProductTemplate Models

Add two new models: `ProductionFile` (tracks generated files per order item) and `ProductTemplate` (reusable product blueprints).

### Files

- `prisma/schema.prisma` (edit)
- `src/types/order.ts` (edit)

### Steps

- [ ] **4.1** Add models to `prisma/schema.prisma` after the `OrderItem` model:

```prisma
// ─── Production Files ───────────────────────────

model ProductionFile {
  id          String   @id @default(cuid())
  orderItemId String
  fileType    String   // "svg_cut", "bom_json", "spec_pdf", "thumbnail_png"
  fileName    String
  storageKey  String
  url         String
  sizeBytes   Int
  contentType String
  createdAt   DateTime @default(now())

  orderItem OrderItem @relation(fields: [orderItemId], references: [id], onDelete: Cascade)

  @@index([orderItemId])
}
```

Add to the `OrderItem` model:

```prisma
  productionFiles ProductionFile[]
```

Add after the `SavedDesign` model:

```prisma
// ─── Product Templates ──────────────────────────

model ProductTemplate {
  id            String   @id @default(cuid())
  tenantId      String?
  name          String
  description   String?
  category      String
  slug          String   @unique
  productSchema Json?
  pricingParams Json?
  renderConfig  Json?
  defaultConfig Json?
  thumbnailUrl  String?
  isPublic      Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  tenant Tenant? @relation(fields: [tenantId], references: [id], onDelete: Cascade)
}
```

Also add to the `Tenant` model:

```prisma
  productTemplates ProductTemplate[]
```

- [ ] **4.2** Update `src/types/order.ts` to include production file types:

```typescript
// src/types/order.ts
import type { SignConfiguration } from "./configurator";

export type OrderStatus =
  | "PENDING"
  | "PAYMENT_RECEIVED"
  | "IN_PRODUCTION"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED";

export type ProductionFileType =
  | "svg_cut"
  | "bom_json"
  | "spec_pdf"
  | "thumbnail_png";

export interface ProductionFile {
  id: string;
  orderItemId: string;
  fileType: ProductionFileType;
  fileName: string;
  url: string;
  sizeBytes: number;
  contentType: string;
  createdAt: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  configuration: SignConfiguration;
  thumbnailUrl?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  productionFiles?: ProductionFile[];
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shippingCost: number;
  total: number;
  createdAt: string;
}
```

- [ ] **4.3** Run `npx prisma generate` to regenerate the client (do NOT run `prisma migrate dev` since DB is not connected).
- [ ] **4.4** Commit: `feat(schema): add ProductionFile and ProductTemplate Prisma models`

---

## Task 5: Production File Generation Service

Create the async service that generates all production files (SVG, BOM JSON, spec PDF) for an order item and stores them via the file storage layer.

### Files

- `src/lib/production-files.ts` (new)

### Dependencies

- Install `jspdf`: `npm install jspdf`
- Install types: `npm install -D @types/jspdf` (jspdf ships its own types, so this may not be needed -- check after install)

### Steps

- [ ] **5.1** Run `npm install jspdf`

- [ ] **5.2** Create `src/lib/production-files.ts`:

```typescript
// src/lib/production-files.ts
/**
 * Production file generation service.
 * Generates SVG cut files, BOM JSON, and PDF spec sheets for order items.
 * Stores files via the FileStorage abstraction.
 */

import { getFileStorage, type StoredFile } from "@/lib/file-storage";
import { generateSvgCutFile } from "@/engine/svg-generator";
import { generateBOM, type BOMResult } from "@/engine/bom-generator";
import type { SignConfiguration, Dimensions } from "@/types/configurator";
import type { ProductionFileType } from "@/types/order";
import { formatPrice } from "@/lib/utils";

export interface GenerateFilesInput {
  orderId: string;
  orderItemId: string;
  orderNumber: string;
  productName: string;
  config: SignConfiguration;
  dimensions: Dimensions;
  unitPrice: number;
  quantity: number;
}

export interface GeneratedFile {
  fileType: ProductionFileType;
  fileName: string;
  storageKey: string;
  url: string;
  sizeBytes: number;
  contentType: string;
}

/**
 * Generate all production files for a single order item.
 * Returns an array of generated file metadata to be persisted in the DB.
 */
export async function generateProductionFiles(
  input: GenerateFilesInput
): Promise<GeneratedFile[]> {
  const storage = getFileStorage();
  const basePath = `orders/${input.orderId}/${input.orderItemId}`;
  const results: GeneratedFile[] = [];

  // 1. SVG cut file
  try {
    const svgContent = await generateSvgCutFile({
      text: input.config.text,
      fontName: input.config.font,
      heightInches: input.config.height,
    });

    const svgFile = await storage.write(
      `${basePath}/cut-file.svg`,
      svgContent,
      "image/svg+xml"
    );

    results.push({
      fileType: "svg_cut",
      fileName: `${input.orderNumber}-cut-file.svg`,
      storageKey: svgFile.key,
      url: svgFile.url,
      sizeBytes: svgFile.sizeBytes,
      contentType: "image/svg+xml",
    });
  } catch (err) {
    console.error(`Failed to generate SVG for order item ${input.orderItemId}:`, err);
  }

  // 2. BOM JSON
  try {
    const bom = generateBOM({
      config: input.config,
      dimensions: input.dimensions,
      productName: input.productName,
    });

    const bomJson = JSON.stringify(bom, null, 2);
    const bomFile = await storage.write(
      `${basePath}/bom.json`,
      bomJson,
      "application/json"
    );

    results.push({
      fileType: "bom_json",
      fileName: `${input.orderNumber}-bom.json`,
      storageKey: bomFile.key,
      url: bomFile.url,
      sizeBytes: bomFile.sizeBytes,
      contentType: "application/json",
    });
  } catch (err) {
    console.error(`Failed to generate BOM for order item ${input.orderItemId}:`, err);
  }

  // 3. Spec PDF
  try {
    const bom = generateBOM({
      config: input.config,
      dimensions: input.dimensions,
      productName: input.productName,
    });

    const pdfBuffer = await generateSpecPdf(input, bom);
    const pdfFile = await storage.write(
      `${basePath}/spec-sheet.pdf`,
      pdfBuffer,
      "application/pdf"
    );

    results.push({
      fileType: "spec_pdf",
      fileName: `${input.orderNumber}-spec-sheet.pdf`,
      storageKey: pdfFile.key,
      url: pdfFile.url,
      sizeBytes: pdfFile.sizeBytes,
      contentType: "application/pdf",
    });
  } catch (err) {
    console.error(`Failed to generate PDF for order item ${input.orderItemId}:`, err);
  }

  return results;
}

// ---------------------------------------------------------------------------
// PDF generation (spec sheet)
// ---------------------------------------------------------------------------

async function generateSpecPdf(
  input: GenerateFilesInput,
  bom: BOMResult
): Promise<Buffer> {
  // jsPDF is ESM -- dynamic import for compatibility
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });

  const margin = 50;
  let y = margin;
  const pageWidth = doc.internal.pageSize.getWidth();

  // --- Header ---
  doc.setFontSize(20);
  doc.text("Production Spec Sheet", margin, y);
  y += 30;

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Order: ${input.orderNumber}`, margin, y);
  doc.text(`Date: ${new Date().toLocaleDateString("en-US")}`, pageWidth - margin - 120, y);
  y += 20;

  // --- Divider ---
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  // --- Product Info ---
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text(input.productName, margin, y);
  y += 25;

  doc.setFontSize(10);
  const specs = [
    ["Text", input.config.text],
    ["Font", input.config.font],
    ["Height", `${input.config.height}"`],
    ["Width", `${Math.round(input.dimensions.totalWidthInches)}"`],
    ["Depth", input.config.sideDepth],
    ["Type", input.config.productType],
    ["Illumination", input.config.lit],
    ...(input.config.lit === "Lit" ? [["LED Color", input.config.led]] : []),
    ...(input.config.lit === "Lit" ? [["Lit Sides", input.config.litSides]] : []),
    ["Painting", input.config.painting],
    ["Raceway", input.config.raceway],
    ["Vinyl", input.config.vinyl],
    ["Background", input.config.background],
  ];

  for (const [label, value] of specs) {
    doc.setTextColor(80);
    doc.text(`${label}:`, margin, y);
    doc.setTextColor(0);
    doc.text(String(value), margin + 100, y);
    y += 16;
  }

  y += 10;

  // --- Pricing ---
  doc.setFontSize(12);
  doc.text("Pricing", margin, y);
  y += 20;

  doc.setFontSize(10);
  doc.setTextColor(80);
  doc.text("Unit Price:", margin, y);
  doc.setTextColor(0);
  doc.text(formatPrice(input.unitPrice), margin + 100, y);
  y += 16;

  doc.setTextColor(80);
  doc.text("Quantity:", margin, y);
  doc.setTextColor(0);
  doc.text(String(input.quantity), margin + 100, y);
  y += 16;

  doc.setTextColor(80);
  doc.text("Total:", margin, y);
  doc.setTextColor(0);
  doc.setFontSize(11);
  doc.text(formatPrice(input.unitPrice * input.quantity), margin + 100, y);
  y += 25;

  // --- Divider ---
  doc.setDrawColor(200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 20;

  // --- BOM Table ---
  doc.setFontSize(12);
  doc.setTextColor(0);
  doc.text("Bill of Materials", margin, y);
  y += 20;

  // Table header
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text("Material", margin, y);
  doc.text("Qty", margin + 200, y);
  doc.text("Unit", margin + 260, y);
  doc.text("Notes", margin + 310, y);
  y += 5;
  doc.setDrawColor(220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 12;

  // Table rows
  doc.setTextColor(0);
  for (const item of bom.items) {
    doc.text(item.material, margin, y);
    doc.text(String(item.quantity), margin + 200, y);
    doc.text(item.unit, margin + 260, y);
    if (item.notes) {
      doc.setFontSize(8);
      doc.setTextColor(80);
      doc.text(item.notes.substring(0, 40), margin + 310, y);
      doc.setFontSize(9);
      doc.setTextColor(0);
    }
    y += 14;

    // New page if needed
    if (y > doc.internal.pageSize.getHeight() - margin) {
      doc.addPage();
      y = margin;
    }
  }

  // --- Footer ---
  y += 20;
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("Generated by GatSoft Signs", margin, y);

  // Return as Buffer
  const arrayBuffer = doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}
```

- [ ] **5.3** Commit: `feat(lib): add production file generation service (SVG, BOM, PDF)`

---

## Task 6: Trigger File Generation from Stripe Webhook + Order API Routes

Integrate file generation into the existing Stripe webhook (after order creation) and add API routes for listing orders and downloading files.

### Files

- `src/app/api/webhooks/stripe/route.ts` (edit)
- `src/app/api/v1/orders/route.ts` (new)
- `src/app/api/v1/orders/[orderId]/route.ts` (new)
- `src/app/api/v1/orders/[orderId]/files/route.ts` (new)

### Steps

- [ ] **6.1** Edit `src/app/api/webhooks/stripe/route.ts` -- after the `prisma.order.create()` call succeeds, add production file generation:

Add this import at the top:
```typescript
import { generateProductionFiles } from "@/lib/production-files";
import type { SignConfiguration, Dimensions } from "@/types/configurator";
import { estimateDimensions } from "@/engine/pricing";
```

After the existing `try { await prisma.order.create(...) }` block (around line 118), before `return NextResponse.json({ received: true })`, add:

```typescript
    // --- Trigger production file generation (non-blocking) ---
    // We intentionally do not await this -- file generation runs in the background
    // and failures should not cause the webhook to fail.
    const createdOrder = await prisma.order.findUnique({
      where: { orderNumber },
      include: { items: true },
    });

    if (createdOrder) {
      for (const item of createdOrder.items) {
        const config = item.configuration as unknown as SignConfiguration;
        const dims = estimateDimensions(config);

        generateProductionFiles({
          orderId: createdOrder.id,
          orderItemId: item.id,
          orderNumber: createdOrder.orderNumber,
          productName: (item.configSnapshot as Record<string, unknown>)?.productName as string ?? "Unknown Product",
          config,
          dimensions: dims,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
        })
          .then(async (files) => {
            // Persist file metadata to DB
            for (const file of files) {
              await prisma.productionFile.create({
                data: {
                  orderItemId: item.id,
                  fileType: file.fileType,
                  fileName: file.fileName,
                  storageKey: file.storageKey,
                  url: file.url,
                  sizeBytes: file.sizeBytes,
                  contentType: file.contentType,
                },
              });
            }
            console.log(`Generated ${files.length} production files for order item ${item.id}`);
          })
          .catch((err) => {
            console.error(`Production file generation failed for order item ${item.id}:`, err);
          });
      }
    }
```

- [ ] **6.2** Create `src/app/api/v1/orders/route.ts`:

```typescript
// src/app/api/v1/orders/route.ts
import { NextRequest, NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? undefined;
    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 100);
    const offset = (page - 1) * limit;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: {
          tenantId: tenant.id,
          ...(status ? { status: status as never } : {}),
        },
        include: {
          items: {
            include: {
              product: { select: { name: true, slug: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.order.count({
        where: {
          tenantId: tenant.id,
          ...(status ? { status: status as never } : {}),
        },
      }),
    ]);

    return NextResponse.json({
      orders,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("Error listing orders:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **6.3** Create `src/app/api/v1/orders/[orderId]/route.ts`:

```typescript
// src/app/api/v1/orders/[orderId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { orderId } = await params;

    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId: tenant.id },
      include: {
        items: {
          include: {
            product: { select: { name: true, slug: true, category: true } },
            productionFiles: {
              orderBy: { createdAt: "asc" },
            },
          },
        },
        shippingAddress: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json({ order });
  } catch (error) {
    console.error("Error fetching order:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **6.4** Create `src/app/api/v1/orders/[orderId]/files/route.ts`:

```typescript
// src/app/api/v1/orders/[orderId]/files/route.ts
import { NextRequest, NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { generateProductionFiles } from "@/lib/production-files";
import { estimateDimensions } from "@/engine/pricing";
import type { SignConfiguration } from "@/types/configurator";

/**
 * POST: Trigger (re)generation of production files for all items in an order.
 * GET: List all production files for an order.
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { orderId } = await params;

    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId: tenant.id },
      select: { id: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const files = await prisma.productionFile.findMany({
      where: {
        orderItem: { orderId },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ files });
  } catch (error) {
    console.error("Error listing production files:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { orderId } = await params;

    const order = await prisma.order.findFirst({
      where: { id: orderId, tenantId: tenant.id },
      include: { items: true },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const allFiles: Array<{
      orderItemId: string;
      fileType: string;
      fileName: string;
      url: string;
    }> = [];

    for (const item of order.items) {
      const config = item.configuration as unknown as SignConfiguration;
      const dims = estimateDimensions(config);
      const productName =
        (item.configSnapshot as Record<string, unknown>)?.productName as string ??
        "Unknown Product";

      // Delete existing production files for this item
      await prisma.productionFile.deleteMany({
        where: { orderItemId: item.id },
      });

      const files = await generateProductionFiles({
        orderId: order.id,
        orderItemId: item.id,
        orderNumber: order.orderNumber,
        productName,
        config,
        dimensions: dims,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
      });

      // Persist to DB
      for (const file of files) {
        await prisma.productionFile.create({
          data: {
            orderItemId: item.id,
            fileType: file.fileType,
            fileName: file.fileName,
            storageKey: file.storageKey,
            url: file.url,
            sizeBytes: file.sizeBytes,
            contentType: file.contentType,
          },
        });

        allFiles.push({
          orderItemId: item.id,
          fileType: file.fileType,
          fileName: file.fileName,
          url: file.url,
        });
      }
    }

    return NextResponse.json({
      message: `Generated ${allFiles.length} production files`,
      files: allFiles,
    });
  } catch (error) {
    console.error("Error generating production files:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **6.5** Commit: `feat(api): add order API routes and production file generation trigger`

---

## Task 7: Template API Routes

Create CRUD endpoints for product templates and a clone endpoint that creates a new Product from a template.

### Files

- `src/app/api/v1/templates/route.ts` (new)
- `src/app/api/v1/templates/[templateId]/route.ts` (new)
- `src/app/api/v1/templates/[templateId]/clone/route.ts` (new)

### Steps

- [ ] **7.1** Create `src/app/api/v1/templates/route.ts`:

```typescript
// src/app/api/v1/templates/route.ts
import { NextRequest, NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";

/**
 * GET: List templates visible to the tenant (own templates + public templates).
 * POST: Create a new template.
 */

export async function GET(request: NextRequest) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") ?? undefined;

    const templates = await prisma.productTemplate.findMany({
      where: {
        OR: [
          { tenantId: tenant.id },
          { isPublic: true },
        ],
        ...(category ? { category } : {}),
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error("Error listing templates:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      description,
      category,
      productSchema,
      pricingParams,
      renderConfig,
      defaultConfig,
      isPublic,
    } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }
    if (!category || typeof category !== "string") {
      return NextResponse.json({ error: "category is required" }, { status: 400 });
    }

    const slug = slugify(name);

    // Check slug uniqueness
    const existing = await prisma.productTemplate.findUnique({
      where: { slug },
    });
    if (existing) {
      return NextResponse.json(
        { error: `A template with slug "${slug}" already exists` },
        { status: 409 }
      );
    }

    const template = await prisma.productTemplate.create({
      data: {
        tenantId: tenant.id,
        name,
        slug,
        category,
        ...(description !== undefined ? { description } : {}),
        ...(productSchema !== undefined ? { productSchema } : {}),
        ...(pricingParams !== undefined ? { pricingParams } : {}),
        ...(renderConfig !== undefined ? { renderConfig } : {}),
        ...(defaultConfig !== undefined ? { defaultConfig } : {}),
        ...(isPublic !== undefined ? { isPublic } : {}),
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error("Error creating template:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **7.2** Create `src/app/api/v1/templates/[templateId]/route.ts`:

```typescript
// src/app/api/v1/templates/[templateId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { templateId } = await params;

    const template = await prisma.productTemplate.findFirst({
      where: {
        id: templateId,
        OR: [{ tenantId: tenant.id }, { isPublic: true }],
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Error fetching template:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { templateId } = await params;

    // Only allow editing own templates
    const existing = await prisma.productTemplate.findFirst({
      where: { id: templateId, tenantId: tenant.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      description,
      productSchema,
      pricingParams,
      renderConfig,
      defaultConfig,
      isPublic,
      thumbnailUrl,
    } = body;

    const template = await prisma.productTemplate.update({
      where: { id: templateId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(productSchema !== undefined ? { productSchema } : {}),
        ...(pricingParams !== undefined ? { pricingParams } : {}),
        ...(renderConfig !== undefined ? { renderConfig } : {}),
        ...(defaultConfig !== undefined ? { defaultConfig } : {}),
        ...(isPublic !== undefined ? { isPublic } : {}),
        ...(thumbnailUrl !== undefined ? { thumbnailUrl } : {}),
      },
    });

    return NextResponse.json({ template });
  } catch (error) {
    console.error("Error updating template:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { templateId } = await params;

    const existing = await prisma.productTemplate.findFirst({
      where: { id: templateId, tenantId: tenant.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    await prisma.productTemplate.delete({ where: { id: templateId } });

    return NextResponse.json({ message: "Template deleted" });
  } catch (error) {
    console.error("Error deleting template:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **7.3** Create `src/app/api/v1/templates/[templateId]/clone/route.ts`:

```typescript
// src/app/api/v1/templates/[templateId]/clone/route.ts
import { NextRequest, NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { slugify } from "@/lib/utils";

/**
 * POST: Clone a template into a new Product for this tenant.
 *
 * Body (optional overrides):
 *   - name: string (defaults to template name)
 *   - slug: string (defaults to slugified name)
 *   - pricingFormulaId: string (optional, link to a pricing formula)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const { templateId } = await params;

    const template = await prisma.productTemplate.findFirst({
      where: {
        id: templateId,
        OR: [{ tenantId: tenant.id }, { isPublic: true }],
      },
    });

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const name = (body.name as string) || template.name;
    const slug = (body.slug as string) || slugify(name);
    const pricingFormulaId = body.pricingFormulaId as string | undefined;

    // Check slug uniqueness within tenant
    const existingProduct = await prisma.product.findUnique({
      where: { tenantId_slug: { tenantId: tenant.id, slug } },
    });
    if (existingProduct) {
      return NextResponse.json(
        { error: `A product with slug "${slug}" already exists for this tenant` },
        { status: 409 }
      );
    }

    const product = await prisma.product.create({
      data: {
        tenantId: tenant.id,
        name,
        slug,
        category: template.category,
        description: template.description,
        productSchema: template.productSchema as Prisma.InputJsonValue ?? undefined,
        pricingParams: template.pricingParams as Prisma.InputJsonValue ?? undefined,
        renderConfig: template.renderConfig as Prisma.InputJsonValue ?? undefined,
        imageUrl: template.thumbnailUrl,
        ...(pricingFormulaId ? { pricingFormulaId } : {}),
      },
      include: {
        pricingFormula: {
          select: { id: true, name: true, type: true },
        },
      },
    });

    return NextResponse.json(
      {
        product,
        clonedFromTemplate: { id: template.id, name: template.name },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error cloning template:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

- [ ] **7.4** Commit: `feat(api): add template CRUD and clone-to-product endpoints`

---

## Task 8: Admin Order Detail Page with File Downloads

Build the admin UI pages for viewing orders with downloadable production files.

### Files

- `src/app/admin/orders/page.tsx` (new)
- `src/app/admin/orders/[orderId]/page.tsx` (new)
- `src/app/admin/layout.tsx` (new -- if not existing)

### Steps

- [ ] **8.1** Create admin layout `src/app/admin/layout.tsx`:

```tsx
// src/app/admin/layout.tsx
import type { ReactNode } from "react";
import Link from "next/link";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center gap-6">
          <Link href="/admin/orders" className="text-sm font-medium text-gray-700 hover:text-gray-900">
            Orders
          </Link>
          <Link href="/admin/templates" className="text-sm font-medium text-gray-700 hover:text-gray-900">
            Templates
          </Link>
          <div className="ml-auto">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
              Back to Store
            </Link>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
```

- [ ] **8.2** Create `src/app/admin/orders/page.tsx`:

```tsx
// src/app/admin/orders/page.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import { Package, ChevronRight, Loader2 } from "lucide-react";

interface OrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  total: number;
  createdAt: string;
  items: { id: string; quantity: number }[];
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/v1/orders")
      .then((res) => res.json())
      .then((data) => {
        setOrders(data.orders ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    PAYMENT_RECEIVED: "bg-green-100 text-green-800",
    IN_PRODUCTION: "bg-blue-100 text-blue-800",
    SHIPPED: "bg-purple-100 text-purple-800",
    DELIVERED: "bg-gray-100 text-gray-800",
    CANCELLED: "bg-red-100 text-red-800",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Orders</h1>

      {loading && (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading orders...
        </div>
      )}

      {!loading && orders.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No orders yet</p>
        </div>
      )}

      {!loading && orders.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Order</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Items</th>
                <th className="text-right px-4 py-3 font-medium text-gray-500">Total</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm">{order.orderNumber}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusColors[order.status] ?? "bg-gray-100 text-gray-800"}`}
                    >
                      {order.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {order.items.reduce((sum, i) => sum + i.quantity, 0)} item(s)
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatPrice(order.total)}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(order.createdAt).toLocaleDateString("en-US")}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/orders/${order.id}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **8.3** Create `src/app/admin/orders/[orderId]/page.tsx`:

```tsx
// src/app/admin/orders/[orderId]/page.tsx
"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/utils";
import {
  ArrowLeft,
  Download,
  FileText,
  FileCode,
  FileSpreadsheet,
  Image,
  Loader2,
  RefreshCw,
} from "lucide-react";

interface ProductionFileData {
  id: string;
  fileType: string;
  fileName: string;
  url: string;
  sizeBytes: number;
  contentType: string;
}

interface OrderItemData {
  id: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  configuration: Record<string, unknown>;
  configSnapshot: { productName?: string } | null;
  product: { name: string; slug: string; category: string };
  productionFiles: ProductionFileData[];
}

interface OrderData {
  id: string;
  orderNumber: string;
  status: string;
  subtotal: number;
  tax: number;
  shippingCost: number;
  total: number;
  createdAt: string;
  items: OrderItemData[];
}

const fileIcons: Record<string, typeof FileText> = {
  svg_cut: FileCode,
  bom_json: FileSpreadsheet,
  spec_pdf: FileText,
  thumbnail_png: Image,
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = use(params);
  const [order, setOrder] = useState<OrderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchOrder = () => {
    setLoading(true);
    fetch(`/api/v1/orders/${orderId}`)
      .then((res) => res.json())
      .then((data) => {
        setOrder(data.order ?? null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchOrder();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  const handleRegenerateFiles = async () => {
    setGenerating(true);
    try {
      await fetch(`/api/v1/orders/${orderId}/files`, { method: "POST" });
      fetchOrder();
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading order...
      </div>
    );
  }

  if (!order) {
    return <p className="text-gray-500">Order not found.</p>;
  }

  const statusColors: Record<string, string> = {
    PENDING: "bg-yellow-100 text-yellow-800",
    PAYMENT_RECEIVED: "bg-green-100 text-green-800",
    IN_PRODUCTION: "bg-blue-100 text-blue-800",
    SHIPPED: "bg-purple-100 text-purple-800",
    DELIVERED: "bg-gray-100 text-gray-800",
    CANCELLED: "bg-red-100 text-red-800",
  };

  return (
    <div>
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Orders
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {order.orderNumber}
          </h1>
          <span
            className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${statusColors[order.status] ?? "bg-gray-100"}`}
          >
            {order.status.replace(/_/g, " ")}
          </span>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">{formatPrice(order.total)}</p>
          <p className="text-sm text-gray-500">
            {new Date(order.createdAt).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Order Items */}
      <div className="space-y-6">
        {order.items.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-lg border border-gray-200 overflow-hidden"
          >
            <div className="px-6 py-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {item.configSnapshot?.productName ?? item.product.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {item.product.category} / {item.product.slug}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">
                    {item.quantity} x {formatPrice(item.unitPrice)}
                  </p>
                  <p className="text-sm text-gray-500">
                    = {formatPrice(item.totalPrice)}
                  </p>
                </div>
              </div>
            </div>

            {/* Configuration details */}
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-100">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                Configuration
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                {Object.entries(item.configuration).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-gray-500">{key}: </span>
                    <span className="text-gray-900">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Production Files */}
            <div className="px-6 py-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Production Files
                </p>
                <button
                  onClick={handleRegenerateFiles}
                  disabled={generating}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3 w-3 ${generating ? "animate-spin" : ""}`} />
                  Regenerate
                </button>
              </div>

              {item.productionFiles.length === 0 ? (
                <p className="text-sm text-gray-400">
                  No files generated yet.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {item.productionFiles.map((file) => {
                    const Icon = fileIcons[file.fileType] ?? FileText;
                    return (
                      <a
                        key={file.id}
                        href={file.url}
                        download={file.fileName}
                        className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors"
                      >
                        <Icon className="h-8 w-8 text-gray-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.fileName}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatBytes(file.sizeBytes)}
                          </p>
                        </div>
                        <Download className="h-4 w-4 text-gray-400 ml-auto flex-shrink-0" />
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **8.4** Commit: `feat(admin): add order list and detail pages with production file downloads`

---

## Task 9: Admin Template Management Page

Build a page for creating, viewing, and cloning templates.

### Files

- `src/app/admin/templates/page.tsx` (new)

### Steps

- [ ] **9.1** Create `src/app/admin/templates/page.tsx`:

```tsx
// src/app/admin/templates/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Copy,
  Pencil,
  Trash2,
  Loader2,
  LayoutTemplate,
  X,
} from "lucide-react";

interface TemplateData {
  id: string;
  name: string;
  description: string | null;
  category: string;
  slug: string;
  isPublic: boolean;
  createdAt: string;
}

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [cloning, setCloningId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("CHANNEL_LETTERS");
  const [formDescription, setFormDescription] = useState("");
  const [formIsPublic, setFormIsPublic] = useState(false);

  const categories = [
    "CHANNEL_LETTERS",
    "LIT_SHAPES",
    "CABINET_SIGNS",
    "DIMENSIONAL_LETTERS",
    "LOGOS",
    "PRINT_SIGNS",
    "SIGN_POSTS",
    "LIGHT_BOX_SIGNS",
    "BLADE_SIGNS",
    "NEON_SIGNS",
    "VINYL_BANNERS",
  ];

  const fetchTemplates = () => {
    setLoading(true);
    fetch("/api/v1/templates")
      .then((res) => res.json())
      .then((data) => {
        setTemplates(data.templates ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreate = async () => {
    if (!formName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/v1/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          category: formCategory,
          description: formDescription || undefined,
          isPublic: formIsPublic,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setFormName("");
        setFormDescription("");
        fetchTemplates();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleClone = async (templateId: string) => {
    setCloningId(templateId);
    try {
      const res = await fetch(`/api/v1/templates/${templateId}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Product "${data.product.name}" created from template.`);
      } else {
        alert(data.error || "Clone failed");
      }
    } finally {
      setCloningId(null);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm("Delete this template?")) return;
    await fetch(`/api/v1/templates/${templateId}`, { method: "DELETE" });
    fetchTemplates();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Product Templates
        </h1>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New Template
        </button>
      </div>

      {/* Create dialog */}
      {showCreate && (
        <div className="mb-6 bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Create Template</h2>
            <button onClick={() => setShowCreate(false)}>
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Front-Lit Standard Template"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              rows={2}
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formIsPublic}
                onChange={(e) => setFormIsPublic(e.target.checked)}
              />
              Public (visible to all tenants)
            </label>
            <button
              onClick={handleCreate}
              disabled={creating || !formName.trim()}
              className="ml-auto px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading templates...
        </div>
      )}

      {!loading && templates.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <LayoutTemplate className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No templates yet. Create one to get started.</p>
        </div>
      )}

      {!loading && templates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{t.name}</h3>
                  <p className="text-xs text-gray-500">
                    {t.category.replace(/_/g, " ")}
                  </p>
                </div>
                {t.isPublic && (
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                    Public
                  </span>
                )}
              </div>
              {t.description && (
                <p className="text-sm text-gray-600 mb-3">{t.description}</p>
              )}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => handleClone(t.id)}
                  disabled={cloning === t.id}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                  title="Clone into a new Product"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {cloning === t.id ? "Cloning..." : "Clone to Product"}
                </button>
                <button className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 ml-auto">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **9.2** Commit: `feat(admin): add template management page with create, clone, and delete`

---

## Task 10: Integration Wiring and Verification

Wire everything together, add the navbar link to admin, and run full test suite.

### Files

- `src/components/layout/navbar.tsx` (edit)

### Steps

- [ ] **10.1** Add admin link to the navbar. In `src/components/layout/navbar.tsx`, find the nav links section and add:

```tsx
<Link href="/admin/orders" className="text-sm text-gray-600 hover:text-gray-900">
  Admin
</Link>
```

- [ ] **10.2** Run `npx jest` to verify all tests pass (existing 20 + new SVG generator 8 + new BOM generator 12 = 40 tests).

- [ ] **10.3** Run `npm run build` to verify the build succeeds with all new files.

- [ ] **10.4** Verify the new API routes are accessible:
  - `GET /api/v1/orders`
  - `GET /api/v1/orders/:id`
  - `GET /api/v1/orders/:id/files`
  - `POST /api/v1/orders/:id/files`
  - `GET /api/v1/templates`
  - `POST /api/v1/templates`
  - `GET /api/v1/templates/:id`
  - `PATCH /api/v1/templates/:id`
  - `DELETE /api/v1/templates/:id`
  - `POST /api/v1/templates/:id/clone`

- [ ] **10.5** Commit: `feat: wire Phase 3 production pipeline into navbar and verify integration`

---

## Summary of New Files

| File | Purpose |
|------|---------|
| `src/engine/svg-generator.ts` | opentype.js glyph outlines to SVG cut paths |
| `src/engine/bom-generator.ts` | Product config to material quantities |
| `src/engine/__tests__/svg-generator.test.ts` | 8 tests for SVG generator |
| `src/engine/__tests__/bom-generator.test.ts` | 12 tests for BOM generator |
| `src/lib/file-storage.ts` | Abstract file storage (local disk / S3) |
| `src/lib/production-files.ts` | Orchestrates SVG + BOM + PDF generation |
| `src/app/api/v1/orders/route.ts` | GET list orders (tenant-scoped) |
| `src/app/api/v1/orders/[orderId]/route.ts` | GET order detail with files |
| `src/app/api/v1/orders/[orderId]/files/route.ts` | POST trigger generation, GET list files |
| `src/app/api/v1/templates/route.ts` | GET/POST templates |
| `src/app/api/v1/templates/[templateId]/route.ts` | GET/PATCH/DELETE template |
| `src/app/api/v1/templates/[templateId]/clone/route.ts` | POST clone to Product |
| `src/app/admin/layout.tsx` | Admin layout with nav |
| `src/app/admin/orders/page.tsx` | Order list page |
| `src/app/admin/orders/[orderId]/page.tsx` | Order detail with file downloads |
| `src/app/admin/templates/page.tsx` | Template CRUD + clone UI |

## Modified Files

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Add `ProductionFile`, `ProductTemplate` models |
| `src/types/order.ts` | Add `ProductionFileType`, `ProductionFile` interface |
| `src/app/api/webhooks/stripe/route.ts` | Trigger file generation after order creation |
| `src/components/layout/navbar.tsx` | Add Admin link |
| `.gitignore` | Add `public/uploads/` |
| `package.json` | Add `jspdf` dependency |
