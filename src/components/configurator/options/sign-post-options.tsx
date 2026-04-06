"use client";

import { useConfiguratorStore } from "@/stores/configurator-store";
import { signPostProducts } from "@/engine/product-definitions";
import type { SignPostType } from "@/types/product";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { validateWidth, validateHeight } from "@/lib/validation";

export function SignPostOptions() {
  const config = useConfiguratorStore((s) => s.signPostConfig);
  const updateCategoryConfig = useConfiguratorStore(
    (s) => s.updateCategoryConfig
  );

  const widthErrors = validateWidth(config.signWidthInches);
  const heightErrors = validateHeight(config.signHeightInches);

  // Convert stored inches to feet for display
  const postHeightFeet = Math.round(config.postHeight / 12);

  return (
    <div className="space-y-6">
      {/* Product Type Selector */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Post Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {signPostProducts.map((p) => (
            <button
              key={p.slug}
              onClick={() =>
                updateCategoryConfig(
                  "productType",
                  p.slug as SignPostType
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

      {/* Post Height (in feet) */}
      <div>
        <label className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-neutral-500">
          <span>Post Height</span>
          <span className="text-sm font-bold text-neutral-900">
            {postHeightFeet} ft
          </span>
        </label>
        <input
          type="number"
          min={4}
          max={12}
          value={postHeightFeet}
          onChange={(e) => {
            const feet = Math.max(4, Math.min(12, Number(e.target.value)));
            updateCategoryConfig("postHeight", feet * 12);
          }}
          className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
        <div className="mt-1 flex justify-between text-[10px] text-neutral-400">
          <span>4 ft</span>
          <span>12 ft</span>
        </div>
      </div>

      <Separator />

      {/* Sign Dimensions */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Sign Dimensions
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
              value={config.signWidthInches}
              onChange={(e) =>
                updateCategoryConfig(
                  "signWidthInches",
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
              value={config.signHeightInches}
              onChange={(e) =>
                updateCategoryConfig(
                  "signHeightInches",
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

      {/* Double Sided */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Double Sided
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
