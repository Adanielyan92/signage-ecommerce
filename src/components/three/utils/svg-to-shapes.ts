import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

export interface ParsedSvgShapes {
  shapes: THREE.Shape[];
  boundingBox: THREE.Box2;
  originalWidth: number;
  originalHeight: number;
}

/**
 * Parse an SVG string into Three.js Shape objects.
 * Handles <path>, <rect>, <circle>, <polygon>, <ellipse> elements.
 * Returns shapes normalized to center origin with bounding box info.
 */
export function parseSvgToShapes(svgString: string): ParsedSvgShapes {
  const loader = new SVGLoader();
  const svgData = loader.parse(svgString);

  const allShapes: THREE.Shape[] = [];
  const box = new THREE.Box2();

  for (const path of svgData.paths) {
    const shapes = SVGLoader.createShapes(path);
    for (const shape of shapes) {
      allShapes.push(shape);
      // Expand bounding box from shape points
      const pts = shape.getPoints(32);
      for (const pt of pts) {
        box.expandByPoint(pt);
      }
    }
  }

  const size = new THREE.Vector2();
  box.getSize(size);

  // Center all shapes at origin
  const center = new THREE.Vector2();
  box.getCenter(center);
  for (const shape of allShapes) {
    shape.curves.forEach((curve) => {
      if ("v1" in curve && curve.v1 instanceof THREE.Vector2) {
        curve.v1.sub(center);
      }
      if ("v2" in curve && curve.v2 instanceof THREE.Vector2) {
        curve.v2.sub(center);
      }
      if ("v" in curve && curve.v instanceof THREE.Vector2) {
        (curve as unknown as THREE.LineCurve).v1.sub(center);
        (curve as unknown as THREE.LineCurve).v2.sub(center);
      }
    });
    shape.currentPoint.sub(center);
  }

  return {
    shapes: allShapes,
    boundingBox: box,
    originalWidth: size.x,
    originalHeight: size.y,
  };
}

/**
 * Scale shapes to fit within target width/height (in inches).
 * Returns a new set of shapes (does not mutate originals).
 */
export function scaleShapesToFit(
  shapes: THREE.Shape[],
  originalWidth: number,
  originalHeight: number,
  targetWidth: number,
  targetHeight: number,
): THREE.Shape[] {
  const scaleX = targetWidth / originalWidth;
  const scaleY = targetHeight / originalHeight;
  const uniformScale = Math.min(scaleX, scaleY);

  return shapes.map((shape) => {
    const cloned = shape.clone();
    // Scale all points
    const pts = cloned.getPoints();
    // Rebuild shape from scaled points
    const scaled = new THREE.Shape();
    if (pts.length > 0) {
      scaled.moveTo(pts[0].x * uniformScale, pts[0].y * uniformScale);
      for (let i = 1; i < pts.length; i++) {
        scaled.lineTo(pts[i].x * uniformScale, pts[i].y * uniformScale);
      }
    }
    // Copy holes
    for (const hole of cloned.holes) {
      const holePts = hole.getPoints();
      const scaledHole = new THREE.Path();
      if (holePts.length > 0) {
        scaledHole.moveTo(holePts[0].x * uniformScale, holePts[0].y * uniformScale);
        for (let i = 1; i < holePts.length; i++) {
          scaledHole.lineTo(holePts[i].x * uniformScale, holePts[i].y * uniformScale);
        }
      }
      scaled.holes.push(scaledHole);
    }
    return scaled;
  });
}
