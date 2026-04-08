// src/engine/svg-generator.ts
/**
 * SVG cut file generator for CNC/laser cutting.
 * Uses opentype.js to extract glyph outlines and converts them to SVG paths.
 *
 * Isomorphic -- no DOM dependencies. Runs on server for production file generation.
 */

import { loadFont } from "@/engine/letter-measurement";
import type { Font, Path as OTPath } from "opentype.js";
import { computeLetterPositions, getTotalWidth, getTotalHeight } from "@/components/three/utils/letter-layout";

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
  
  // Use the shared layout engine
  const positions = computeLetterPositions(font, text, heightInches);
  
  const widthInches = getTotalWidth(positions);
  const totalHeight = getTotalHeight(positions, heightInches);

  const scale = heightInches / font.unitsPerEm;
  const paths: LetterPath[] = [];

  for (let i = 0; i < positions.length; i++) {
    const lp = positions[i];
    // Spaces don't have visual glyphs, skip rendering them
    if (lp.char === ' ' || lp.char === '\n' || lp.char === '\r') continue;
    
    const glyph = font.charToGlyph(lp.char);
    const glyphPath = glyph.getPath(0, 0, font.unitsPerEm);
    
    const svgPathData = opentypePathToSvgPath(glyphPath, scale, lp.x, lp.y + heightInches);

    paths.push({
      id: `letter-${i}`,
      char: lp.char,
      d: svgPathData,
      xOffset: lp.x,
      width: lp.width,
    });
  }

  // Adjust positions to be strictly positive (Layout engine centers at 0)
  const minX = Math.min(...positions.map(p => p.x));
  const minY = Math.min(...positions.map(p => p.y));
  
  for (const p of paths) {
      // Re-parse and shift path
      // Actually, since we're generating static SVG string, it's easier to use SVG group transform.
      // We will do `<g transform="translate(${-minX + padding}, ${-minY + padding})">` inside buildSvg.
  }

  return buildSvg({
    paths,
    totalWidth: widthInches,
    totalHeight: totalHeight,
    heightInches,
    fontName,
    strokeWidthInches,
    minX,
    minY
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
  minX?: number;
  minY?: number;
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
  offsetY: number
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
          `M ${round((cmd.x ?? 0) * scale + offsetX)} ${round(offsetY - (cmd.y ?? 0) * scale)}`
        );
        break;
      case "L":
        commands.push(
          `L ${round((cmd.x ?? 0) * scale + offsetX)} ${round(offsetY - (cmd.y ?? 0) * scale)}`
        );
        break;
      case "Q":
        commands.push(
          `Q ${round((cmd.x1 ?? 0) * scale + offsetX)} ${round(offsetY - (cmd.y1 ?? 0) * scale)} ${round((cmd.x ?? 0) * scale + offsetX)} ${round(offsetY - (cmd.y ?? 0) * scale)}`
        );
        break;
      case "C":
        commands.push(
          `C ${round((cmd.x1 ?? 0) * scale + offsetX)} ${round(offsetY - (cmd.y1 ?? 0) * scale)} ${round((cmd.x2 ?? 0) * scale + offsetX)} ${round(offsetY - (cmd.y2 ?? 0) * scale)} ${round((cmd.x ?? 0) * scale + offsetX)} ${round(offsetY - (cmd.y ?? 0) * scale)}`
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
  const { paths, totalWidth, totalHeight, heightInches, fontName, strokeWidthInches, minX = 0, minY = 0 } = opts;

  // Make room for dimension lines wrapping the SVG
  const paddingX = 3; 
  const paddingY = 3;
  
  const svgWidth = Math.max(totalWidth + paddingX * 2, 8);
  const svgHeight = Math.max(totalHeight + paddingY * 2, 4);

  // Layout transform base
  const baseX = paddingX - minX;
  const baseY = paddingY - minY;

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
    `  <defs>`,
    `    <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">`,
    `      <path d="M 0 0 L 10 5 L 0 10 z" fill="#0000ff" />`,
    `    </marker>`,
    `  </defs>`,
    `  <g transform="translate(${baseX}, ${baseY})"`,
    `    fill="none"`,
    `    stroke="#000000"`,
    `    stroke-width="${strokeWidthInches}">`,
  ];

  for (const p of paths) {
    if (p.d) {
      lines.push(
        `    <path id="${p.id}" d="${p.d}" data-char="${escapeXml(p.char)}" />`
      );
    }
  }

  lines.push(`  </g>`);
  
  // Dimensions group
  const dimColor = "#0000ff";
  const dimFontSize = Math.min(totalHeight * 0.15, 1);
  const dimYOffset = totalHeight + baseY + 1; // 1 inch below the bounding box
  const rightXOffset = totalWidth + baseX + 1; // 1 inch right of bounding box
  
  lines.push(`  <!-- Dimensions Overlay -->`);
  lines.push(`  <g fill="${dimColor}" stroke="${dimColor}" stroke-width="${strokeWidthInches * 2}" font-family="sans-serif" font-size="${dimFontSize}px" text-anchor="middle">`);
  
  // Width dimension
  lines.push(`    <line x1="${baseX}" y1="${dimYOffset}" x2="${totalWidth + baseX}" y2="${dimYOffset}" marker-start="url(#arrow)" marker-end="url(#arrow)" />`);
  lines.push(`    <text x="${baseX + totalWidth / 2}" y="${dimYOffset - 0.2}" stroke="none">${totalWidth.toFixed(2)}" W</text>`);

  // Height dimension
  lines.push(`    <line x1="${rightXOffset}" y1="${baseY}" x2="${rightXOffset}" y2="${totalHeight + baseY}" marker-start="url(#arrow)" marker-end="url(#arrow)" />`);
  // Vertical text
  lines.push(`    <g transform="translate(${rightXOffset + 0.3}, ${baseY + totalHeight / 2})">`);
  lines.push(`      <text x="0" y="0" stroke="none" transform="rotate(-90)">${totalHeight.toFixed(2)}" H</text>`);
  lines.push(`    </g>`);
  
  // Optional letter height info
  if (heightInches !== totalHeight) {
    lines.push(`    <text x="${baseX + totalWidth / 2}" y="${baseY - 0.5}" stroke="none" fill="#666">Line Height: ${heightInches.toFixed(2)}" H</text>`);
  }

  lines.push(`  </g>`);

  lines.push(`</svg>`);

  return lines.join("\n");
}
