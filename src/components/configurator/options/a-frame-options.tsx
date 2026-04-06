"use client";

import { useConfiguratorStore } from "@/stores/configurator-store";
import { aFrameProducts } from "@/engine/product-definitions";
import type { AFrameType } from "@/types/product";
import { validateWidth, validateHeight } from "@/lib/validation";
import { Switch } from "@/components/ui/switch";

const MATERIAL_OPTIONS = [
  { value: "corrugated-plastic", label: "Corrugated Plastic" },
  { value: "aluminum", label: "Aluminum" },
  { value: "steel", label: "Steel" },
] as const;

const INSERT_OPTIONS = [
  { value: "printed-panel", label: "Printed Panel" },
  { value: "chalkboard", label: "Chalkboard" },
  { value: "dry-erase", label: "Dry-Erase" },
] as const;

const BASE_WEIGHT_OPTIONS = [
  { value: "none", label: "None" },
  { value: "water-fill", label: "Water-Fill" },
  { value: "sandbag", label: "Sandbag" },
] as const;

interface AFrameOptionsProps {
  wizardStep: number | null;
}

export function AFrameOptions({ wizardStep }: AFrameOptionsProps) {
  const config = useConfiguratorStore((s) => s.aFrameConfig);
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
            A-Frame Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {aFrameProducts.map((p) => (
              <button
                key={p.slug}
                onClick={() =>
                  updateCategoryConfig("productType", p.slug as AFrameType)
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

      {/* Step 1: Text & Font — A-frames have no text */}
      {wizardStep === 1 && (
        <div className="rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-6 text-center">
          <p className="text-sm text-neutral-600">
            A-frame signs don&apos;t require text input. Continue to the next step to set dimensions.
          </p>
        </div>
      )}

      {/* Step 2: Size — Dimensions */}
      {(showAll || wizardStep === 2) && (
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
                max={36}
                value={config.widthInches}
                onChange={(e) =>
                  updateCategoryConfig(
                    "widthInches",
                    Math.max(24, Math.min(36, Number(e.target.value)))
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
                min={36}
                max={48}
                value={config.heightInches}
                onChange={(e) =>
                  updateCategoryConfig(
                    "heightInches",
                    Math.max(36, Math.min(48, Number(e.target.value)))
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
      )}

      {/* Step 3: Style & Options — Material, Insert, Base Weight, Double-Sided */}
      {(showAll || wizardStep === 3) && (
        <>
          {/* Material */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Material
            </label>
            <div className="flex gap-2">
              {MATERIAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateCategoryConfig("material", opt.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    config.material === opt.value
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Insert Type */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Insert Type
            </label>
            <div className="flex gap-2">
              {INSERT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateCategoryConfig("insertType", opt.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    config.insertType === opt.value
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Base Weight */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Base Weight
            </label>
            <div className="flex gap-2">
              {BASE_WEIGHT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateCategoryConfig("baseWeight", opt.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    config.baseWeight === opt.value
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Double-Sided Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Double-Sided
            </label>
            <Switch
              checked={config.doubleSided}
              onCheckedChange={(checked: boolean) =>
                updateCategoryConfig("doubleSided", checked)
              }
            />
          </div>
        </>
      )}
    </div>
  );
}
