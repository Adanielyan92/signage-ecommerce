import opentype, { type Font } from "opentype.js";
import { FONT_FILE_MAP } from "@/engine/font-map";

const fontCache = new Map<string, Font>();
const loadingPromises = new Map<string, Promise<Font>>();

/**
 * Load a font via HTTP (client-side) or file path (server-side).
 * Results are cached, and concurrent loads are deduplicated.
 */
export async function loadFontClient(fontName: string): Promise<Font> {
  const cached = fontCache.get(fontName);
  if (cached) return cached;

  const existing = loadingPromises.get(fontName);
  if (existing) return existing;

  const filename = FONT_FILE_MAP[fontName] || FONT_FILE_MAP["Standard"];
  const url = `/fonts/${filename}`;

  const promise = opentype.load(url).then((font) => {
    fontCache.set(fontName, font);
    loadingPromises.delete(fontName);
    return font;
  });

  loadingPromises.set(fontName, promise);
  return promise;
}
