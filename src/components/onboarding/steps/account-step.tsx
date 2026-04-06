"use client";

interface OnboardingData {
  email: string;
  password: string;
  name: string;
  shopName: string;
  [key: string]: unknown;
}

export function AccountStep({ data, onChange }: { data: OnboardingData; onChange: (partial: Partial<OnboardingData>) => void }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-neutral-900">Create Your Account</h2>
      <p className="text-sm text-neutral-500">Set up your admin account to manage your sign shop.</p>

      <div>
        <label className="block text-sm font-medium text-neutral-700">Full Name <span className="text-red-500">*</span></label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => onChange({ name: e.target.value })}
          placeholder="John Smith"
          className="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">Email <span className="text-red-500">*</span></label>
        <input
          type="email"
          value={data.email}
          onChange={(e) => onChange({ email: e.target.value })}
          placeholder="you@company.com"
          className="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">Password <span className="text-red-500">*</span></label>
        <input
          type="password"
          value={data.password}
          onChange={(e) => onChange({ password: e.target.value })}
          placeholder="Minimum 8 characters"
          className="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700">Shop Name <span className="text-red-500">*</span></label>
        <input
          type="text"
          value={data.shopName}
          onChange={(e) => onChange({ shopName: e.target.value })}
          placeholder="Your Sign Company"
          className="mt-1 w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {data.shopName && (
          <p className="mt-1 text-xs text-neutral-400">
            URL: {data.shopName.toLowerCase().replace(/[^\w\s-]/g, "").replace(/\s+/g, "-")}.gatsoftsigns.com
          </p>
        )}
      </div>
    </div>
  );
}
