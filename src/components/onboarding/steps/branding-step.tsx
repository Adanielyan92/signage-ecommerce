"use client";

interface OnboardingData {
  primaryColor: string;
  accentColor: string;
  logoUrl: string;
  shopName: string;
  [key: string]: unknown;
}

export function BrandingStep({ data, onChange }: { data: OnboardingData; onChange: (partial: Partial<OnboardingData>) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-neutral-900">Set Your Branding</h2>
      <p className="text-sm text-neutral-500">Customize the look and feel of your storefront.</p>

      <div className="flex gap-6">
        <div>
          <label className="block text-sm font-medium text-neutral-700">Primary Color</label>
          <div className="mt-1 flex items-center gap-3">
            <input
              type="color"
              value={data.primaryColor}
              onChange={(e) => onChange({ primaryColor: e.target.value })}
              className="h-10 w-10 cursor-pointer rounded-md border border-neutral-300"
            />
            <input
              type="text"
              value={data.primaryColor}
              onChange={(e) => onChange({ primaryColor: e.target.value })}
              className="w-28 rounded-md border border-neutral-300 px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-neutral-700">Accent Color</label>
          <div className="mt-1 flex items-center gap-3">
            <input
              type="color"
              value={data.accentColor}
              onChange={(e) => onChange({ accentColor: e.target.value })}
              className="h-10 w-10 cursor-pointer rounded-md border border-neutral-300"
            />
            <input
              type="text"
              value={data.accentColor}
              onChange={(e) => onChange({ accentColor: e.target.value })}
              className="w-28 rounded-md border border-neutral-300 px-3 py-2 text-sm font-mono"
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">Logo URL</label>
        <input
          type="text"
          value={data.logoUrl}
          onChange={(e) => onChange({ logoUrl: e.target.value })}
          placeholder="https://your-site.com/logo.png"
          className="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {/* Preview */}
      <div className="mt-6 overflow-hidden rounded-lg border border-neutral-200">
        <div className="h-12 flex items-center px-4" style={{ backgroundColor: data.primaryColor }}>
          <span className="text-sm font-bold text-white">{data.shopName || "Your Shop"}</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-3">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: data.accentColor }} />
          <span className="text-xs text-neutral-500">Preview of your brand colors</span>
        </div>
      </div>
    </div>
  );
}
