import * as THREE from "three";
import type { PathCommand } from "opentype.js";
import ClipperLib from "clipper-lib";

/**
 * Convert opentype path commands to a THREE.ShapePath.
 * opentype uses SVG-style commands: M, L, Q, C, Z.
 * Y-axis is flipped (opentype y-down -> Three.js y-up).
 */
function pathToShapePath(commands: PathCommand[]): THREE.ShapePath {
  const shapePath = new THREE.ShapePath();

  for (const cmd of commands) {
    switch (cmd.type) {
      case "M":
        shapePath.moveTo(cmd.x!, -cmd.y!);
        break;
      case "L":
        shapePath.lineTo(cmd.x!, -cmd.y!);
        break;
      case "Q":
        shapePath.quadraticCurveTo(cmd.x1!, -cmd.y1!, cmd.x!, -cmd.y!);
        break;
      case "C":
        shapePath.bezierCurveTo(
          cmd.x1!,
          -cmd.y1!,
          cmd.x2!,
          -cmd.y2!,
          cmd.x!,
          -cmd.y!
        );
        break;
      case "Z":
        if (shapePath.currentPath) {
          shapePath.currentPath.closePath();
        }
        break;
    }
  }

  return shapePath;
}

export interface GlyphGeometryOptions {
  depth: number;
  curveSegments: number;
  bevelEnabled: boolean;
  bevelThickness: number;
  bevelSize: number;
}

/**
 * Create an ExtrudeGeometry from opentype path commands.
 * Returns geometry with material groups:
 *   - Group 0: front/back faces
 *   - Group 1: side walls (extrusion)
 */
export function createGlyphGeometry(
  commands: PathCommand[],
  options: GlyphGeometryOptions
): THREE.ExtrudeGeometry | null {
  const shapePath = pathToShapePath(commands);

  // Apply clipper-lib boolean union to resolve self-intersecting loops and overlaps
  const SCALE = 10000;
  const clipperPaths: Array<Array<{ X: number; Y: number }>> = [];

  for (const subPath of shapePath.subPaths) {
    const points = subPath.getPoints(options.curveSegments || 12);
    if (points.length < 3) continue;

    const clipperPath = points.map((p) => ({
      X: Math.round(p.x * SCALE),
      Y: Math.round(p.y * SCALE),
    }));

    // Remove duplicate end point if getting a closed loop
    const first = clipperPath[0];
    const last = clipperPath[clipperPath.length - 1];
    if (first.X === last.X && first.Y === last.Y) {
      clipperPath.pop();
    }

    if (clipperPath.length > 2) {
      clipperPaths.push(clipperPath);
    }
  }

  if (clipperPaths.length === 0) return null;

  const clipper = new ClipperLib.Clipper();
  clipper.AddPaths(clipperPaths, ClipperLib.PolyType.ptSubject, true);

  const polyTree = new ClipperLib.PolyTree();
  // ExtrudeGeometry uses NonZero winding rule natively, as do most opentype fonts
  clipper.Execute(
    ClipperLib.ClipType.ctUnion,
    polyTree,
    ClipperLib.PolyFillType.pftNonZero,
    ClipperLib.PolyFillType.pftNonZero
  );

  const toThreePath = (contour: Array<{ X: number; Y: number }>, isHole: boolean) => {
    const path = isHole ? new THREE.Path() : new THREE.Shape();
    if (contour.length > 0) {
      path.moveTo(contour[0].X / SCALE, contour[0].Y / SCALE);
      for (let i = 1; i < contour.length; i++) {
        path.lineTo(contour[i].X / SCALE, contour[i].Y / SCALE);
      }
      path.closePath(); // Ensure it is explicitly closed inside Three.js
    }
    return path;
  };

  const shapes: THREE.Shape[] = [];
  const stack = [...polyTree.Childs()];

  while (stack.length > 0) {
    const outerNode = stack.pop()!;
    const contour = outerNode.Contour();
    if (contour.length < 3) continue;

    const shape = toThreePath(contour, false) as THREE.Shape;

    for (const holeNode of outerNode.Childs()) {
      const holeContour = holeNode.Contour();
      if (holeContour.length >= 3) {
        const hole = toThreePath(holeContour, true) as THREE.Path;
        shape.holes.push(hole);
      }
      // Any internal islands within the hole become new outer shapes
      for (const innerOuterNode of holeNode.Childs()) {
        stack.push(innerOuterNode);
      }
    }
    shapes.push(shape);
  }

  if (shapes.length === 0) return null;

  const geometry = new THREE.ExtrudeGeometry(shapes, {
    depth: options.depth,
    curveSegments: options.curveSegments,
    bevelEnabled: options.bevelEnabled,
    bevelThickness: options.bevelThickness,
    bevelSize: options.bevelSize,
    bevelSegments: 2,
  });

  return geometry;
}
