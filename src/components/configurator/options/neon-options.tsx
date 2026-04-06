"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useConfiguratorStore } from "@/stores/configurator-store";
import { FONT_CSS_MAP } from "@/engine/font-map";
import { validateTextInput, validateHeight } from "@/lib/validation";
import type { FontStyle } from "@/types/product";
import { Separator } from "@/components/ui/separator";

const NEON_COLOR_SWATCHES: Record<string, string> = {
  "warm-white": "#FFD4A0",
  "cool-white": "#E3EEFF",
  pink: "#FF69B4",
  red: "#FF0000",
  blue: "#0066FF",
  green: "#00FF00",
  rgb: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
};

const NEON_COLOR_LABELS: Record<string, string> = {
  "warm-white": "Warm White",
  "cool-white": "Cool White",
  pink: "Pink",
  red: "Red",
  blue: "Blue",
  green: "Green",
  rgb: "RGB Color",
};

const NEON_COLORS = [
  "warm-white",
  "cool-white",
  "pink",
  "red",
  "blue",
  "green",
  "rgb",
] as const;

const FONT_OPTIONS: FontStyle[] = [
  "Standard",
  "Curved",
  "Bebas Neue",
  "Montserrat",
  "Oswald",
  "Playfair Display",
  "Raleway",
  "Poppins",
  "Anton",
  "Permanent Marker",
  "Righteous",
  "Abril Fatface",
  "Passion One",
  "Russo One",
  "Black Ops One",
];

const BACKER_OPTIONS = [
  { value: "clear-acrylic", label: "Clear Acrylic" },
  { value: "black-acrylic", label: "Black Acrylic" },
  { value: "none", label: "None" },
] as const;

const BACKER_SHAPE_OPTIONS = [
  { value: "rectangular", label: "Rectangular" },
  { value: "contour", label: "Contour" },
] as const;

export function NeonOptions() {
  const config = useConfiguratorStore((s) => s.neonConfig);
  const updateCategoryConfig = useConfiguratorStore(
    (s) => s.updateCategoryConfig
  );

  // Debounced text input (300ms)
  const [localText, setLocalText] = useState(config.text);
  const textTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const prevStoreText = useRef(config.text);

  // Sync local text when store changes externally
  if (prevStoreText.current !== config.text) {
    prevStoreText.current = config.text;
    setLocalText(config.text);
  }

  const handleTextChange = useCallback(
    (value: string) => {
      setLocalText(value);
      clearTimeout(textTimerRef.current);
      textTimerRef.current = setTimeout(
        () => updateCategoryConfig("text", value),
        300
      );
    },
    [updateCategoryConfig]
  );

  useEffect(() => {
    return () => clearTimeout(textTimerRef.current);
  }, []);

  const textErrors = localText.length > 0 ? validateTextInput(localText) : [];
  const heightErrors = validateHeight(config.height);

  return (
    <div className="space-y-6">
      {/* Text Input */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Sign Text
        </label>
        <input
          type="text"
          value={localText}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Enter your neon text..."
          className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        {textErrors.length > 0 && (
          <p className="mt-1 text-xs text-red-500">{textErrors[0].message}</p>
        )}
      </div>

      {/* Height */}
      <div>
        <label className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-neutral-500">
          <span>Letter Height</span>
          <span className="text-sm font-bold text-neutral-900">
            {config.height}&quot;
          </span>
        </label>
        <input
          type="range"
          min={6}
          max={48}
          step={1}
          value={config.height}
          onChange={(e) =>
            updateCategoryConfig("height", Number(e.target.value))
          }
          className="w-full accent-blue-600"
        />
        <div className="mt-1 flex justify-between text-[10px] text-neutral-400">
          <span>6&quot;</span>
          <span>48&quot;</span>
        </div>
        {heightErrors.length > 0 && (
          <p className="mt-1 text-xs text-red-500">{heightErrors[0].message}</p>
        )}
      </div>

      <Separator />

      {/* Font Style Grid */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Font Style
        </label>
        <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto pr-1">
          {FONT_OPTIONS.map((font) => (
            <button
              key={font}
              onClick={() => updateCategoryConfig("font", font)}
              className={`rounded-lg border px-3 py-2 text-left transition ${
                config.font === font
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
              }`}
            >
              <span
                className="block truncate text-sm"
                style={{ fontFamily: FONT_CSS_MAP[font] || "inherit" }}
              >
                {localText || "Abc"}
              </span>
              <span className="mt-0.5 block truncate text-[10px] text-neutral-400">
                {font}
              </span>
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Neon Color */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Neon Color
        </label>
        <div className="grid grid-cols-2 gap-2">
          {NEON_COLORS.map((color) => (
            <button
              key={color}
              onClick={() => updateCategoryConfig("neonColor", color)}
              className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                config.neonColor === color
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
              }`}
            >
              <span
                className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-neutral-300"
                style={{ background: NEON_COLOR_SWATCHES[color] }}
              />
              {NEON_COLOR_LABELS[color]}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Backer */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Backer
        </label>
        <div className="flex gap-2">
          {BACKER_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateCategoryConfig("backer", opt.value)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                config.backer === opt.value
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <Separator />

      {/* Backer Shape */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Backer Shape
        </label>
        <div className="flex gap-2">
          {BACKER_SHAPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateCategoryConfig("backerShape", opt.value)}
              className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                config.backerShape === opt.value
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
