"use client";

import { Check } from "lucide-react";

interface ColorOption {
  value: string;
  label: string;
  color: string;
}

interface ColorSwatchSelectorProps {
  label: string;
  options: ColorOption[];
  value: string;
  onChange: (value: string) => void;
}

export function ColorSwatchSelector({
  label,
  options,
  value,
  onChange,
}: ColorSwatchSelectorProps) {
  return (
    <div>
      <label className="mb-2 block font-heading text-xs font-semibold uppercase tracking-wide text-brand-text-secondary">
        {label}
      </label>
      <div className="flex flex-wrap gap-3">
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className="group flex flex-col items-center gap-1.5"
              title={opt.label}
            >
              <div
                className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition ${
                  isSelected
                    ? "border-brand-accent shadow-md shadow-brand-accent/20"
                    : "border-brand-muted hover:border-brand-accent/50"
                }`}
              >
                <div
                  className="h-7 w-7 rounded-full"
                  style={{ background: opt.color }}
                />
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Check className="h-4 w-4 text-white drop-shadow-md" />
                  </div>
                )}
              </div>
              <span
                className={`text-[10px] font-medium ${
                  isSelected ? "text-brand-accent" : "text-brand-text-secondary"
                }`}
              >
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
