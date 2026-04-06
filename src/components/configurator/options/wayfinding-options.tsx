"use client";

import { useConfiguratorStore } from "@/stores/configurator-store";
import { wayfindingProducts } from "@/engine/product-definitions";
import type { WayfindingType } from "@/types/product";
import { validateWidth, validateHeight } from "@/lib/validation";
import { Switch } from "@/components/ui/switch";

const MATERIAL_OPTIONS = [
  { value: "acrylic", label: "Acrylic" },
  { value: "photopolymer", label: "Photopolymer" },
  { value: "pvc", label: "PVC" },
] as const;

const PICTOGRAM_OPTIONS = [
  { value: "none", label: "None" },
  { value: "arrow", label: "Arrow" },
  { value: "restroom", label: "Restroom" },
  { value: "exit", label: "Exit" },
  { value: "custom", label: "Custom" },
] as const;

const MOUNTING_OPTIONS = [
  { value: "wall", label: "Wall" },
  { value: "projecting", label: "Projecting" },
  { value: "ceiling-hung", label: "Ceiling Hung" },
] as const;

interface WayfindingOptionsProps {
  wizardStep: number | null;
}

export function WayfindingOptions({ wizardStep }: WayfindingOptionsProps) {
  const config = useConfiguratorStore((s) => s.wayfindingConfig);
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
            Sign Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {wayfindingProducts.map((p) => (
              <button
                key={p.slug}
                onClick={() =>
                  updateCategoryConfig(
                    "productType",
                    p.slug as WayfindingType
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

      {/* Step 1: Text */}
      {(showAll || wizardStep === 1) && (
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Sign Text
          </label>
          <input
            type="text"
            value={config.text}
            placeholder="e.g. Room 101, Exit, Restroom"
            onChange={(e) => updateCategoryConfig("text", e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
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
                min={6}
                max={24}
                value={config.widthInches}
                onChange={(e) =>
                  updateCategoryConfig(
                    "widthInches",
                    Math.max(6, Math.min(24, Number(e.target.value)))
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
                min={4}
                max={12}
                value={config.heightInches}
                onChange={(e) =>
                  updateCategoryConfig(
                    "heightInches",
                    Math.max(4, Math.min(12, Number(e.target.value)))
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

      {/* Step 3: Style — Material, ADA, Pictogram, Mounting */}
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

          {/* ADA Compliant Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              ADA Compliant (Tactile + Braille)
            </label>
            <Switch
              checked={config.adaCompliant}
              onCheckedChange={(checked: boolean) =>
                updateCategoryConfig("adaCompliant", checked)
              }
            />
          </div>

          {/* Pictogram */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Pictogram
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PICTOGRAM_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateCategoryConfig("pictogram", opt.value)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    config.pictogram === opt.value
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
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
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
