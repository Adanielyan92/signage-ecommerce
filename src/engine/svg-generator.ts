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
          `M ${round((cmd.x ?? 0) * scale + offsetX)} ${round((cmd.y ?? 0) * scale)}`
        );
        break;
      case "L":
        commands.push(
          `L ${round((cmd.x ?? 0) * scale + offsetX)} ${round((cmd.y ?? 0) * scale)}`
        );
        break;
      case "Q":
        commands.push(
          `Q ${round((cmd.x1 ?? 0) * scale + offsetX)} ${round((cmd.y1 ?? 0) * scale)} ${round((cmd.x ?? 0) * scale + offsetX)} ${round((cmd.y ?? 0) * scale)}`
        );
        break;
      case "C":
        commands.push(
          `C ${round((cmd.x1 ?? 0) * scale + offsetX)} ${round((cmd.y1 ?? 0) * scale)} ${round((cmd.x2 ?? 0) * scale + offsetX)} ${round((cmd.y2 ?? 0) * scale)} ${round((cmd.x ?? 0) * scale + offsetX)} ${round((cmd.y ?? 0) * scale)}`
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
