"use client";

interface OnboardingData {
  pricingOverrides: Record<string, number>;
  [key: string]: unknown;
}

const PRICING_FIELDS = [
  { key: "basePricePerInch", label: "Base Price Per Inch ($)", default: 16 },
  { key: "largeSizePricePerInch", label: "Large Size Price Per Inch ($)", default: 18 },
  { key: "largeSizeThreshold", label: "Large Size Threshold (inches)", default: 36 },
  { key: "minHeightForPrice", label: "Min Height For Price (inches)", default: 12 },
  { key: "minOrderPrice", label: "Minimum Order Price ($)", default: 1360 },
];

export function PricingStep({ data, onChange }: { data: OnboardingData; onChange: (partial: Partial<OnboardingData>) => void }) {
  const overrides = data.pricingOverrides ?? {};

  const handleChange = (key: string, value: string) => {
    const num = parseFloat(value);
    if (isNaN(num)) return;
    onChange({ pricingOverrides: { ...overrides, [key]: num } });
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-neutral-900">Configure Pricing</h2>
      <p className="text-sm text-neutral-500">
        Adjust the default pricing parameters or keep the defaults.
      </p>

      <div className="space-y-3">
        {PRICING_FIELDS.map((field) => (
          <div key={field.key} className="flex items-center gap-4">
            <label className="w-56 text-sm font-medium text-neutral-700">{field.label}</label>
            <input
              type="number"
              value={overrides[field.key] ?? field.default}
              onChange={(e) => handleChange(field.key, e.target.value)}
              step={field.key.includes("Price") ? 1 : 0.1}
              className="w-32 rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        ))}
      </div>

      <p className="text-xs text-neutral-400">
        These values apply to your selected product template. You can change them later in the admin dashboard.
      </p>
    </div>
  );
}
