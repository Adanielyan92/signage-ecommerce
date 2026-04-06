"use client";

import { useConfiguratorStore } from "@/stores/configurator-store";
import { formatPrice } from "@/lib/utils";
import { Check, Info } from "lucide-react";

/**
 * Human-readable labels for product categories.
 */
const CATEGORY_LABELS: Record<string, string> = {
  CHANNEL_LETTERS: "Channel Letters",
  LIT_SHAPES: "Lit Shapes",
  CABINET_SIGNS: "Cabinet Signs",
  DIMENSIONAL_LETTERS: "Dimensional Letters",
  LOGOS: "Logos",
  PRINT_SIGNS: "Print Signs",
  SIGN_POSTS: "Sign Posts",
  LIGHT_BOX_SIGNS: "Light Box Signs",
  BLADE_SIGNS: "Blade Signs",
  NEON_SIGNS: "Neon Signs",
  VINYL_BANNERS: "Vinyl Banners",
};

/**
 * Formats a config value for display.
 * Skips empty/default values like "-".
 */
function formatValue(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (value === "-" || value === "") return null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  return String(value);
}

/**
 * Human-readable labels for common config keys.
 */
const KEY_LABELS: Record<string, string> = {
  productType: "Product Type",
  text: "Sign Text",
  height: "Letter Height",
  font: "Font",
  lit: "Illumination",
  led: "LED Color",
  litSides: "Lit Sides",
  sideDepth: "Side Depth",
  painting: "Painting",
  paintingColors: "Paint Colors",
  raceway: "Raceway",
  vinyl: "Vinyl",
  background: "Background",
  widthInches: "Width",
  heightInches: "Height",
  printedFace: "Printed Face",
  mounting: "Mounting",
  depth: "Depth",
  thickness: "Thickness",
  grommets: "Grommets",
  laminated: "Laminated",
  neonColor: "Neon Color",
  backer: "Backer",
  backerShape: "Backer Shape",
  illuminated: "Illuminated",
  doubleSided: "Double Sided",
  postHeight: "Post Height",
  signWidthInches: "Sign Width",
  signHeightInches: "Sign Height",
  faceType: "Face Type",
  shape: "Shape",
  finishing: "Finishing",
  material: "Material",
};

/**
 * Keys that should be displayed with inch units.
 */
const INCH_KEYS = new Set([
  "height",
  "widthInches",
  "heightInches",
  "signWidthInches",
  "signHeightInches",
  "sideDepth",
]);

/**
 * Keys that represent feet.
 */
const FEET_KEYS = new Set(["postHeight"]);

/**
 * Keys to skip in the review because they are internal.
 */
const SKIP_KEYS = new Set(["productCategory", "svgPath"]);

interface ReviewRow {
  label: string;
  value: string;
}

function buildRows(config: Record<string, unknown>): ReviewRow[] {
  const rows: ReviewRow[] = [];
  for (const [key, rawValue] of Object.entries(config)) {
    if (SKIP_KEYS.has(key)) continue;
    const formatted = formatValue(rawValue);
    if (formatted === null) continue;

    const label = KEY_LABELS[key] ?? key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
    let value = formatted;

    if (INCH_KEYS.has(key) && !value.includes('"')) {
      value = `${value}"`;
    }
    if (FEET_KEYS.has(key)) {
      const inches = Number(rawValue);
      value = `${Math.round(inches / 12)} ft`;
    }

    rows.push({ label, value });
  }
  return rows;
}

export function ReviewSummary() {
  const productCategory = useConfiguratorStore((s) => s.productCategory);
  const getActiveConfig = useConfiguratorStore((s) => s.getActiveConfig);
  const dimensions = useConfiguratorStore((s) => s.dimensions);
  const breakdown = useConfiguratorStore((s) => s.priceBreakdown);

  const activeConfig = getActiveConfig();
  const configObj = activeConfig as unknown as Record<string, unknown>;
  const rows = buildRows(configObj);

  const hasPrice = breakdown.total > 0;

  // Build line items for price breakdown
  const lineItems: { label: string; amount: number }[] = [];

  if (breakdown.letterPrice > 0) {
    lineItems.push({
      label: "Base price",
      amount: breakdown.letterPrice,
    });
  }

  if (breakdown.multipliers.length > 0) {
    const optionsAmount = breakdown.priceAfterMultipliers - breakdown.letterPrice;
    if (Math.abs(optionsAmount) > 0.01) {
      lineItems.push({
        label: "Options & upgrades",
        amount: optionsAmount,
      });
    }
  }

  if (breakdown.paintingExtra > 0) {
    lineItems.push({ label: "Multicolor painting", amount: breakdown.paintingExtra });
  }

  if (breakdown.racewayPrice > 0) {
    lineItems.push({ label: "Raceway", amount: breakdown.racewayPrice });
  }

  if (breakdown.vinylPrice > 0) {
    lineItems.push({ label: "Vinyl", amount: breakdown.vinylPrice });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-base font-semibold text-neutral-900">
          Review Your Sign
        </h3>
        <p className="mt-1 text-xs text-neutral-500">
          Confirm your selections before adding to cart.
        </p>
      </div>

      {/* Product category */}
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
          Product
        </p>
        <p className="mt-0.5 text-sm font-medium text-neutral-900">
          {CATEGORY_LABELS[productCategory] ?? productCategory}
        </p>
      </div>

      {/* Configuration details */}
      <div className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
        {rows.map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between px-4 py-2.5"
          >
            <span className="text-xs text-neutral-500">{row.label}</span>
            <span className="text-xs font-medium text-neutral-900">
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {/* Dimensions */}
      {(dimensions.totalWidthInches > 0 || dimensions.heightInches > 0) && (
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
            Computed Dimensions
          </p>
          <p className="mt-0.5 text-sm text-neutral-700">
            {dimensions.totalWidthInches.toFixed(1)}&quot; W &times;{" "}
            {dimensions.heightInches.toFixed(1)}&quot; H
            {dimensions.squareFeet > 0 && (
              <span className="text-neutral-400">
                {" "}
                ({dimensions.squareFeet.toFixed(1)} sqft)
              </span>
            )}
          </p>
        </div>
      )}

      {/* Price breakdown */}
      {hasPrice && (
        <div className="rounded-lg border border-neutral-200">
          <div className="border-b border-neutral-100 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
              Price Breakdown
            </p>
          </div>
          <div className="divide-y divide-neutral-50 px-4">
            {lineItems.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2"
              >
                <span className="text-xs text-neutral-500">{item.label}</span>
                <span className="text-xs font-medium text-neutral-700">
                  {item.amount >= 0 ? "+" : "-"}
                  {formatPrice(Math.abs(item.amount))}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-neutral-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-neutral-900">Total</span>
              <span className="text-lg font-bold text-neutral-900">
                {formatPrice(breakdown.total)}
              </span>
            </div>
            {breakdown.minOrderApplied && (
              <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2">
                <Info className="mt-0.5 h-3 w-3 shrink-0 text-amber-600" />
                <p className="text-[10px] text-amber-700">
                  Minimum order applied.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Confirmation check */}
      <div className="flex items-start gap-2 rounded-lg bg-green-50 px-4 py-3">
        <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
        <p className="text-xs text-green-800">
          Your sign configuration is ready. Use the &quot;Add to Cart&quot; button below to proceed.
        </p>
      </div>
    </div>
  );
}
