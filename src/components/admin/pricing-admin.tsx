"use client";

import { useState } from "react";
import { channelLetterProducts } from "@/engine/product-definitions";
import { formatPrice } from "@/lib/utils";
import { calculatePrice } from "@/engine/pricing";
import type { PricingParams } from "@/types/product";
import type { SignConfiguration, Dimensions } from "@/types/configurator";

const SAMPLE_CONFIG: SignConfiguration = {
  productType: "front-lit-trim-cap",
  text: "SAMPLE",
  height: 18,
  font: "Standard",
  lit: "Lit",
  led: "3000K",
  litSides: "Face Lit",
  sideDepth: '4"',
  painting: "-",
  paintingColors: 1,
  raceway: "-",
  vinyl: "-",
  background: "-",
};

const SAMPLE_DIMENSIONS: Dimensions = {
  totalWidthInches: 65,
  heightInches: 18,
  squareFeet: 8.125,
  linearFeet: 13.83,
  letterWidths: [10, 13, 13, 12, 10, 7],
};

/** Numeric-only keys from PricingParams (excludes `rules`) */
type NumericPricingKey = Exclude<keyof PricingParams, "rules">;

interface PricingParamField {
  key: NumericPricingKey;
  label: string;
  description: string;
  unit: string;
}

const PARAM_FIELDS: PricingParamField[] = [
  { key: "basePricePerInch", label: "Base Price per Inch", description: "Cost per inch of letter height for standard sizes", unit: "$/inch" },
  { key: "largeSizePricePerInch", label: "Large Size Price per Inch", description: "Cost per inch when height exceeds the large size threshold", unit: "$/inch" },
  { key: "largeSizeThreshold", label: "Large Size Threshold", description: "Height (in inches) above which the large size price applies", unit: "inches" },
  { key: "minHeightForPrice", label: "Minimum Height for Pricing", description: "Minimum letter height used in price calculation (even if actual is smaller)", unit: "inches" },
  { key: "minOrderPrice", label: "Minimum Order Price", description: "Floor price applied to any order below this amount", unit: "$" },
];

export function PricingAdmin() {
  const [selectedProduct, setSelectedProduct] = useState<string>(channelLetterProducts[0].slug);
  const product = channelLetterProducts.find((p) => p.slug === selectedProduct)!;

  const [overrides, setOverrides] = useState<Partial<PricingParams>>({});

  const effectiveParams: PricingParams = {
    ...product.pricingParams,
    ...overrides,
  };

  // Live preview calculation
  const sampleBreakdown = calculatePrice(
    { ...SAMPLE_CONFIG, productType: product.slug as SignConfiguration["productType"] } as SignConfiguration,
    SAMPLE_DIMENSIONS,
    effectiveParams,
  );

  const handleChange = (key: keyof PricingParams, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      setOverrides((prev) => ({ ...prev, [key]: num }));
    }
  };

  return (
    <div className="mt-8 space-y-8">
      {/* Product selector */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-brand-text-secondary">
          Product
        </label>
        <select
          value={selectedProduct}
          onChange={(e) => {
            setSelectedProduct(e.target.value);
            setOverrides({});
          }}
          className="w-full rounded-lg border border-brand-muted bg-white px-4 py-2.5 text-sm text-brand-navy"
        >
          {channelLetterProducts.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Pricing param fields */}
      <div className="space-y-4 rounded-xl border border-brand-muted bg-white p-6">
        <h2 className="font-heading text-base font-semibold text-brand-navy">
          Pricing Parameters for {product.name}
        </h2>
        {PARAM_FIELDS.map((field) => (
          <div key={field.key}>
            <label className="mb-1 flex items-center justify-between text-xs text-brand-text-secondary">
              <span className="font-semibold">{field.label}</span>
              <span className="text-[10px]">{field.unit}</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={overrides[field.key] ?? product.pricingParams[field.key]}
              onChange={(e) => handleChange(field.key, e.target.value)}
              className="w-full rounded-lg border border-brand-muted px-4 py-2 text-sm text-brand-navy transition focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/20"
            />
            <p className="mt-0.5 text-[10px] text-brand-text-secondary/80">
              {field.description}
            </p>
          </div>
        ))}
      </div>

      {/* Live preview */}
      <div className="rounded-xl border border-brand-accent/20 bg-brand-accent/5 p-6">
        <h3 className="font-heading text-sm font-semibold text-brand-navy">
          Live Preview: &quot;SAMPLE&quot; at 18&quot; height
        </h3>
        <div className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-brand-text-secondary">Base letter price</span>
            <span className="font-medium text-brand-navy">{formatPrice(sampleBreakdown.letterPrice)}</span>
          </div>
          <div className="flex justify-between border-t border-brand-muted pt-1">
            <span className="font-semibold text-brand-navy">Total</span>
            <span className="font-bold text-brand-accent">{formatPrice(sampleBreakdown.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
