"use client";

import { useConfiguratorStore } from "@/stores/configurator-store";
import { yardSignProducts } from "@/engine/product-definitions";
import type { YardSignType } from "@/types/product";
import { validateWidth, validateHeight } from "@/lib/validation";
import { Switch } from "@/components/ui/switch";

const STAKE_OPTIONS = [
  { value: "h-stake", label: "H-Stake" },
  { value: "spider-stake", label: "Spider Stake" },
  { value: "none", label: "None" },
] as const;

interface YardSignOptionsProps {
  wizardStep: number | null;
}

export function YardSignOptions({ wizardStep }: YardSignOptionsProps) {
  const config = useConfiguratorStore((s) => s.yardSignConfig);
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
            Yard Sign Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {yardSignProducts.map((p) => (
              <button
                key={p.slug}
                onClick={() =>
                  updateCategoryConfig("productType", p.slug as YardSignType)
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

      {/* Step 1: Text & Font — Yard signs have no text */}
      {wizardStep === 1 && (
        <div className="rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-6 text-center">
          <p className="text-sm text-neutral-600">
            Yard signs don&apos;t require text input. Continue to the next step to set dimensions.
          </p>
        </div>
      )}

      {/* Step 2: Size — Dimensions + Quantity */}
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
                  max={48}
                  value={config.widthInches}
                  onChange={(e) =>
                    updateCategoryConfig(
                      "widthInches",
                      Math.max(12, Math.min(48, Number(e.target.value)))
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
                  max={36}
                  value={config.heightInches}
                  onChange={(e) =>
                    updateCategoryConfig(
                      "heightInches",
                      Math.max(12, Math.min(36, Number(e.target.value)))
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

          {/* Quantity */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Quantity
            </label>
            <input
              type="number"
              min={1}
              max={500}
              value={config.quantity}
              onChange={(e) =>
                updateCategoryConfig(
                  "quantity",
                  Math.max(1, Math.min(500, Number(e.target.value)))
                )
              }
              className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {config.quantity >= 10 && (
              <p className="mt-1 text-xs text-green-600">
                {config.quantity >= 100
                  ? "25% quantity discount applied"
                  : config.quantity >= 50
                    ? "20% quantity discount applied"
                    : config.quantity >= 25
                      ? "15% quantity discount applied"
                      : "10% quantity discount applied"}
              </p>
            )}
          </div>
        </>
      )}

      {/* Step 3: Style — Stake, Double-Sided */}
      {(showAll || wizardStep === 3) && (
        <>
          {/* Stake Type */}
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Stake Type
            </label>
            <div className="flex gap-2">
              {STAKE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateCategoryConfig("stakeType", opt.value)}
                  className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    config.stakeType === opt.value
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
