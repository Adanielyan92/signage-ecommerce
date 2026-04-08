"use client";

import { useState, useEffect } from "react";
import { channelLetterProducts } from "@/engine/product-definitions";
import { formatPrice } from "@/lib/utils";
import { calculatePrice } from "@/engine/pricing";
import type { PricingParams, ProductOption } from "@/types/product";
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
  racewayColor: "#808080",
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
  const [dbParams, setDbParams] = useState<Partial<PricingParams> | null>(null);
  const [dbSchema, setDbSchema] = useState<any | null>(null);
  const [options, setOptions] = useState<ProductOption[]>([]);
  const [overrides, setOverrides] = useState<Partial<PricingParams>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [hasSchemaChanges, setHasSchemaChanges] = useState(false);

  const product = channelLetterProducts.find((p) => p.slug === selectedProduct)!;

  // Load from DB on mount / selection change
  useEffect(() => {
    fetch(`/api/admin/pricing/${selectedProduct}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => {
        if (data.pricingParams) {
          setDbParams(data.pricingParams as Partial<PricingParams>);
        } else {
          setDbParams(null);
        }
        
        if (data.productSchema) {
          setDbSchema(data.productSchema);
          setOptions(data.productSchema.options || []);
        } else {
          setDbSchema(null);
          const localProduct = channelLetterProducts.find((p) => p.slug === selectedProduct);
          setOptions(localProduct?.options || []);
        }
        setOverrides({}); // Reset local overrides
        setHasSchemaChanges(false);
      })
      .catch((e) => {
        console.error("Fetch pricing error:", e);
        setDbParams(null);
        setDbSchema(null);
        setOverrides({});
        setHasSchemaChanges(false);
      });
  }, [selectedProduct]);

  const effectiveParams: PricingParams = {
    ...product.pricingParams, // Base code fallback
    ...(dbParams || {}),      // Database persistent values
    ...overrides,             // Local pending UI changes
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const merged = { ...effectiveParams };
      const mergedSchema = { ...dbSchema, options };
      
      const res = await fetch(`/api/admin/pricing/${selectedProduct}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pricingParams: merged, productSchema: mergedSchema }),
      });
      if (res.ok) {
        setDbParams(merged);
        setDbSchema(mergedSchema);
        setOverrides({});
        setHasSchemaChanges(false);
        alert("Configuration saved permanently to database!");
      } else {
        alert("Failed to save configuration.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving configuration.");
    } finally {
      setIsSaving(false);
    }
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
              value={effectiveParams[field.key] ?? ""}
              onChange={(e) => handleChange(field.key, e.target.value)}
              className="w-full rounded-lg border border-brand-muted px-4 py-2 text-sm text-brand-navy transition focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/20"
            />
            <p className="mt-0.5 text-[10px] text-brand-text-secondary/80">
              {field.description}
            </p>
          </div>
        ))}
      </div>

      {/* Product Options Builder */}
      <div className="space-y-4 rounded-xl border border-brand-muted bg-white p-6">
        <h2 className="font-heading text-base font-semibold text-brand-navy">
          Configurator Options
        </h2>
        <p className="text-xs text-brand-text-secondary">
          Add, remove, or modify the selector dropdowns and inputs presented to the sales rep.
        </p>
        <div className="space-y-3">
          {options.map((opt, idx) => (
            <div key={idx} className="relative rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
              <button 
                onClick={() => {
                  setOptions(options.filter((_, i) => i !== idx));
                  setHasSchemaChanges(true);
                }}
                className="absolute right-3 top-3 text-[10px] font-bold text-red-500 hover:text-red-700 uppercase"
              >
                Remove
              </button>
              <div className="flex gap-4 pr-16 mb-2">
                <div className="flex-1">
                  <label className="mb-1 block text-[10px] font-semibold uppercase text-neutral-500">Label</label>
                  <input 
                    className="w-full rounded border px-2 py-1.5 text-sm"
                    value={opt.label || ""}
                    onChange={(e) => {
                      const newOpts = [...options];
                      newOpts[idx].label = e.target.value;
                      setOptions(newOpts);
                      setHasSchemaChanges(true);
                    }}
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-[10px] font-semibold uppercase text-neutral-500">Option Key</label>
                  <input 
                    className="w-full rounded border px-2 py-1.5 text-sm"
                    value={opt.optionKey || ""}
                    onChange={(e) => {
                      const newOpts = [...options];
                      newOpts[idx].optionKey = e.target.value;
                      setOptions(newOpts);
                      setHasSchemaChanges(true);
                    }}
                  />
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-[10px] font-semibold uppercase text-neutral-500">Input Type</label>
                  <select 
                    className="w-full rounded border px-2 py-1.5 text-sm"
                    value={opt.inputType || "text"}
                    onChange={(e) => {
                      const newOpts = [...options];
                      newOpts[idx].inputType = e.target.value as any;
                      setOptions(newOpts);
                      setHasSchemaChanges(true);
                    }}
                  >
                    <option value="text">Text Input</option>
                    <option value="number">Number Input</option>
                    <option value="select">Dropdown Select</option>
                  </select>
                </div>
              </div>
              {opt.inputType === "select" && (
                <div>
                  <label className="mb-1 block text-[10px] font-semibold uppercase text-neutral-500">
                    Dropdown Values (comma separated)
                  </label>
                  <input 
                    className="w-full rounded border px-2 py-1.5 text-sm"
                    value={opt.possibleValues?.map((v) => v.value).join(", ") || ""}
                    onChange={(e) => {
                      const split = e.target.value.split(",").map((s) => ({ value: s.trim() })).filter(v => v.value);
                      const newOpts = [...options];
                      newOpts[idx].possibleValues = split;
                      setOptions(newOpts);
                      setHasSchemaChanges(true);
                    }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
        <button 
          onClick={() => {
            setOptions([
              ...options, 
              { id: Date.now().toString(), optionKey: "new_option", label: "New Option", inputType: "text" }
            ]);
            setHasSchemaChanges(true);
          }}
          className="mt-2 rounded bg-neutral-100 px-4 py-2 text-xs font-semibold text-neutral-600 hover:bg-neutral-200"
        >
          + Add New Option
        </button>
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

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={isSaving || (Object.keys(overrides).length === 0 && !hasSchemaChanges)}
          className="rounded-lg bg-brand-accent px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Pricing Configuration"}
        </button>
      </div>
    </div>
  );
}
