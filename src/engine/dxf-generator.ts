// src/engine/dxf-generator.ts
/**
 * DXF (Drawing Exchange Format) generator.
 * Converts SVG path data (from svg-generator.ts) into DXF entities
 * that CNC machines and CAD software (AutoCAD, etc.) can read.
 *
 * Supports: LINE, SPLINE (for bezier curves).
 * DXF format: ASCII R12/R14 compatible.
 *
 * Isomorphic -- no DOM dependencies.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SvgPathInput {
  id: string;
  d: string;
}

export interface DxfOptions {
  /** If true, coordinates are in inches. Default true. */
  unitInches?: boolean;
  /** If true, each letter gets its own DXF layer. Default false. */
  layerPerLetter?: boolean;
}

export type PathSegment =
  | LineSegment
  | QuadraticSegment
  | CubicSegment;

export interface LineSegment {
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface QuadraticSegment {
  type: "quadratic";
  x1: number;
  y1: number;
  cx: number;
  cy: number;
  x2: number;
  y2: number;
}

export interface CubicSegment {
  type: "cubic";
  x1: number;
  y1: number;
  cx1: number;
  cy1: number;
  cx2: number;
  cy2: number;
  x2: number;
  y2: number;
}

// ---------------------------------------------------------------------------
// SVG path parser (minimal -- handles M, L, Q, C, Z with absolute coords)
// ---------------------------------------------------------------------------

export function parseSvgPathToSegments(d: string): PathSegment[] {
  if (!d || !d.trim()) return [];

  const segments: PathSegment[] = [];
  const tokens = tokenizeSvgPath(d);

  let curX = 0;
  let curY = 0;
  let startX = 0;
  let startY = 0;
  let i = 0;

  while (i < tokens.length) {
    const cmd = tokens[i];

    switch (cmd) {
      case "M": {
        curX = parseFloat(tokens[++i]);
        curY = parseFloat(tokens[++i]);
        startX = curX;
        startY = curY;
        i++;
        break;
      }
      case "L": {
        const x = parseFloat(tokens[++i]);
        const y = parseFloat(tokens[++i]);
        segments.push({ type: "line", x1: curX, y1: curY, x2: x, y2: y });
        curX = x;
        curY = y;
        i++;
        break;
      }
      case "Q": {
        const cx = parseFloat(tokens[++i]);
        const cy = parseFloat(tokens[++i]);
        const x = parseFloat(tokens[++i]);
        const y = parseFloat(tokens[++i]);
        segments.push({ type: "quadratic", x1: curX, y1: curY, cx, cy, x2: x, y2: y });
        curX = x;
        curY = y;
        i++;
        break;
      }
      case "C": {
        const cx1 = parseFloat(tokens[++i]);
        const cy1 = parseFloat(tokens[++i]);
        const cx2 = parseFloat(tokens[++i]);
        const cy2 = parseFloat(tokens[++i]);
        const x = parseFloat(tokens[++i]);
        const y = parseFloat(tokens[++i]);
        segments.push({
          type: "cubic",
          x1: curX,
          y1: curY,
          cx1,
          cy1,
          cx2,
          cy2,
          x2: x,
          y2: y,
        });
        curX = x;
        curY = y;
        i++;
        break;
      }
      case "Z":
      case "z": {
        if (curX !== startX || curY !== startY) {
          segments.push({ type: "line", x1: curX, y1: curY, x2: startX, y2: startY });
        }
        curX = startX;
        curY = startY;
        i++;
        break;
      }
      default:
        i++;
        break;
    }
  }

  return segments;
}

function tokenizeSvgPath(d: string): string[] {
  // Split on whitespace and commas, keeping command letters separate
  return d.match(/[a-zA-Z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? [];
}

// ---------------------------------------------------------------------------
// DXF generation
// ---------------------------------------------------------------------------

export function generateDxfFromSvgPaths(
  paths: SvgPathInput[],
  options: DxfOptions = {}
): string {
  const { layerPerLetter = false } = options;
  const lines: string[] = [];

  // HEADER section
  lines.push("0", "SECTION");
  lines.push("2", "HEADER");
  // Set units to inches (INSUNITS = 1 for inches)
  lines.push("9", "$INSUNITS");
  lines.push("70", "1");
  lines.push("0", "ENDSEC");

  // TABLES section (layers)
  if (layerPerLetter && paths.length > 0) {
    lines.push("0", "SECTION");
    lines.push("2", "TABLES");
    lines.push("0", "TABLE");
    lines.push("2", "LAYER");
    for (const p of paths) {
      lines.push("0", "LAYER");
      lines.push("2", p.id);
      lines.push("70", "0");
      lines.push("62", "7"); // white color
      lines.push("6", "CONTINUOUS");
    }
    lines.push("0", "ENDTAB");
    lines.push("0", "ENDSEC");
  }

  // ENTITIES section
  lines.push("0", "SECTION");
  lines.push("2", "ENTITIES");

  for (const path of paths) {
    const layer = layerPerLetter ? path.id : "0";
    const segments = parseSvgPathToSegments(path.d);

    for (const seg of segments) {
      switch (seg.type) {
        case "line":
          lines.push(...dxfLine(seg, layer));
          break;
        case "quadratic":
          // Convert quadratic to cubic for SPLINE compatibility
          lines.push(...dxfSplineCubic(quadraticToCubic(seg), layer));
          break;
        case "cubic":
          lines.push(...dxfSplineCubic(seg, layer));
          break;
      }
    }
  }

  lines.push("0", "ENDSEC");

  // EOF
  lines.push("0", "EOF");

  return lines.join("\n");
}

function dxfLine(seg: LineSegment, layer: string): string[] {
  return [
    "0", "LINE",
    "8", layer,
    "10", String(seg.x1),
    "20", String(seg.y1),
    "30", "0",
    "11", String(seg.x2),
    "21", String(seg.y2),
    "31", "0",
  ];
}

function dxfSplineCubic(seg: CubicSegment, layer: string): string[] {
  // DXF SPLINE entity for a single cubic bezier segment
  // Degree 3, 4 control points, knot vector [0,0,0,0,1,1,1,1]
  return [
    "0", "SPLINE",
    "8", layer,
    "70", "8",   // flag: planar
    "71", "3",   // degree
    "72", "8",   // number of knots
    "73", "4",   // number of control points
    // Knot values
    "40", "0",
    "40", "0",
    "40", "0",
    "40", "0",
    "40", "1",
    "40", "1",
    "40", "1",
    "40", "1",
    // Control points
    "10", String(seg.x1),
    "20", String(seg.y1),
    "30", "0",
    "10", String(seg.cx1),
    "20", String(seg.cy1),
    "30", "0",
    "10", String(seg.cx2),
    "20", String(seg.cy2),
    "30", "0",
    "10", String(seg.x2),
    "20", String(seg.y2),
    "30", "0",
  ];
}

/** Convert a quadratic bezier to a cubic bezier (exact conversion). */
function quadraticToCubic(seg: QuadraticSegment): CubicSegment {
  // Q(t) with control point P1 = cubic with:
  // CP1 = P0 + 2/3 * (P1 - P0)
  // CP2 = P2 + 2/3 * (P1 - P2)
  return {
    type: "cubic",
    x1: seg.x1,
    y1: seg.y1,
    cx1: seg.x1 + (2 / 3) * (seg.cx - seg.x1),
    cy1: seg.y1 + (2 / 3) * (seg.cy - seg.y1),
    cx2: seg.x2 + (2 / 3) * (seg.cx - seg.x2),
    cy2: seg.y2 + (2 / 3) * (seg.cy - seg.y2),
    x2: seg.x2,
    y2: seg.y2,
  };
}
