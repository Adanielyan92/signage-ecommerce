"use client";

import { useConfiguratorStore } from "@/stores/configurator-store";
import { cabinetProducts } from "@/engine/product-definitions";
import type { CabinetSignType, LEDColor } from "@/types/product";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
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

const MOUNTING_OPTIONS = [
  { value: "wall", label: "Wall" },
  { value: "pole", label: "Pole" },
  { value: "roof", label: "Roof" },
] as const;

export function CabinetOptions() {
  const config = useConfiguratorStore((s) => s.cabinetConfig);
  const updateCategoryConfig = useConfiguratorStore(
    (s) => s.updateCategoryConfig
  );

  const widthErrors = validateWidth(config.widthInches);
  const heightErrors = validateHeight(config.heightInches);

  return (
    <div className="space-y-6">
      {/* Product Type Selector */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Cabinet Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {cabinetProducts.map((p) => (
            <button
              key={p.slug}
              onClick={() =>
                updateCategoryConfig(
                  "productType",
                  p.slug as CabinetSignType
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
              min={24}
              max={120}
              value={config.widthInches}
              onChange={(e) =>
                updateCategoryConfig(
                  "widthInches",
                  Math.max(24, Math.min(120, Number(e.target.value)))
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

      <Separator />

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

      <Separator />

      {/* Printed Face */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Printed Face
        </label>
        <Switch
          checked={config.printedFace}
          onCheckedChange={(checked: boolean) =>
            updateCategoryConfig("printedFace", checked)
          }
        />
      </div>

      <Separator />

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
    </div>
  );
}
