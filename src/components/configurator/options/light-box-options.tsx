"use client";

import { useConfiguratorStore } from "@/stores/configurator-store";
import { lightBoxProducts } from "@/engine/product-definitions";
import type { LightBoxType, LEDColor } from "@/types/product";
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

const DEPTH_OPTIONS = ["4", "5", "6"] as const;

const FACE_TYPE_OPTIONS = [
  { value: "translucent", label: "Translucent" },
  { value: "push-through", label: "Push-Through" },
] as const;

const SHAPE_OPTIONS = [
  { value: "rectangular", label: "Rectangular" },
  { value: "round", label: "Round" },
] as const;

const MOUNTING_OPTIONS = [
  { value: "wall", label: "Wall" },
  { value: "hanging", label: "Hanging" },
] as const;

interface LightBoxOptionsProps {
  wizardStep: number | null;
}

export function LightBoxOptions({ wizardStep }: LightBoxOptionsProps) {
  const config = useConfiguratorStore((s) => s.lightBoxConfig);
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
            Light Box Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {lightBoxProducts.map((p) => (
              <button
                key={p.slug}
                onClick={() =>
                  updateCategoryConfig(
                    "productType",
                    p.slug as LightBoxType
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

      {/* Step 1: Text & Font — Light boxes have no text */}
      {wizardStep === 1 && (
        <div className="rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-6 text-center">
          <p className="text-sm text-neutral-600">
            Light box signs don&apos;t require text input. Continue to the next step to set dimensions.
          </p>
        </div>
      )}

      {/* Step 2: Size — Dimensions + Depth */}
      {(showAll || wizardStep === 2) && (
        <>
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

      {/* Step 3: Style & Color — LED, Face Type, Shape, Mounting */}
      {(showAll || wizardStep === 3) && (
        <>
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

          {/* Face Type */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Face Type
            </label>
            <div className="flex gap-2">
              {FACE_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateCategoryConfig("faceType", opt.value)}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                    config.faceType === opt.value
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Shape */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Shape
            </label>
            <div className="flex gap-2">
              {SHAPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateCategoryConfig("shape", opt.value)}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                    config.shape === opt.value
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

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
