"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useConfiguratorStore } from "@/stores/configurator-store";
import { dimensionalProducts } from "@/engine/product-definitions";
import { FONT_CSS_MAP } from "@/engine/font-map";
import type {
  DimensionalLetterType,
  FontStyle,
  PaintingOption,
} from "@/types/product";
import { validateTextInput, validateHeight } from "@/lib/validation";

const FONT_OPTIONS: { value: FontStyle; label: string }[] = [
  { value: "Standard", label: "Standard (Roboto)" },
  { value: "Curved", label: "Curved (Lobster)" },
  { value: "Bebas Neue", label: "Bebas Neue" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Oswald", label: "Oswald" },
  { value: "Playfair Display", label: "Playfair Display" },
  { value: "Raleway", label: "Raleway" },
  { value: "Poppins", label: "Poppins" },
  { value: "Anton", label: "Anton" },
  { value: "Permanent Marker", label: "Permanent Marker" },
  { value: "Righteous", label: "Righteous" },
  { value: "Abril Fatface", label: "Abril Fatface" },
  { value: "Passion One", label: "Passion One" },
  { value: "Russo One", label: "Russo One" },
  { value: "Black Ops One", label: "Black Ops One" },
];

const THICKNESS_OPTIONS = [
  { value: "0.5", label: '0.5"' },
  { value: "1", label: '1"' },
  { value: "1.5", label: '1.5"' },
  { value: "2", label: '2"' },
] as const;

const MOUNTING_OPTIONS = [
  { value: "stud", label: "Stud Mount" },
  { value: "tape", label: "Tape Mount" },
  { value: "standoff", label: "Standoff Mount" },
] as const;

const PAINTING_OPTIONS: { value: PaintingOption; label: string }[] = [
  { value: "-", label: "None" },
  { value: "Painted", label: "Painted" },
  { value: "Painted Multicolor", label: "Painted Multicolor" },
];

interface DimensionalOptionsProps {
  wizardStep: number | null;
}

export function DimensionalOptions({ wizardStep }: DimensionalOptionsProps) {
  const config = useConfiguratorStore((s) => s.dimensionalConfig);
  const updateCategoryConfig = useConfiguratorStore(
    (s) => s.updateCategoryConfig
  );

  // Debounced text input (300ms)
  const [localText, setLocalText] = useState(config.text);
  const textTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const prevStoreText = useRef(config.text);

  // Sync local text when store changes externally
  // eslint-disable-next-line react-hooks/refs -- standard pattern for syncing external state
  if (prevStoreText.current !== config.text) {
    prevStoreText.current = config.text; // eslint-disable-line react-hooks/refs
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

  const showAll = wizardStep === null;

  return (
    <div className="space-y-6">
      {/* Step 0: Type */}
      {(showAll || wizardStep === 0) && (
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Letter Material
          </label>
          <div className="grid grid-cols-2 gap-2">
            {dimensionalProducts.map((p) => (
              <button
                key={p.slug}
                onClick={() =>
                  updateCategoryConfig(
                    "productType",
                    p.slug as DimensionalLetterType
                  )
                }
                className={`rounded-lg border px-3 py-2 text-left text-xs font-medium transition ${
                  config.productType === p.slug
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Text & Font */}
      {(showAll || wizardStep === 1) && (
        <>
          {/* Text Input */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Sign Text
            </label>
            <input
              type="text"
              value={localText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Enter your sign text..."
              className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {textErrors.length > 0 && (
              <p className="mt-1 text-xs text-red-500">{textErrors[0].message}</p>
            )}
          </div>

          {/* Font */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Font Style
            </label>
            <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto pr-1">
              {FONT_OPTIONS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => updateCategoryConfig("font", f.value)}
                  className={`rounded-lg border px-3 py-2 text-left transition ${
                    config.font === f.value
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                  }`}
                >
                  <span
                    className="block truncate text-sm"
                    style={{
                      fontFamily: FONT_CSS_MAP[f.value] || "inherit",
                    }}
                  >
                    {localText || "Abc"}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] text-neutral-400">
                    {f.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Step 2: Size — Height + Thickness */}
      {(showAll || wizardStep === 2) && (
        <>
          {/* Height Slider */}
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
              max={72}
              step={1}
              value={config.height}
              onChange={(e) =>
                updateCategoryConfig("height", Number(e.target.value))
              }
              className="w-full accent-blue-600"
            />
            <div className="mt-1 flex justify-between text-[10px] text-neutral-400">
              <span>6&quot;</span>
              <span>72&quot;</span>
            </div>
            {heightErrors.length > 0 && (
              <p className="mt-1 text-xs text-red-500">{heightErrors[0].message}</p>
            )}
          </div>

          {/* Thickness */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Thickness
            </label>
            <div className="flex gap-2">
              {THICKNESS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateCategoryConfig("thickness", opt.value)}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                    config.thickness === opt.value
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Step 3: Style & Color — Painting, Mounting */}
      {(showAll || wizardStep === 3) && (
        <>
          {/* Painting */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Painting
            </label>
            <select
              value={config.painting}
              onChange={(e) =>
                updateCategoryConfig("painting", e.target.value as PaintingOption)
              }
              className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {PAINTING_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Painting Colors (conditional) */}
          {config.painting === "Painted Multicolor" && (
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Number of Colors
              </label>
              <input
                type="number"
                min={1}
                max={10}
                value={config.paintingColors}
                onChange={(e) =>
                  updateCategoryConfig(
                    "paintingColors",
                    Math.max(1, Math.min(10, Number(e.target.value)))
                  )
                }
                className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          )}

          {/* Mounting */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Mounting
            </label>
            <div className="flex gap-2">
              {MOUNTING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateCategoryConfig("mounting", opt.value)}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                    config.mounting === opt.value
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
