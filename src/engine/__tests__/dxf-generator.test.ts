// src/engine/__tests__/dxf-generator.test.ts
import { generateDxfFromSvgPaths, parseSvgPathToSegments, type DxfOptions } from "../dxf-generator";

describe("parseSvgPathToSegments", () => {
  it("parses M and L commands into line segments", () => {
    const segments = parseSvgPathToSegments("M 0 0 L 10 0 L 10 10 L 0 10 Z");
    // M0,0 -> L10,0 -> L10,10 -> L0,10 -> Z (close to 0,0)
    // Produces 4 line segments
    expect(segments.length).toBe(4);
    expect(segments[0]).toEqual({ type: "line", x1: 0, y1: 0, x2: 10, y2: 0 });
    expect(segments[1]).toEqual({ type: "line", x1: 10, y1: 0, x2: 10, y2: 10 });
    expect(segments[2]).toEqual({ type: "line", x1: 10, y1: 10, x2: 0, y2: 10 });
    expect(segments[3]).toEqual({ type: "line", x1: 0, y1: 10, x2: 0, y2: 0 }); // close
  });

  it("parses Q (quadratic bezier) commands", () => {
    const segments = parseSvgPathToSegments("M 0 0 Q 5 10 10 0");
    expect(segments.length).toBe(1);
    expect(segments[0].type).toBe("quadratic");
  });

  it("parses C (cubic bezier) commands", () => {
    const segments = parseSvgPathToSegments("M 0 0 C 2 8 8 8 10 0");
    expect(segments.length).toBe(1);
    expect(segments[0].type).toBe("cubic");
  });

  it("returns empty array for empty path", () => {
    expect(parseSvgPathToSegments("")).toEqual([]);
  });
});

describe("generateDxfFromSvgPaths", () => {
  it("generates valid DXF with header and entities", () => {
    const dxf = generateDxfFromSvgPaths(
      [{ id: "letter-0", d: "M 0 0 L 10 0 L 10 12 L 0 12 Z" }],
      { unitInches: true }
    );
    expect(dxf).toContain("SECTION");
    expect(dxf).toContain("HEADER");
    expect(dxf).toContain("ENTITIES");
    expect(dxf).toContain("LINE");
    expect(dxf).toContain("EOF");
  });

  it("produces LINE entities for each line segment", () => {
    const dxf = generateDxfFromSvgPaths(
      [{ id: "letter-0", d: "M 0 0 L 5 0 L 5 5 Z" }],
      { unitInches: true }
    );
    // 3 line segments: 0,0->5,0  5,0->5,5  5,5->0,0
    const lineMatches = dxf.match(/^LINE$/gm);
    expect(lineMatches).not.toBeNull();
    expect(lineMatches!.length).toBe(3);
  });

  it("converts cubic beziers to SPLINE entities", () => {
    const dxf = generateDxfFromSvgPaths(
      [{ id: "letter-0", d: "M 0 0 C 2 8 8 8 10 0" }],
      { unitInches: true }
    );
    expect(dxf).toContain("SPLINE");
  });

  it("handles multiple paths (multiple letters)", () => {
    const dxf = generateDxfFromSvgPaths(
      [
        { id: "letter-0", d: "M 0 0 L 5 0 L 5 10 Z" },
        { id: "letter-1", d: "M 10 0 L 15 0 L 15 10 Z" },
      ],
      { unitInches: true }
    );
    const lineMatches = dxf.match(/^LINE$/gm);
    expect(lineMatches!.length).toBe(6); // 3 per letter
  });

  it("includes layer per letter when layerPerLetter is true", () => {
    const dxf = generateDxfFromSvgPaths(
      [
        { id: "letter-0", d: "M 0 0 L 5 0 Z" },
        { id: "letter-1", d: "M 10 0 L 15 0 Z" },
      ],
      { unitInches: true, layerPerLetter: true }
    );
    expect(dxf).toContain("letter-0");
    expect(dxf).toContain("letter-1");
  });

  it("returns empty DXF for no paths", () => {
    const dxf = generateDxfFromSvgPaths([], { unitInches: true });
    expect(dxf).toContain("SECTION");
    expect(dxf).toContain("EOF");
    expect(dxf).not.toContain("LINE");
  });
});
