"use client";

import { useConfiguratorStore } from "@/stores/configurator-store";
import { logoProducts } from "@/engine/product-definitions";
import type { LogoType, LEDColor, PaintingOption } from "@/types/product";
import { Separator } from "@/components/ui/separator";

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

const DEPTH_OPTIONS = [
  { value: '2"', label: '2"' },
  { value: '3"', label: '3"' },
  { value: '4"', label: '4"' },
  { value: '5"', label: '5"' },
] as const;

const PAINTING_OPTIONS: { value: PaintingOption; label: string }[] = [
  { value: "-", label: "None" },
  { value: "Painted", label: "Painted" },
  { value: "Painted Multicolor", label: "Painted Multicolor" },
];

export function LogoOptions() {
  const config = useConfiguratorStore((s) => s.logoConfig);
  const updateCategoryConfig = useConfiguratorStore(
    (s) => s.updateCategoryConfig
  );

  const isLit = config.productType === "lit-logo";

  return (
    <div className="space-y-6">
      {/* Product Type Selector */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Logo Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {logoProducts.map((p) => (
            <button
              key={p.slug}
              onClick={() =>
                updateCategoryConfig("productType", p.slug as LogoType)
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

      <Separator />

      {/* Dimensions */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Dimensions
        </label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-neutral-500">
              Width (inches)
            </label>
            <input
              type="number"
              min={6}
              max={120}
              value={config.widthInches}
              onChange={(e) =>
                updateCategoryConfig(
                  "widthInches",
                  Math.max(6, Math.min(120, Number(e.target.value)))
                )
              }
              className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-neutral-500">
              Height (inches)
            </label>
            <input
              type="number"
              min={6}
              max={120}
              value={config.heightInches}
              onChange={(e) =>
                updateCategoryConfig(
                  "heightInches",
                  Math.max(6, Math.min(120, Number(e.target.value)))
                )
              }
              className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* LED Color (only for lit-logo) */}
      {isLit && (
        <>
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

          <Separator />
        </>
      )}

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

      <Separator />

      {/* Depth */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Depth
        </label>
        <div className="flex gap-2">
          {DEPTH_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateCategoryConfig("depth", opt.value)}
              className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                config.depth === opt.value
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
