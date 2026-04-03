import { useState, useEffect, useRef } from "react";
import type { Font } from "opentype.js";
import { loadFontClient } from "../utils/font-loader";

export function useFont(fontName: string): Font | null {
  const [font, setFont] = useState<Font | null>(null);
  const prevFontName = useRef(fontName);

  // Reset font when name changes (outside effect to avoid lint warning)
  // eslint-disable-next-line react-hooks/refs -- standard pattern for syncing external state
  if (prevFontName.current !== fontName) {
    prevFontName.current = fontName; // eslint-disable-line react-hooks/refs
    setFont(null);
  }

  useEffect(() => {
    let cancelled = false;
    loadFontClient(fontName).then((f) => {
      if (!cancelled) setFont(f);
    });
    return () => {
      cancelled = true;
    };
  }, [fontName]);

  return font;
}
