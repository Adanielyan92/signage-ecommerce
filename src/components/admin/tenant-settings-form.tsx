"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TenantSettingsFormProps {
  initialData: {
    name: string;
    logoUrl: string | null;
    primaryColor: string | null;
    accentColor: string | null;
    customDomain: string | null;
    currency: string;
    locale: string;
  };
}

const CURRENCIES = [
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "CAD", label: "CAD — Canadian Dollar" },
  { value: "AUD", label: "AUD — Australian Dollar" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Ensure hex string always has a leading #, fallback to default */
function toHex(value: string | null, fallback: string): string {
  if (!value) return fallback;
  return value.startsWith("#") ? value : `#${value}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TenantSettingsForm({ initialData }: TenantSettingsFormProps) {
  const [name, setName] = useState(initialData.name);
  const [logoUrl, setLogoUrl] = useState(initialData.logoUrl ?? "");
  const [primaryColor, setPrimaryColor] = useState(
    toHex(initialData.primaryColor, "#2563eb")
  );
  const [accentColor, setAccentColor] = useState(
    toHex(initialData.accentColor, "#0ea5e9")
  );
  const [customDomain, setCustomDomain] = useState(
    initialData.customDomain ?? ""
  );
  const [currency, setCurrency] = useState(initialData.currency);
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/v1/admin/tenant", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          logoUrl: logoUrl || null,
          primaryColor: primaryColor || null,
          accentColor: accentColor || null,
          customDomain: customDomain || null,
          currency,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to save settings");
        return;
      }

      toast.success("Settings saved");
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-8">
      {/* ── Section 1: Branding ───────────────────────────────────────── */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-5 text-base font-semibold text-neutral-900">
          Branding
        </h2>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Business Name */}
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Signs"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Logo URL */}
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Logo URL
            </label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            {logoUrl && (
              <div className="mt-2 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoUrl}
                  alt="Logo preview"
                  className="h-10 w-auto rounded border border-neutral-200 object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
                <span className="text-xs text-neutral-400">Preview</span>
              </div>
            )}
          </div>

          {/* Primary Color */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Primary Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border border-neutral-300 bg-white p-0.5"
              />
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder="#2563eb"
                maxLength={7}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Accent Color */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Accent Color
            </label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                className="h-9 w-12 cursor-pointer rounded border border-neutral-300 bg-white p-0.5"
              />
              <input
                type="text"
                value={accentColor}
                onChange={(e) => setAccentColor(e.target.value)}
                placeholder="#0ea5e9"
                maxLength={7}
                className="w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 2: Localization ───────────────────────────────────── */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-5 text-base font-semibold text-neutral-900">
          Localization
        </h2>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Currency */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {CURRENCIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Domain */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Custom Domain
            </label>
            <input
              type="text"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="signs.yourbusiness.com"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <p className="mt-1.5 text-xs text-neutral-400">
              Point your domain&apos;s CNAME to our servers to use a custom URL.
            </p>
          </div>
        </div>
      </section>

      {/* ── Save ──────────────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save Settings
        </button>
      </div>
    </form>
  );
}
