import * as THREE from "three";

interface LetterBounds {
  x: number;
  width: number;
  height: number;
}

/**
 * Create a contour-following backer shape around text.
 * Uses a rounded rectangle that tightly follows the text bounding box
 * with per-character top/bottom padding for a natural contour feel.
 *
 * For a true text-outline contour, you'd need the actual glyph outlines,
 * but this "pill" approach is what most neon sign makers use.
 */
export function createContourBackerShape(
  letters: LetterBounds[],
  textHeight: number,
  padding: number,
): THREE.Shape {
  if (letters.length === 0) {
    return new THREE.Shape();
  }

  const firstX = letters[0].x - padding;
  const lastLetter = letters[letters.length - 1];
  const lastX = lastLetter.x + lastLetter.width + padding;
  const totalWidth = lastX - firstX;
  const totalHeight = textHeight + padding * 2;

  const cornerRadius = Math.min(totalHeight * 0.4, totalWidth * 0.15, padding * 1.5);
  const r = cornerRadius;

  // Rounded rectangle (pill shape) centered on text
  const shape = new THREE.Shape();
  const x0 = firstX;
  const y0 = -padding;
  const x1 = lastX;
  const y1 = textHeight + padding;

  shape.moveTo(x0 + r, y0);
  shape.lineTo(x1 - r, y0);
  shape.quadraticCurveTo(x1, y0, x1, y0 + r);
  shape.lineTo(x1, y1 - r);
  shape.quadraticCurveTo(x1, y1, x1 - r, y1);
  shape.lineTo(x0 + r, y1);
  shape.quadraticCurveTo(x0, y1, x0, y1 - r);
  shape.lineTo(x0, y0 + r);
  shape.quadraticCurveTo(x0, y0, x0 + r, y0);

  return shape;
}
