"use client";

import { Check } from "lucide-react";

interface MaterialOption {
  value: string;
  label: string;
  description: string;
  previewColor: string;
  metallic?: boolean;
}

interface MaterialSwatchSelectorProps {
  label: string;
  options: MaterialOption[];
  value: string;
  onChange: (value: string) => void;
}

export function MaterialSwatchSelector({
  label,
  options,
  value,
  onChange,
}: MaterialSwatchSelectorProps) {
  return (
    <div>
      <label className="mb-3 block font-heading text-xs font-semibold uppercase tracking-wide text-brand-text-secondary">
        {label}
      </label>
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                isSelected
                  ? "border-brand-accent bg-brand-accent/5 shadow-sm"
                  : "border-brand-muted bg-white hover:border-brand-accent/40"
              }`}
            >
              <div className="relative shrink-0">
                <div
                  className="h-10 w-10 rounded-lg"
                  style={{
                    background: opt.metallic
                      ? `linear-gradient(135deg, ${opt.previewColor} 0%, #f0f0f0 50%, ${opt.previewColor} 100%)`
                      : opt.previewColor,
                  }}
                />
                {isSelected && (
                  <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-accent">
                    <Check className="h-2.5 w-2.5 text-white" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className={`text-xs font-semibold ${
                    isSelected ? "text-brand-accent" : "text-brand-navy"
                  }`}
                >
                  {opt.label}
                </div>
                <div className="mt-0.5 text-[10px] leading-tight text-brand-text-secondary">
                  {opt.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
