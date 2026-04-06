"use client";

import { useConfiguratorStore } from "@/stores/configurator-store";
import { plaqueProducts } from "@/engine/product-definitions";
import type { PlaqueType } from "@/types/product";
import { validateWidth, validateHeight } from "@/lib/validation";
import { Switch } from "@/components/ui/switch";

const THICKNESS_OPTIONS = [
  { value: "1/8", label: '1/8"' },
  { value: "1/4", label: '1/4"' },
  { value: "3/8", label: '3/8"' },
] as const;

const MOUNTING_OPTIONS = [
  { value: "standoffs", label: "Standoffs" },
  { value: "flat", label: "Flat Mount" },
  { value: "easel", label: "Easel" },
] as const;

const FINISH_OPTIONS = [
  { value: "brushed", label: "Brushed" },
  { value: "polished", label: "Polished" },
  { value: "matte", label: "Matte" },
  { value: "painted", label: "Painted" },
] as const;

interface PlaqueOptionsProps {
  wizardStep: number | null;
}

export function PlaqueOptions({ wizardStep }: PlaqueOptionsProps) {
  const config = useConfiguratorStore((s) => s.plaqueConfig);
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
            Plaque Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {plaqueProducts.map((p) => (
              <button
                key={p.slug}
                onClick={() =>
                  updateCategoryConfig("productType", p.slug as PlaqueType)
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

      {/* Step 1: Text & Font — Plaques have no text input */}
      {wizardStep === 1 && (
        <div className="rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-6 text-center">
          <p className="text-sm text-neutral-600">
            Plaque text is provided at checkout. Continue to the next step to set dimensions.
          </p>
        </div>
      )}

      {/* Step 2: Size — Dimensions + Thickness */}
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
                  max={18}
                  value={config.heightInches}
                  onChange={(e) =>
                    updateCategoryConfig(
                      "heightInches",
                      Math.max(4, Math.min(18, Number(e.target.value)))
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

      {/* Step 3: Style — Mounting, Finish, Text Engraving */}
      {(showAll || wizardStep === 3) && (
        <>
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

          {/* Finish */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Finish
            </label>
            <div className="grid grid-cols-2 gap-2">
              {FINISH_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateCategoryConfig("finish", opt.value)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    config.finish === opt.value
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text Engraving Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Text Engraving
            </label>
            <Switch
              checked={config.textEngraving}
              onCheckedChange={(checked: boolean) =>
                updateCategoryConfig("textEngraving", checked)
              }
            />
          </div>
        </>
      )}
    </div>
  );
}
