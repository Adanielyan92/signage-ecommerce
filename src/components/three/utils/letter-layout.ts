import type { Font } from "opentype.js";

export interface LetterPosition {
  char: string;
  x: number;
  y: number;
  width: number;
  lineIndex: number;
}

/**
 * Compute per-character X and Y positions using opentype font metrics and kerning.
 * Shared by SignAssembly, DimensionalAssembly, and any text-based renderer.
 * Automatically handles centering and multi-line (\n) text.
 */
export function computeLetterPositions(
  font: Font,
  text: string,
  height: number,
  lineSpacingRatio: number = 1.3
): LetterPosition[] {
  if (!text) return [];

  const scale = height / font.unitsPerEm;
  const positions: LetterPosition[] = [];
  const lines = text.split('\n');

  // 1. Calculate width per line
  const lineMetrics = lines.map(line => {
    let width = 0;
    for (let i = 0; i < line.length; i++) {
      if (line[i] === ' ' || line[i] === '\r') {
        width += (font.unitsPerEm * 0.3) * scale;
        continue;
      }
      const glyph = font.charToGlyph(line[i]);
      width += (glyph.advanceWidth || font.unitsPerEm * 0.6) * scale;
      if (i < line.length - 1 && line[i+1] !== ' ' && line[i+1] !== '\r') {
        const nextGlyph = font.charToGlyph(line[i + 1]);
        width += font.getKerningValue(glyph, nextGlyph) * scale;
      }
    }
    return width;
  });

  // Calculate starting Y to center the whole block vertically around 0
  const totalHeight = (lines.length - 1) * (height * lineSpacingRatio);
  let currentY = totalHeight / 2;

  lines.forEach((line, lineIndex) => {
    let x = -lineMetrics[lineIndex] / 2; // Center this line horizontally
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === ' ' || char === '\r') {
         x += (font.unitsPerEm * 0.3) * scale;
         continue;
      }
      
      const glyph = font.charToGlyph(char);
      const advanceWidth = (glyph.advanceWidth || font.unitsPerEm * 0.6) * scale;
      
      positions.push({ char, x, y: currentY, width: advanceWidth, lineIndex });
      x += advanceWidth;

      if (i < line.length - 1 && line[i+1] !== ' ' && line[i+1] !== '\r') {
        const nextGlyph = font.charToGlyph(line[i + 1]);
        x += font.getKerningValue(glyph, nextGlyph) * scale;
      }
    }
    
    currentY -= height * lineSpacingRatio;
  });

  return positions;
}

/** Get total out-to-out width from letter positions array. */
export function getTotalWidth(positions: LetterPosition[]): number {
  if (positions.length === 0) return 0;
  const minX = Math.min(...positions.map(p => p.x));
  const maxX = Math.max(...positions.map(p => p.x + p.width));
  return maxX - minX;
}

/** Get total out-to-out height from letter positions array. */
export function getTotalHeight(positions: LetterPosition[], height: number): number {
  if (positions.length === 0) return 0;
  const minY = Math.min(...positions.map(p => p.y));
  const maxY = Math.max(...positions.map(p => p.y + height));
  return maxY - minY;
}

