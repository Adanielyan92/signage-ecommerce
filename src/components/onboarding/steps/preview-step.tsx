"use client";

interface OnboardingData {
  shopName: string;
  primaryColor: string;
  accentColor: string;
  templateSlug: string;
  pricingOverrides: Record<string, number>;
  [key: string]: unknown;
}

export function PreviewStep({ data }: { data: OnboardingData; onChange: (partial: Partial<OnboardingData>) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-neutral-900">Preview Your Configurator</h2>
      <p className="text-sm text-neutral-500">
        Review your selections before completing setup.
      </p>

      {/* Summary */}
      <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-5">
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500">Shop Name</span>
          <span className="font-medium text-neutral-900">{data.shopName || "—"}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-neutral-500">Product Template</span>
          <span className="font-medium text-neutral-900">{data.templateSlug || "—"}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-500">Brand Colors</span>
          <div className="flex gap-2">
            <div className="h-5 w-5 rounded-full border border-neutral-300" style={{ backgroundColor: data.primaryColor }} />
            <div className="h-5 w-5 rounded-full border border-neutral-300" style={{ backgroundColor: data.accentColor }} />
          </div>
        </div>
        {Object.keys(data.pricingOverrides).length > 0 && (
          <div className="text-sm">
            <span className="text-neutral-500">Pricing Overrides</span>
            <div className="mt-1 space-y-1">
              {Object.entries(data.pricingOverrides).map(([key, val]) => (
                <div key={key} className="flex justify-between text-xs">
                  <span className="text-neutral-400">{key}</span>
                  <span className="text-neutral-700">{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mockup */}
      <div className="overflow-hidden rounded-lg border border-neutral-200 shadow-sm">
        <div className="flex h-10 items-center px-4" style={{ backgroundColor: data.primaryColor }}>
          <span className="text-xs font-bold text-white">{data.shopName}</span>
          <div className="ml-auto flex gap-3 text-[10px] text-white/80">
            <span>Products</span>
            <span>Design</span>
            <span>Cart</span>
          </div>
        </div>
        <div className="flex h-40 items-center justify-center bg-neutral-100">
          <div className="text-center">
            <div className="text-2xl font-bold tracking-wider text-neutral-300">3D PREVIEW</div>
            <div className="mt-1 text-xs text-neutral-400">{data.templateSlug}</div>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-neutral-200 bg-white px-4 py-2">
          <span className="text-sm font-bold text-neutral-800">$0.00</span>
          <button
            className="rounded-md px-3 py-1 text-xs font-semibold text-white"
            style={{ backgroundColor: data.primaryColor }}
          >
            Add to Cart
          </button>
        </div>
      </div>

      <p className="text-center text-xs text-neutral-400">
        Click &quot;Complete Setup&quot; to create your account and start selling.
      </p>
    </div>
  );
}
