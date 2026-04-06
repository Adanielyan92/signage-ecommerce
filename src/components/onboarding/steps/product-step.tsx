"use client";

import { useState, useEffect } from "react";
import { Check } from "lucide-react";

interface Template {
  id: string;
  slug: string;
  name: string;
  category: string;
  description: string | null;
}

interface OnboardingData {
  templateSlug: string;
  [key: string]: unknown;
}

export function ProductStep({ data, onChange }: { data: OnboardingData; onChange: (partial: Partial<OnboardingData>) => void }) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/v1/templates");
        if (res.ok) {
          const body = await res.json();
          setTemplates(body.templates ?? []);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return <div className="text-sm text-neutral-500">Loading templates...</div>;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-neutral-900">Import Your First Product</h2>
      <p className="text-sm text-neutral-500">Choose a product template to get started with.</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {templates.map((t) => (
          <button
            key={t.slug}
            onClick={() => onChange({ templateSlug: t.slug })}
            className={`relative rounded-lg border-2 p-4 text-left transition ${
              data.templateSlug === t.slug
                ? "border-blue-600 bg-blue-50"
                : "border-neutral-200 hover:border-neutral-300"
            }`}
          >
            {data.templateSlug === t.slug && (
              <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white">
                <Check className="h-3 w-3" />
              </div>
            )}
            <h3 className="text-sm font-semibold text-neutral-900">{t.name}</h3>
            <p className="mt-0.5 text-xs text-neutral-500">{t.category}</p>
            {t.description && (
              <p className="mt-1 line-clamp-2 text-xs text-neutral-400">{t.description}</p>
            )}
          </button>
        ))}
      </div>

      {templates.length === 0 && (
        <div className="rounded-lg border border-neutral-200 py-8 text-center text-sm text-neutral-400">
          No templates available. Using default: front-lit-trim-cap
        </div>
      )}
    </div>
  );
}
