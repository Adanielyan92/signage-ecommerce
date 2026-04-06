"use client";

import { useConfiguratorStore } from "@/stores/configurator-store";
import { printProducts } from "@/engine/product-definitions";
import type { PrintSignType } from "@/types/product";
import type { PrintConfiguration } from "@/types/configurator";
import { Switch } from "@/components/ui/switch";
import { validateWidth, validateHeight } from "@/lib/validation";

const GROMMET_OPTIONS: {
  value: PrintConfiguration["grommets"];
  label: string;
}[] = [
  { value: "-", label: "None" },
  { value: "4 Corners", label: "4 Corners" },
  { value: "Each ft", label: "Each ft" },
];

interface PrintOptionsProps {
  wizardStep: number | null;
}

export function PrintOptions({ wizardStep }: PrintOptionsProps) {
  const config = useConfiguratorStore((s) => s.printConfig);
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
            Print Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            {printProducts.map((p) => (
              <button
                key={p.slug}
                onClick={() =>
                  updateCategoryConfig(
                    "productType",
                    p.slug as PrintSignType
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

      {/* Step 1: Text & Font — Print signs have no text */}
      {wizardStep === 1 && (
        <div className="rounded-lg border border-blue-100 bg-blue-50/50 px-4 py-6 text-center">
          <p className="text-sm text-neutral-600">
            Print signs don&apos;t require text input. Continue to the next step to set dimensions.
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

      {/* Step 3: Style & Color — Grommets, Laminated */}
      {(showAll || wizardStep === 3) && (
        <>
          {/* Grommets */}
          <div>
            <label
              className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500"
              title="Metal-reinforced holes for hanging or mounting the sign"
            >
              Grommets
            </label>
            <div className="flex gap-2">
              {GROMMET_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => updateCategoryConfig("grommets", opt.value)}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                    config.grommets === opt.value
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Laminated */}
          <div className="flex items-center justify-between">
            <label
              className="text-xs font-semibold uppercase tracking-wide text-neutral-500"
              title="Protective coating that resists scratches and UV fading"
            >
              Laminated
            </label>
            <Switch
              checked={config.laminated}
              onCheckedChange={(checked: boolean) =>
                updateCategoryConfig("laminated", checked)
              }
            />
          </div>
        </>
      )}
    </div>
  );
}
