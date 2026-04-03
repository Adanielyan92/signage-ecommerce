declare module "opentype.js" {
  export interface Glyph {
    index: number;
    name: string;
    advanceWidth: number;
    getPath(x: number, y: number, fontSize: number): Path;
  }

  export interface Path {
    commands: PathCommand[];
  }

  export interface PathCommand {
    type: "M" | "L" | "Q" | "C" | "Z";
    x?: number;
    y?: number;
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
  }

  export interface Font {
    unitsPerEm: number;
    names: { fontFamily: { en: string } };
    charToGlyph(char: string): Glyph;
    getKerningValue(left: Glyph, right: Glyph): number;
    getPath(text: string, x: number, y: number, fontSize: number): Path;
  }

  export function load(url: string): Promise<Font>;
  export function load(
    url: string,
    callback: (err: Error | null, font?: Font) => void
  ): void;

  const opentype: {
    load: typeof load;
    Font: Font;
  };
  export default opentype;
}
