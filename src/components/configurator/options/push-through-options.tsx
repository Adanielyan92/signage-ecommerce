"use client";

import { useConfiguratorStore } from "@/stores/configurator-store";
import { pushThroughProducts } from "@/engine/product-definitions";
import type { PushThroughType, LEDColor, FontStyle } from "@/types/product";
import { validateWidth, validateHeight } from "@/lib/validation";

const LED_SWATCHES: Record<string, string> = {
  "3000K": "#FFB46B",
  "3500K": "#FFC98E",
  "6000K": "#E3EEFF",
  Red: "#FF0000",
  Green: "#00FF00",
  Blue: "#0066FF",
  RGB: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
};

const LED_LABELS: Record<string, string> = {
  "3000K": "Warm White (3000K)",
  "3500K": "Neutral (3500K)",
  "6000K": "Cool White (6000K)",
  Red: "Red",
  Green: "Green",
  Blue: "Blue",
  RGB: "RGB Color",
};

const LED_OPTIONS: LEDColor[] = [
  "3000K",
  "3500K",
  "6000K",
  "Red",
  "Green",
  "Blue",
  "RGB",
];

const DEPTH_OPTIONS = ["3", "4", "5", "6"] as const;

const FACE_MATERIAL_OPTIONS = [
  { value: "acrylic-quarter", label: 'Acrylic 1/4"' },
  { value: "polycarbonate", label: "Polycarbonate" },
] as const;

const FRAME_FINISH_OPTIONS = [
  { value: "painted", label: "Painted" },
  { value: "brushed", label: "Brushed" },
  { value: "raw", label: "Raw" },
] as const;

const FONT_OPTIONS: { value: FontStyle; label: string }[] = [
  { value: "Standard", label: "Standard (Roboto)" },
  { value: "Curved", label: "Curved (Lobster)" },
  { value: "Bebas Neue", label: "Bebas Neue" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Oswald", label: "Oswald" },
  { value: "Playfair Display", label: "Playfair Display" },
  { value: "Raleway", label: "Raleway" },
  { value: "Poppins", label: "Poppins" },
];

interface PushThroughOptionsProps {
  wizardStep: number | null;
}

export function PushThroughOptions({ wizardStep }: PushThroughOptionsProps) {
  const config = useConfiguratorStore((s) => s.pushThroughConfig);
  const updateCategoryConfig = useConfiguratorStore(
    (s) => s.updateCategoryConfig
  );

  const widthErrors = validateWidth(config.widthInches);
  const heightErrors = validateHeight(config.heightInches);

  const showAll = wizardStep === null;

  return (
    <div className="space-y-6">
      {/* Step 0: Type */}
      {(showAll || wizardStep === 0) && (
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Push-Through Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {pushThroughProducts.map((p) => (
              <button
                key={p.slug}
                onClick={() =>
                  updateCategoryConfig(
                    "productType",
                    p.slug as PushThroughType
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
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Text
            </label>
            <input
              type="text"
              value={config.text}
              placeholder="Enter your text"
              onChange={(e) => updateCategoryConfig("text", e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Font
            </label>
            <select
              value={config.font}
              onChange={(e) =>
                updateCategoryConfig("font", e.target.value as FontStyle)
              }
              className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Letter Height (inches)
            </label>
            <input
              type="number"
              min={6}
              max={36}
              value={config.letterHeight}
              onChange={(e) =>
                updateCategoryConfig(
                  "letterHeight",
                  Math.max(6, Math.min(36, Number(e.target.value)))
                )
              }
              className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </>
      )}

      {/* Step 2: Size — Cabinet Dimensions + Depth */}
      {(showAll || wizardStep === 2) && (
        <>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Cabinet Dimensions
            </label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs text-neutral-500">
                  Width (inches)
                </label>
                <input
                  type="number"
                  min={12}
                  max={120}
                  value={config.widthInches}
                  onChange={(e) =>
                    updateCategoryConfig(
                      "widthInches",
                      Math.max(12, Math.min(120, Number(e.target.value)))
                    )
                  }
                  className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                {widthErrors.length > 0 && (
                  <p className="mt-1 text-xs text-red-500">{widthErrors[0].message}</p>
                )}
              </div>
              <div>
                <label className="mb-1 block text-xs text-neutral-500">
                  Height (inches)
                </label>
                <input
                  type="number"
                  min={12}
                  max={60}
                  value={config.heightInches}
                  onChange={(e) =>
                    updateCategoryConfig(
                      "heightInches",
                      Math.max(12, Math.min(60, Number(e.target.value)))
                    )
                  }
                  className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
                {heightErrors.length > 0 && (
                  <p className="mt-1 text-xs text-red-500">{heightErrors[0].message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Depth */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Depth
            </label>
            <div className="flex gap-2">
              {DEPTH_OPTIONS.map((d) => (
                <button
                  key={d}
                  onClick={() => updateCategoryConfig("depth", d)}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                    config.depth === d
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                  }`}
                >
                  {d}&quot;
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Step 3: Style — Face Material, LED, Frame Finish */}
      {(showAll || wizardStep === 3) && (
        <>
          {/* Face Material */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Face Material
            </label>
            <div className="flex gap-2">
              {FACE_MATERIAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() =>
                    updateCategoryConfig("faceMaterial", opt.value)
                  }
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    config.faceMaterial === opt.value
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* LED Color */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              LED Color
            </label>
            <div className="grid grid-cols-2 gap-2">
              {LED_OPTIONS.map((color) => (
                <button
                  key={color}
                  onClick={() => updateCategoryConfig("led", color)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                    config.led === color
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                  }`}
                >
                  <span
                    className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-neutral-300"
                    style={{ background: LED_SWATCHES[color] }}
                  />
                  {LED_LABELS[color]}
                </button>
              ))}
            </div>
          </div>

          {/* Frame Finish */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Frame Finish
            </label>
            <div className="flex gap-2">
              {FRAME_FINISH_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() =>
                    updateCategoryConfig("frameFinish", opt.value)
                  }
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    config.frameFinish === opt.value
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
