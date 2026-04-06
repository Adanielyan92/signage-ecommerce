"use client";

import { useConfiguratorStore } from "@/stores/configurator-store";
import { vinylGraphicProducts } from "@/engine/product-definitions";
import type { VinylGraphicType } from "@/types/product";
import { validateWidth, validateHeight } from "@/lib/validation";
import { Switch } from "@/components/ui/switch";

const VINYL_TYPE_OPTIONS = [
  { value: "calendered", label: "Calendered" },
  { value: "cast", label: "Cast" },
  { value: "reflective", label: "Reflective" },
  { value: "perforated-window", label: "Perforated Window" },
] as const;

const LAMINATION_OPTIONS = [
  { value: "none", label: "None" },
  { value: "matte", label: "Matte" },
  { value: "gloss", label: "Gloss" },
] as const;

const SURFACE_OPTIONS = [
  { value: "wall", label: "Wall" },
  { value: "window", label: "Window" },
  { value: "floor", label: "Floor" },
  { value: "vehicle", label: "Vehicle" },
] as const;

interface VinylGraphicOptionsProps {
  wizardStep: number | null;
}

export function VinylGraphicOptions({ wizardStep }: VinylGraphicOptionsProps) {
  const config = useConfiguratorStore((s) => s.vinylGraphicConfig);
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
            Graphic Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {vinylGraphicProducts.map((p) => (
              <button
                key={p.slug}
                onClick={() =>
                  updateCategoryConfig(
                    "productType",
                    p.slug as VinylGraphicType
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

      {/* Step 1: Text & Font — Vinyl graphics have no text */}
      {wizardStep === 1 && (
        <div className="rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-6 text-center">
          <p className="text-sm text-neutral-600">
            Vinyl graphics don&apos;t require text input. Continue to the next step to set dimensions.
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
                min={6}
                max={240}
                value={config.widthInches}
                onChange={(e) =>
                  updateCategoryConfig(
                    "widthInches",
                    Math.max(6, Math.min(240, Number(e.target.value)))
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
              {heightErrors.length > 0 && (
                <p className="mt-1 text-xs text-red-500">{heightErrors[0].message}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Style — Vinyl Type, Lamination, Surface, Contour Cut */}
      {(showAll || wizardStep === 3) && (
        <>
          {/* Vinyl Type */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Vinyl Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              {VINYL_TYPE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateCategoryConfig("vinylType", opt.value)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    config.vinylType === opt.value
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lamination */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Lamination
            </label>
            <div className="flex gap-2">
              {LAMINATION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateCategoryConfig("lamination", opt.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    config.lamination === opt.value
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Application Surface */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Application Surface
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SURFACE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() =>
                    updateCategoryConfig("applicationSurface", opt.value)
                  }
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    config.applicationSurface === opt.value
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contour Cut Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Contour Cut
            </label>
            <Switch
              checked={config.contourCut}
              onCheckedChange={(checked: boolean) =>
                updateCategoryConfig("contourCut", checked)
              }
            />
          </div>
        </>
      )}
    </div>
  );
}
