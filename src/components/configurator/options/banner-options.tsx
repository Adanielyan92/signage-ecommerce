"use client";

import { useConfiguratorStore } from "@/stores/configurator-store";
import { bannerProducts } from "@/engine/product-definitions";
import type { VinylBannerType } from "@/types/product";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { validateWidth, validateHeight } from "@/lib/validation";

const FINISHING_OPTIONS = [
  { value: "hem-grommets", label: "Hem & Grommets" },
  { value: "pole-pockets", label: "Pole Pockets" },
  { value: "wind-slits", label: "Wind Slits" },
] as const;

export function BannerOptions() {
  const config = useConfiguratorStore((s) => s.bannerConfig);
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
          Banner Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {bannerProducts.map((p) => (
            <button
              key={p.slug}
              onClick={() =>
                updateCategoryConfig(
                  "productType",
                  p.slug as VinylBannerType
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
              min={12}
              max={240}
              value={config.widthInches}
              onChange={(e) =>
                updateCategoryConfig(
                  "widthInches",
                  Math.max(12, Math.min(240, Number(e.target.value)))
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
              max={120}
              value={config.heightInches}
              onChange={(e) =>
                updateCategoryConfig(
                  "heightInches",
                  Math.max(12, Math.min(120, Number(e.target.value)))
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

      {/* Finishing */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Finishing
        </label>
        <div className="flex gap-2">
          {FINISHING_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateCategoryConfig("finishing", opt.value)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                config.finishing === opt.value
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <Separator />

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
    </div>
  );
}
