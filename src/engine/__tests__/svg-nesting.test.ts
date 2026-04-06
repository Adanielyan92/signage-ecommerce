// src/engine/__tests__/svg-nesting.test.ts
import {
  nestLettersOnSheet,
  type NestingInput,
  type NestingResult,
} from "../svg-nesting";

const defaultInput: NestingInput = {
  letters: [
    { id: "letter-0", char: "H", widthInches: 7.0, heightInches: 12, svgPathData: "M 0 0 L 7 0 L 7 12 L 0 12 Z" },
    { id: "letter-1", char: "E", widthInches: 6.0, heightInches: 12, svgPathData: "M 0 0 L 6 0 L 6 12 L 0 12 Z" },
    { id: "letter-2", char: "L", widthInches: 5.5, heightInches: 12, svgPathData: "M 0 0 L 5.5 0 L 5.5 12 L 0 12 Z" },
    { id: "letter-3", char: "L", widthInches: 5.5, heightInches: 12, svgPathData: "M 0 0 L 5.5 0 L 5.5 12 L 0 12 Z" },
    { id: "letter-4", char: "O", widthInches: 7.5, heightInches: 12, svgPathData: "M 0 0 L 7.5 0 L 7.5 12 L 0 12 Z" },
  ],
  sheetWidthInches: 48,
  sheetHeightInches: 96,
  spacingInches: 0.25,
};

describe("nestLettersOnSheet", () => {
  it("returns placement positions for all letters", () => {
    const result = nestLettersOnSheet(defaultInput);
    expect(result.placements.length).toBe(5);
    for (const p of result.placements) {
      expect(typeof p.x).toBe("number");
      expect(typeof p.y).toBe("number");
      expect(typeof p.letterId).toBe("string");
    }
  });

  it("all letters fit within the sheet bounds", () => {
    const result = nestLettersOnSheet(defaultInput);
    for (const p of result.placements) {
      const letter = defaultInput.letters.find((l) => l.id === p.letterId)!;
      expect(p.x + letter.widthInches).toBeLessThanOrEqual(defaultInput.sheetWidthInches);
      expect(p.y + letter.heightInches).toBeLessThanOrEqual(defaultInput.sheetHeightInches);
    }
  });

  it("no two letters overlap (bounding box check)", () => {
    const result = nestLettersOnSheet(defaultInput);
    for (let i = 0; i < result.placements.length; i++) {
      for (let j = i + 1; j < result.placements.length; j++) {
        const a = result.placements[i];
        const b = result.placements[j];
        const aLetter = defaultInput.letters.find((l) => l.id === a.letterId)!;
        const bLetter = defaultInput.letters.find((l) => l.id === b.letterId)!;

        const overlapX =
          a.x < b.x + bLetter.widthInches + defaultInput.spacingInches &&
          a.x + aLetter.widthInches + defaultInput.spacingInches > b.x;
        const overlapY =
          a.y < b.y + bLetter.heightInches + defaultInput.spacingInches &&
          a.y + aLetter.heightInches + defaultInput.spacingInches > b.y;

        // They cannot overlap on BOTH axes simultaneously
        expect(overlapX && overlapY).toBe(false);
      }
    }
  });

  it("calculates material utilization percentage", () => {
    const result = nestLettersOnSheet(defaultInput);
    expect(typeof result.utilization).toBe("number");
    expect(result.utilization).toBeGreaterThan(0);
    expect(result.utilization).toBeLessThanOrEqual(100);
  });

  it("generates an SVG with nested layout", () => {
    const result = nestLettersOnSheet(defaultInput);
    expect(result.nestedSvg).toContain("<svg");
    expect(result.nestedSvg).toContain("</svg>");
    // Should contain the sheet outline
    expect(result.nestedSvg).toContain("<rect");
    // Should contain all 5 letters
    for (const letter of defaultInput.letters) {
      expect(result.nestedSvg).toContain(letter.id);
    }
  });

  it("returns sheetsNeeded count", () => {
    const result = nestLettersOnSheet(defaultInput);
    expect(result.sheetsNeeded).toBe(1);
  });

  it("handles large jobs requiring multiple sheets", () => {
    // 20 large letters on a small sheet
    const bigInput: NestingInput = {
      letters: Array.from({ length: 20 }, (_, i) => ({
        id: `letter-${i}`,
        char: "W",
        widthInches: 15,
        heightInches: 24,
        svgPathData: "M 0 0 L 15 0 L 15 24 L 0 24 Z",
      })),
      sheetWidthInches: 48,
      sheetHeightInches: 48,
      spacingInches: 0.25,
    };
    const result = nestLettersOnSheet(bigInput);
    expect(result.placements.length).toBe(20);
    expect(result.sheetsNeeded).toBeGreaterThanOrEqual(2);
  });

  it("handles empty letters array", () => {
    const result = nestLettersOnSheet({
      ...defaultInput,
      letters: [],
    });
    expect(result.placements).toEqual([]);
    expect(result.sheetsNeeded).toBe(0);
    expect(result.utilization).toBe(0);
  });
});
