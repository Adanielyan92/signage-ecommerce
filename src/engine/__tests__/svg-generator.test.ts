// src/engine/__tests__/svg-generator.test.ts
import { generateSvgCutFile, type SvgGeneratorInput } from "../svg-generator";

const defaultInput: SvgGeneratorInput = {
  text: "HELLO",
  fontName: "Standard",
  heightInches: 12,
  letterSpacingInches: 0.5,
};

describe("generateSvgCutFile", () => {
  it("returns valid SVG string with xml header", async () => {
    const svg = await generateSvgCutFile(defaultInput);
    expect(svg).toContain('<?xml version="1.0"');
    expect(svg).toContain("<svg");
    expect(svg).toContain("</svg>");
  });

  it("contains one <path> per non-space character", async () => {
    const svg = await generateSvgCutFile(defaultInput);
    const pathMatches = svg.match(/<path /g);
    // HELLO = 5 characters, each gets at least one path
    expect(pathMatches).not.toBeNull();
    expect(pathMatches!.length).toBeGreaterThanOrEqual(5);
  });

  it("uses inches as the SVG unit (viewBox scaled to real dimensions)", async () => {
    const svg = await generateSvgCutFile(defaultInput);
    // viewBox should contain the height in inches
    const viewBoxMatch = svg.match(/viewBox="([^"]+)"/);
    expect(viewBoxMatch).not.toBeNull();
    const parts = viewBoxMatch![1].split(" ").map(Number);
    const svgHeight = parts[3]; // viewBox="0 0 width height"
    // Height includes 0.5in padding on each side, so 12 + 1 = 13
    expect(svgHeight).toBeCloseTo(13, 0);
  });

  it("returns empty SVG for empty text", async () => {
    const svg = await generateSvgCutFile({ ...defaultInput, text: "" });
    expect(svg).toContain("<svg");
    expect(svg).not.toContain("<path");
  });

  it("strips spaces from text", async () => {
    const svg = await generateSvgCutFile({ ...defaultInput, text: "H E L" });
    const pathMatches = svg.match(/<path /g);
    expect(pathMatches!.length).toBeGreaterThanOrEqual(3);
  });

  it("sets each path with a unique id based on character index", async () => {
    const svg = await generateSvgCutFile(defaultInput);
    expect(svg).toContain('id="letter-0"');
    expect(svg).toContain('id="letter-4"');
  });

  it("includes dimension metadata as data attributes", async () => {
    const svg = await generateSvgCutFile(defaultInput);
    expect(svg).toContain('data-height-inches="12"');
    expect(svg).toContain('data-font="Standard"');
  });

  it("works with curved font", async () => {
    const svg = await generateSvgCutFile({
      ...defaultInput,
      fontName: "Curved",
    });
    expect(svg).toContain("<path");
  });
});
