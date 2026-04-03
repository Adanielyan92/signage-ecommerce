import * as THREE from "three";
import type { PathCommand } from "opentype.js";

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
  const shapes = shapePath.toShapes(true);

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
