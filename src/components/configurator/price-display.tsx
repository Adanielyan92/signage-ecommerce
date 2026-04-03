"use client";

import { useState } from "react";
import { useConfiguratorStore } from "@/stores/configurator-store";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice } from "@/lib/utils";
import { getProductBySlug } from "@/engine/product-definitions";
import { captureCanvasScreenshot } from "@/lib/capture-screenshot";
import { useSession } from "next-auth/react";
import { Save } from "lucide-react";
import { toast } from "sonner";

export function PriceDisplay() {
  const config = useConfiguratorStore((s) => s.config);
  const dimensions = useConfiguratorStore((s) => s.dimensions);
  const breakdown = useConfiguratorStore((s) => s.priceBreakdown);
  const addItem = useCartStore((s) => s.addItem);
  const { data: session } = useSession();
  const [savingDesign, setSavingDesign] = useState(false);

  const product = getProductBySlug(config.productType);
  const hasText = config.text.replace(/\s+/g, "").length > 0;

  const handleAddToCart = () => {
    if (!product || !hasText) return;

    const thumbnailUrl = captureCanvasScreenshot() ?? undefined;

    addItem({
      productCategory: "CHANNEL_LETTERS",
      productType: config.productType,
      productName: product.name,
      configuration: { ...config },
      dimensions: { ...dimensions },
      thumbnailUrl,
      quantity: 1,
      unitPrice: breakdown.total,
    });

    toast.success("Added to cart");
  };

  const handleSaveDesign = async () => {
    if (!session) {
      toast.error("Sign in to save designs", {
        action: {
          label: "Sign In",
          onClick: () => {
            window.location.href = "/auth/signin";
          },
        },
      });
      return;
    }

    if (!hasText) return;

    setSavingDesign(true);
    try {
      const thumbnailUrl = captureCanvasScreenshot();
      const res = await fetch("/api/designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: config.text,
          configuration: config,
          thumbnailUrl,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");
      toast.success("Design saved");
    } catch {
      toast.error("Failed to save design");
    } finally {
      setSavingDesign(false);
    }
  };

  return (
    <div className="border-t border-neutral-200 bg-white p-6">
      {/* Price breakdown */}
      {hasText && breakdown.total > 0 && (
        <div className="mb-4 space-y-1 text-sm">
          <div className="flex justify-between text-neutral-500">
            <span>
              Letters ({config.text.replace(/\s+/g, "").length} x{" "}
              {config.height}&quot;)
            </span>
            <span>{formatPrice(breakdown.letterPrice)}</span>
          </div>

          {breakdown.multipliers.length > 0 && (
            <div className="flex justify-between text-neutral-500">
              <span>Options & multipliers</span>
              <span>{formatPrice(breakdown.priceAfterMultipliers)}</span>
            </div>
          )}

          {breakdown.paintingExtra > 0 && (
            <div className="flex justify-between text-neutral-500">
              <span>Multicolor painting</span>
              <span>+{formatPrice(breakdown.paintingExtra)}</span>
            </div>
          )}

          {breakdown.racewayPrice > 0 && (
            <div className="flex justify-between text-neutral-500">
              <span>Raceway</span>
              <span>+{formatPrice(breakdown.racewayPrice)}</span>
            </div>
          )}

          {breakdown.vinylPrice > 0 && (
            <div className="flex justify-between text-neutral-500">
              <span>Vinyl</span>
              <span>+{formatPrice(breakdown.vinylPrice)}</span>
            </div>
          )}

          {breakdown.minOrderApplied && (
            <div className="text-xs text-amber-600">
              Minimum order price applied
            </div>
          )}
        </div>
      )}

      {/* Total + Actions */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Total
          </div>
          <div className="text-2xl font-bold text-neutral-900">
            {hasText ? formatPrice(breakdown.total) : "$0.00"}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveDesign}
            disabled={!hasText || savingDesign}
            className="flex items-center gap-1 rounded-lg border border-neutral-300 px-3 py-3 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
            title="Save Design"
          >
            <Save className="h-4 w-4" />
          </button>
          <button
            onClick={handleAddToCart}
            disabled={!hasText}
            className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
