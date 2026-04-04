import type { Font } from "opentype.js";

export interface LetterPosition {
  char: string;
  x: number;
  width: number;
}

/**
 * Compute per-character X positions using opentype font metrics and kerning.
 * Shared by SignAssembly, DimensionalAssembly, and any text-based renderer.
 */
export function computeLetterPositions(
  font: Font,
  text: string,
  height: number,
): LetterPosition[] {
  const textNoSpaces = text.replace(/\s+/g, "");
  if (textNoSpaces.length === 0) return [];

  const scale = height / font.unitsPerEm;
  const positions: LetterPosition[] = [];
  let x = 0;

  for (let i = 0; i < textNoSpaces.length; i++) {
    const glyph = font.charToGlyph(textNoSpaces[i]);
    const advanceWidth = (glyph.advanceWidth || font.unitsPerEm * 0.6) * scale;
    positions.push({ char: textNoSpaces[i], x, width: advanceWidth });
    x += advanceWidth;

    if (i < textNoSpaces.length - 1) {
      const nextGlyph = font.charToGlyph(textNoSpaces[i + 1]);
      x += font.getKerningValue(glyph, nextGlyph) * scale;
    }
  }

  return positions;
}

/** Get total width from letter positions array. */
export function getTotalWidth(positions: LetterPosition[]): number {
  if (positions.length === 0) return 0;
  const last = positions[positions.length - 1];
  return last.x + last.width;
}
