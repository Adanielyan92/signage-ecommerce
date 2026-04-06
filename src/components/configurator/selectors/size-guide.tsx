"use client";

interface SizeGuideProps {
  currentHeight: number;
}

const SIZE_REFERENCES = [
  { label: "Small storefront", height: 12, description: "Boutiques, cafes" },
  { label: "Standard storefront", height: 18, description: "Most retail stores" },
  { label: "Large storefront", height: 24, description: "Chain stores, restaurants" },
  { label: "Building-scale", height: 36, description: "Office buildings, malls" },
  { label: "Highway visible", height: 48, description: "Gas stations, big box" },
];

export function SizeGuide({ currentHeight }: SizeGuideProps) {
  return (
    <div className="mt-3 rounded-lg border border-brand-muted bg-brand-bg p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-text-secondary">
        Common Sizes
      </p>
      <div className="mt-2 space-y-1.5">
        {SIZE_REFERENCES.map((ref) => {
          const isClose = Math.abs(currentHeight - ref.height) <= 3;
          return (
            <div
              key={ref.height}
              className={`flex items-center justify-between text-xs ${
                isClose ? "font-semibold text-brand-accent" : "text-brand-text-secondary"
              }`}
            >
              <span>
                {ref.height}&quot; -- {ref.label}
              </span>
              <span className="text-[10px]">{ref.description}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
