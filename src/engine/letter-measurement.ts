/**
 * Server-compatible text measurement using opentype.js.
 * Replaces DOM-based canvas.measureText() approach from the original codebase.
 *
 * On the client, the 3D renderer (Three.js ExtrudeGeometry bounding boxes)
 * provides exact measurements. This module is used for:
 *   - Server-side price validation
 *   - Initial estimates before 3D scene loads
 */

import opentype, { type Font } from "opentype.js";
import path from "path";
import { FONT_FILE_MAP } from "@/engine/font-map";

const fontCache = new Map<string, Font>();

/**
 * Load a font from public/fonts/ directory. Results are cached.
 */
export async function loadFont(fontName: string): Promise<Font> {
  const cached = fontCache.get(fontName);
  if (cached) return cached;

  const filename = FONT_FILE_MAP[fontName] || FONT_FILE_MAP["Standard"];
  const fontPath = path.join(process.cwd(), "public", "fonts", filename);

  const font = await opentype.load(fontPath);
  fontCache.set(fontName, font);
  return font;
}

/**
 * Measure the width of each individual character in the given text.
 * Returns widths in inches, matching the unit system of the 3D renderer.
 */
export async function measureLetterWidths(
  text: string,
  heightInches: number,
  fontName: string
): Promise<number[]> {
  const font = await loadFont(fontName);
  const textNoSpace = text.replace(/\s+/g, "");
  const scale = heightInches / font.unitsPerEm;

  return Array.from(textNoSpace).map((char) => {
    const glyph = font.charToGlyph(char);
    const advanceWidth = (glyph.advanceWidth || font.unitsPerEm * 0.6) * scale;
    return advanceWidth;
  });
}

/**
 * Measure total text width in inches.
 * Includes kerning between character pairs.
 */
export async function measureTextWidth(
  text: string,
  heightInches: number,
  fontName: string
): Promise<number> {
  const font = await loadFont(fontName);
  const textNoSpace = text.replace(/\s+/g, "");
  const scale = heightInches / font.unitsPerEm;

  let totalWidth = 0;

  for (let i = 0; i < textNoSpace.length; i++) {
    const glyph = font.charToGlyph(textNoSpace[i]);
    const advanceWidth = (glyph.advanceWidth || font.unitsPerEm * 0.6) * scale;
    totalWidth += advanceWidth;

    // Add kerning between this character and next
    if (i < textNoSpace.length - 1) {
      const nextGlyph = font.charToGlyph(textNoSpace[i + 1]);
      const kerning = font.getKerningValue(glyph, nextGlyph) * scale;
      totalWidth += kerning;
    }
  }

  return totalWidth;
}
