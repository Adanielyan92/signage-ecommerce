"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { useConfiguratorStore } from "@/stores/configurator-store";
import { formatPrice } from "@/lib/utils";
import { AnimatedNumber } from "@/components/ui/animated-number";

export function PriceDisplay() {
  const [expanded, setExpanded] = useState(false);
  const breakdown = useConfiguratorStore((s) => s.priceBreakdown);
  const productCategory = useConfiguratorStore((s) => s.productCategory);
  const config = useConfiguratorStore((s) => s.config);
  const dimensions = useConfiguratorStore((s) => s.dimensions);
  const getActiveConfig = useConfiguratorStore((s) => s.getActiveConfig);

  const hasPrice = breakdown.total > 0;

  const lineItems: { label: string; amount: number }[] = [];

  if (breakdown.letterPrice > 0) {
    if (productCategory === "CHANNEL_LETTERS") {
      const count = config.text.replace(/\s+/g, "").length;
      lineItems.push({
        label: `${count} letters at ${config.height}"`,
        amount: breakdown.letterPrice,
      });
    } else if (productCategory === "NEON_SIGNS" || productCategory === "DIMENSIONAL_LETTERS") {
      const active = getActiveConfig();
      if ("text" in active && "height" in active) {
        const count = (active.text as string).replace(/\s+/g, "").length;
        lineItems.push({
          label: `${count} letters at ${(active as { height: number }).height}"`,
          amount: breakdown.letterPrice,
        });
      }
    } else {
      lineItems.push({
        label: `${dimensions.totalWidthInches}" x ${dimensions.heightInches}" (${dimensions.squareFeet.toFixed(1)} sqft)`,
        amount: breakdown.letterPrice,
      });
    }
  }

  if (breakdown.multipliers.length > 0) {
    lineItems.push({
      label: "Options & upgrades",
      amount: breakdown.priceAfterMultipliers - breakdown.letterPrice,
    });
  }

  if (breakdown.paintingExtra > 0) {
    lineItems.push({ label: "Multicolor painting", amount: breakdown.paintingExtra });
  }

  if (breakdown.racewayPrice > 0) {
    lineItems.push({ label: "Raceway", amount: breakdown.racewayPrice });
  }

  if (breakdown.vinylPrice > 0) {
    lineItems.push({ label: "Vinyl", amount: breakdown.vinylPrice });
  }

  return (
    <div className="rounded-xl border border-brand-muted bg-white shadow-sm">
      {/* Main price */}
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-text-secondary">
            Estimated Total
          </p>
          {hasPrice ? (
            <AnimatedNumber
              value={breakdown.total}
              className="font-heading text-2xl font-bold text-brand-navy"
            />
          ) : (
            <p className="font-heading text-2xl font-bold text-brand-navy">--</p>
          )}
        </div>

        {hasPrice && lineItems.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-brand-accent transition hover:bg-brand-accent/5"
          >
            {expanded ? "Hide" : "Details"}
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>

      {/* Breakdown */}
      {expanded && lineItems.length > 0 && (
        <div className="border-t border-brand-muted px-5 py-3">
          <div className="space-y-1.5">
            {lineItems.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs text-brand-text-secondary"
              >
                <span>{item.label}</span>
                <span className={item.amount < 0 ? "text-brand-success" : ""}>
                  {item.amount >= 0 ? "+" : ""}{formatPrice(Math.abs(item.amount))}
                </span>
              </div>
            ))}
          </div>

          {breakdown.minOrderApplied && (
            <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-brand-warning/10 px-3 py-2">
              <Info className="mt-0.5 h-3 w-3 shrink-0 text-brand-warning" />
              <p className="text-[10px] text-brand-warning">
                Minimum order applied. Our minimum covers setup, materials, and quality assurance.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
