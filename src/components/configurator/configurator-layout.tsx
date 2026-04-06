"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState, Component, type ReactNode, type ErrorInfo } from "react";
import type { AnyProduct } from "@/engine/product-definitions";
import { OptionsPanel } from "./options-panel";
import { useConfiguratorStore } from "@/stores/configurator-store";
import { useCartStore } from "@/stores/cart-store";
import { useMockupStore } from "@/stores/mockup-store";
import { formatPrice } from "@/lib/utils";
import type { UnifiedCartItem } from "@/types/configurator";
import { captureCanvasScreenshot } from "@/lib/capture-screenshot";
import { useSession } from "next-auth/react";
import { DayNightToggle } from "./day-night-toggle";
import { Save, Image as ImageIcon, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { ArButton } from "./ar-button";
import { getSignGroupRef } from "@/components/three/scene-ref";

const Scene = dynamic(() => import("@/components/three/scene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-neutral-100">
      <div className="text-center">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        <p className="mt-3 text-sm text-neutral-500">Loading 3D Preview...</p>
      </div>
    </div>
  ),
});

class SceneErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("3D scene error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full items-center justify-center bg-neutral-100">
          <div className="text-center">
            <p className="text-lg font-medium text-neutral-700">Unable to load 3D preview</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export function ConfiguratorLayout({
  product,
}: {
  product: AnyProduct;
}) {
  const config = useConfiguratorStore((s) => s.config);
  const dimensions = useConfiguratorStore((s) => s.dimensions);
  const breakdown = useConfiguratorStore((s) => s.priceBreakdown);
  const productCategory = useConfiguratorStore((s) => s.productCategory);
  const getActiveConfig = useConfiguratorStore((s) => s.getActiveConfig);
  const addItem = useCartStore((s) => s.addItem);
  const setMockupSignConfig = useMockupStore((s) => s.setSignConfig);
  const router = useRouter();
  const { data: session } = useSession();
  const [savingDesign, setSavingDesign] = useState(false);

  // For text-based categories, require non-empty text. For others, always valid.
  const hasRequiredInput = (() => {
    if (productCategory === "CHANNEL_LETTERS") {
      return config.text.replace(/\s+/g, "").length > 0;
    }
    if (productCategory === "DIMENSIONAL_LETTERS") {
      const activeConfig = getActiveConfig();
      return "text" in activeConfig && activeConfig.text.replace(/\s+/g, "").length > 0;
    }
    if (productCategory === "NEON_SIGNS") {
      const activeConfig = getActiveConfig();
      return "text" in activeConfig && activeConfig.text.replace(/\s+/g, "").length > 0;
    }
    return true;
  })();

  const canAddToCart = hasRequiredInput && breakdown.total > 0;

  const handleWallMockup = () => {
    const activeConfig = getActiveConfig();
    setMockupSignConfig(productCategory, product.slug, { ...activeConfig } as Record<string, unknown>);
    router.push("/mockup");
  };

  const handleAddToCart = () => {
    if (!canAddToCart) return;

    const activeConfig = getActiveConfig();
    const thumbnailUrl = captureCanvasScreenshot() ?? undefined;

    addItem({
      productCategory,
      productType: product.slug as UnifiedCartItem["productType"],
      productName: product.name,
      configuration: { ...activeConfig },
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

    if (!hasRequiredInput) return;

    setSavingDesign(true);
    try {
      const activeConfig = getActiveConfig();
      const thumbnailUrl = captureCanvasScreenshot();
      const designName =
        "text" in activeConfig && typeof activeConfig.text === "string"
          ? activeConfig.text
          : product.name;
      const res = await fetch("/api/designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: designName,
          configuration: activeConfig,
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
    <div className="flex h-[calc(100vh-4rem)] flex-col lg:flex-row">
      {/* 3D Viewport — 60% on desktop, 50vh on mobile */}
      <div className="relative h-[50vh] min-h-[300px] bg-neutral-100 lg:h-full lg:w-[60%]">
        <SceneErrorBoundary>
          <Scene />
        </SceneErrorBoundary>
        {/* Product type label */}
        <div className="absolute left-4 top-4 rounded-lg bg-white/90 px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm backdrop-blur-sm">
          {product.name}
        </div>
        {/* Day/Night toggle */}
        <DayNightToggle />
      </div>

      {/* Options panel — 40% on desktop, rest of screen on mobile */}
      <div className="flex flex-1 flex-col overflow-hidden border-l border-neutral-200 lg:w-[40%]">
        {/* Approximate rendering disclaimer */}
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-700">
          This is an approximate 3D visualization. Actual sign appearance, color, and lighting may vary from this preview.
        </div>

        {/* Scrollable options area — extra bottom padding for the sticky bar */}
        <div className="flex-1 overflow-y-auto p-6 pb-48">
          <OptionsPanel />
        </div>
      </div>

      {/* Sticky bottom price bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        {/* Price breakdown (collapsed on mobile, always visible on desktop) */}
        {hasRequiredInput && breakdown.total > 0 && (
          <div className="hidden border-b border-neutral-100 px-6 py-3 lg:block">
            <div className="mx-auto flex max-w-7xl flex-wrap gap-x-6 gap-y-1 text-xs text-neutral-500">
              {(productCategory === "CHANNEL_LETTERS") && (
                <span>
                  Letters ({config.text.replace(/\s+/g, "").length} x {config.height}&quot;):{" "}
                  {formatPrice(breakdown.letterPrice)}
                </span>
              )}
              {productCategory === "DIMENSIONAL_LETTERS" && (() => {
                const activeConfig = getActiveConfig();
                if ("text" in activeConfig) {
                  return (
                    <span>
                      Letters ({activeConfig.text.replace(/\s+/g, "").length} x {(activeConfig as { height: number }).height}&quot;):{" "}
                      {formatPrice(breakdown.letterPrice)}
                    </span>
                  );
                }
                return null;
              })()}
              {(productCategory === "CABINET_SIGNS" || productCategory === "LIT_SHAPES" || productCategory === "PRINT_SIGNS") && (
                <span>
                  {dimensions.totalWidthInches}&quot; x {dimensions.heightInches}&quot; ({dimensions.squareFeet.toFixed(1)} sqft):{" "}
                  {formatPrice(breakdown.letterPrice)}
                </span>
              )}
              {productCategory === "LOGOS" && (
                <span>
                  {dimensions.totalWidthInches}&quot; x {dimensions.heightInches}&quot;:{" "}
                  {formatPrice(breakdown.letterPrice)}
                </span>
              )}
              {["LIGHT_BOX_SIGNS", "BLADE_SIGNS", "VINYL_BANNERS"].includes(productCategory) && (
                <span>
                  {dimensions.totalWidthInches}&quot; &times; {dimensions.heightInches}&quot; ({dimensions.squareFeet.toFixed(1)} sqft):{" "}
                  {formatPrice(breakdown.letterPrice)}
                </span>
              )}
              {productCategory === "NEON_SIGNS" && (
                <span>
                  Neon text ({(getActiveConfig() as { text: string }).text.replace(/\s+/g, "").length} letters &times; {(getActiveConfig() as { height: number }).height}&quot;):{" "}
                  {formatPrice(breakdown.letterPrice)}
                </span>
              )}
              {productCategory === "SIGN_POSTS" && (() => {
                const activeConfig = getActiveConfig();
                return (
                  <span>
                    Post + {("signWidthInches" in activeConfig ? activeConfig.signWidthInches : dimensions.totalWidthInches)}&quot; x {("signHeightInches" in activeConfig ? activeConfig.signHeightInches : dimensions.heightInches)}&quot; panel:{" "}
                    {formatPrice(breakdown.letterPrice)}
                  </span>
                );
              })()}
              {breakdown.multipliers.length > 0 && (
                <span>
                  After options: {formatPrice(breakdown.priceAfterMultipliers)}
                </span>
              )}
              {breakdown.paintingExtra > 0 && (
                <span>Multicolor: +{formatPrice(breakdown.paintingExtra)}</span>
              )}
              {breakdown.racewayPrice > 0 && (
                <span>Raceway: +{formatPrice(breakdown.racewayPrice)}</span>
              )}
              {breakdown.vinylPrice > 0 && (
                <span>Vinyl: +{formatPrice(breakdown.vinylPrice)}</span>
              )}
              {breakdown.minOrderApplied && (
                <span className="text-amber-600" title="Our minimum order covers setup, materials, and quality assurance for any custom sign project">
                  Minimum order: {formatPrice(breakdown.total)}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Main action bar */}
        <div className="px-4 py-3 sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            {/* Price */}
            <div className="shrink-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                Total
              </div>
              <div className="text-xl font-bold text-neutral-900 sm:text-2xl">
                {hasRequiredInput ? formatPrice(breakdown.total) : "$0.00"}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
              {/* Save Design */}
              <button
                onClick={handleSaveDesign}
                disabled={!hasRequiredInput || savingDesign}
                className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-2.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
                title="Save Design"
              >
                <Save className="h-4 w-4" />
                <span className="hidden sm:inline">Save</span>
              </button>

              {/* Wall Mockup */}
              <button
                onClick={handleWallMockup}
                className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-2.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 sm:px-4"
                title="Wall Mockup"
              >
                <ImageIcon className="h-4 w-4" />
                <span className="hidden sm:inline">Wall Mockup</span>
              </button>

              {/* AR Preview */}
              <ArButton
                getSceneObject={getSignGroupRef}
                disabled={!hasRequiredInput}
              />

              {/* Add to Cart */}
              <button
                onClick={handleAddToCart}
                disabled={!canAddToCart}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-6"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Add to Cart</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
