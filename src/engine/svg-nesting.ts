// src/engine/svg-nesting.ts
/**
 * Nesting algorithm: pack letter outlines onto rectangular sheet stock
 * to minimize material waste.
 *
 * Uses bin-pack (already installed) for the rectangle packing.
 * Each letter is treated as its bounding box rectangle.
 *
 * Isomorphic -- no DOM dependencies.
 */

// bin-pack is a CJS module without types
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pack = require("bin-pack") as (
  items: { width: number; height: number }[]
) => {
  width: number;
  height: number;
  items: { width: number; height: number; x: number; y: number; item: { width: number; height: number } }[];
};

export interface LetterBounds {
  id: string;
  char: string;
  widthInches: number;
  heightInches: number;
  svgPathData: string;
}

export interface NestingInput {
  letters: LetterBounds[];
  sheetWidthInches: number;
  sheetHeightInches: number;
  /** Space between letters on the sheet. Default 0.25 inches. */
  spacingInches: number;
}

export interface LetterPlacement {
  letterId: string;
  char: string;
  x: number;
  y: number;
  sheetIndex: number;
}

export interface NestingResult {
  placements: LetterPlacement[];
  sheetsNeeded: number;
  /** Material utilization as percentage (0-100) */
  utilization: number;
  /** SVG showing the nested layout for all sheets */
  nestedSvg: string;
}

interface PackItem {
  id: string;
  char: string;
  width: number;
  height: number;
  originalWidth: number;
  originalHeight: number;
  svgPathData: string;
}

export function nestLettersOnSheet(input: NestingInput): NestingResult {
  const { letters, sheetWidthInches, sheetHeightInches, spacingInches } = input;

  if (letters.length === 0) {
    return {
      placements: [],
      sheetsNeeded: 0,
      utilization: 0,
      nestedSvg: buildNestedSvg([], letters, sheetWidthInches, sheetHeightInches),
    };
  }

  // Add spacing to each letter's dimensions for the packer
  const items: PackItem[] = letters.map((letter) => ({
    id: letter.id,
    char: letter.char,
    width: letter.widthInches + spacingInches,
    height: letter.heightInches + spacingInches,
    originalWidth: letter.widthInches,
    originalHeight: letter.heightInches,
    svgPathData: letter.svgPathData,
  }));

  // Pack letters sheet by sheet
  const allPlacements: LetterPlacement[] = [];
  let remaining = [...items];
  let sheetIndex = 0;

  while (remaining.length > 0) {
    // bin-pack sorts and places items into a single bin
    const packInput = remaining.map((item) => ({
      width: item.width,
      height: item.height,
    }));

    const result = pack(packInput);

    const placed: PackItem[] = [];
    const notPlaced: PackItem[] = [];

    for (let idx = 0; idx < result.items.length; idx++) {
      const packed = result.items[idx];
      const item = remaining[idx];

      // Check if placement fits within sheet bounds
      if (
        packed.x + item.originalWidth <= sheetWidthInches &&
        packed.y + item.originalHeight <= sheetHeightInches
      ) {
        allPlacements.push({
          letterId: item.id,
          char: item.char,
          x: packed.x,
          y: packed.y,
          sheetIndex,
        });
        placed.push(item);
      } else {
        notPlaced.push(item);
      }
    }

    // If nothing was placed, force-place one item (it might be too big)
    if (placed.length === 0 && remaining.length > 0) {
      const forced = remaining[0];
      allPlacements.push({
        letterId: forced.id,
        char: forced.char,
        x: 0,
        y: 0,
        sheetIndex,
      });
      remaining = remaining.slice(1);
    } else {
      remaining = notPlaced;
    }

    sheetIndex++;
  }

  const sheetsNeeded = sheetIndex;

  // Calculate utilization
  const totalLetterArea = letters.reduce(
    (sum, l) => sum + l.widthInches * l.heightInches,
    0
  );
  const totalSheetArea = sheetsNeeded * sheetWidthInches * sheetHeightInches;
  const utilization = totalSheetArea > 0
    ? Math.round((totalLetterArea / totalSheetArea) * 10000) / 100
    : 0;

  // Build the SVG
  const nestedSvg = buildNestedSvg(
    allPlacements,
    letters,
    sheetWidthInches,
    sheetHeightInches
  );

  return {
    placements: allPlacements,
    sheetsNeeded,
    utilization,
    nestedSvg,
  };
}

function buildNestedSvg(
  placements: LetterPlacement[],
  letters: LetterBounds[],
  sheetWidth: number,
  sheetHeight: number
): string {
  const letterMap = new Map(letters.map((l) => [l.id, l]));
  const sheetIndices = new Set(placements.map((p) => p.sheetIndex));
  const sheetCount = sheetIndices.size || 1;

  // Arrange sheets vertically in the SVG
  const padding = 1; // inch between sheets
  const totalHeight = sheetCount * sheetHeight + (sheetCount - 1) * padding;

  const utilPct = placements.length > 0
    ? Math.round((letters.reduce((s, l) => s + l.widthInches * l.heightInches, 0) / (sheetCount * sheetWidth * sheetHeight)) * 10000) / 100
    : 0;

  const lines: string[] = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<svg xmlns="http://www.w3.org/2000/svg"`,
    `  width="${sheetWidth}in"`,
    `  height="${totalHeight}in"`,
    `  viewBox="0 0 ${sheetWidth} ${totalHeight}"`,
    `  data-sheets="${sheetCount}"`,
    `  data-utilization="${utilPct}%">`,
  ];

  for (let s = 0; s < sheetCount; s++) {
    const yOffset = s * (sheetHeight + padding);
    const sheetPlacements = placements.filter((p) => p.sheetIndex === s);

    // Sheet outline
    lines.push(
      `  <rect x="0" y="${yOffset}" width="${sheetWidth}" height="${sheetHeight}" fill="none" stroke="#CCCCCC" stroke-width="0.02" />`
    );

    // Letters on this sheet
    for (const p of sheetPlacements) {
      const letter = letterMap.get(p.letterId);
      if (!letter) continue;

      lines.push(
        `  <g id="${p.letterId}" transform="translate(${p.x}, ${yOffset + p.y})">`
      );
      lines.push(
        `    <path d="${letter.svgPathData}" fill="none" stroke="#000000" stroke-width="0.01" />`
      );
      lines.push(`  </g>`);
    }
  }

  lines.push(`</svg>`);
  return lines.join("\n");
}
