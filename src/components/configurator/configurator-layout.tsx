"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState, useMemo, Component, type ReactNode, type ErrorInfo } from "react";
import type { AnyProduct } from "@/engine/product-definitions";
import { OptionsPanel } from "./options-panel";
import { useConfiguratorStore } from "@/stores/configurator-store";
import { useCartStore } from "@/stores/cart-store";
import { useMockupStore } from "@/stores/mockup-store";
import { formatPrice } from "@/lib/utils";
import type { UnifiedCartItem } from "@/types/configurator";
import { captureCanvasScreenshot, captureCanvasScreenshotAsync } from "@/lib/capture-screenshot";
import { validateChannelLetterConfig } from "@/lib/validation";
import { useSession } from "next-auth/react";
import { DayNightToggle } from "./day-night-toggle";
import { WizardProvider } from "./wizard/wizard-context";
import { StepIndicator } from "./wizard/step-indicator";
import { WizardNavigation } from "./wizard/wizard-navigation";
import { MobileConfigurator } from "./mobile-configurator";
import { PriceDisplay } from "./price-display";
import { Save, Image as ImageIcon, ShoppingCart, RotateCw } from "lucide-react";
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

const WIZARD_STEPS = [
  { id: "type", label: "Type" },
  { id: "text", label: "Text & Font" },
  { id: "size", label: "Size" },
  { id: "style", label: "Style & Color" },
  { id: "review", label: "Review" },
];

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
  const isFlipped = useConfiguratorStore((s) => s.isFlipped);
  const toggleFlip = useConfiguratorStore((s) => s.toggleFlip);
  const cabinetConfig = useConfiguratorStore((s) => s.cabinetConfig);
  const bladeConfig = useConfiguratorStore((s) => s.bladeConfig);
  const signPostConfig = useConfiguratorStore((s) => s.signPostConfig);
  const lightBoxConfig = useConfiguratorStore((s) => s.lightBoxConfig);
  const bannerConfig = useConfiguratorStore((s) => s.bannerConfig);
  const addItem = useCartStore((s) => s.addItem);
  const setMockupSignConfig = useMockupStore((s) => s.setSignConfig);
  const router = useRouter();
  const { data: session } = useSession();
  const [savingDesign, setSavingDesign] = useState(false);

  const isDoubleSided = useMemo(() => {
    switch (productCategory) {
      case "CABINET_SIGNS":
        return cabinetConfig.productType.startsWith("double");
      case "BLADE_SIGNS":
        return bladeConfig.doubleSided;
      case "SIGN_POSTS":
        return signPostConfig.doubleSided;
      case "LIGHT_BOX_SIGNS":
        return lightBoxConfig.productType === "light-box-double";
      case "VINYL_BANNERS":
        return bannerConfig.doubleSided;
      default:
        return false;
    }
  }, [productCategory, cabinetConfig, bladeConfig, signPostConfig, lightBoxConfig, bannerConfig]);

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

  const canAddToCart = (() => {
    if (!hasRequiredInput || breakdown.total <= 0) return false;
    if (productCategory === "CHANNEL_LETTERS") {
      return validateChannelLetterConfig(config).valid;
    }
    if (productCategory === "DIMENSIONAL_LETTERS" || productCategory === "NEON_SIGNS") {
      const active = getActiveConfig();
      if ("text" in active && "height" in active) {
        return validateChannelLetterConfig(active as { text: string; height: number }).valid;
      }
    }
    // Panel-based: check dimensions are valid
    if (dimensions.totalWidthInches >= 4 && dimensions.heightInches >= 6) {
      return true;
    }
    return false;
  })();

  const handleWallMockup = () => {
    const activeConfig = getActiveConfig();
    setMockupSignConfig(productCategory, product.slug, { ...activeConfig } as Record<string, unknown>);
    router.push("/mockup");
  };

  const handleAddToCart = async () => {
    if (!canAddToCart) return;

    const activeConfig = getActiveConfig();
    // Capture with async to ensure frame is rendered
    const thumbnailUrl = await captureCanvasScreenshotAsync() ?? undefined;

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
      const thumbnailUrl = await captureCanvasScreenshotAsync();
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
    <>
    {/* Mobile layout */}
    <MobileConfigurator
      sceneElement={<SceneErrorBoundary><Scene /></SceneErrorBoundary>}
      optionsElement={<OptionsPanel />}
      priceElement={<PriceDisplay />}
    />

    {/* Desktop layout */}
    <div className="hidden h-[calc(100vh-4rem)] lg:flex">
      {/* 3D Viewport — 60% on desktop */}
      <div className="relative h-full w-[60%] bg-neutral-100">
        <SceneErrorBoundary>
          <Scene />
        </SceneErrorBoundary>
        {/* Product type label */}
        <div className="absolute left-4 top-4 rounded-lg bg-white/90 px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm backdrop-blur-sm">
          {product.name}
        </div>
        {/* Day/Night toggle */}
        <DayNightToggle />
        {/* Flip button for double-sided products */}
        {isDoubleSided && (
          <button
            onClick={toggleFlip}
            className="absolute right-4 top-14 flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm backdrop-blur-sm transition hover:bg-white"
          >
            <RotateCw className="h-4 w-4" />
            {isFlipped ? "Front View" : "Back View"}
          </button>
        )}
      </div>

      {/* Options panel — 40% on desktop, rest of screen on mobile */}
      <div className="flex flex-1 flex-col overflow-hidden border-l border-brand-muted lg:w-[40%]">
        {/* Approximate rendering disclaimer */}
        <div className="border-b border-brand-warning/30 bg-brand-warning/5 px-4 py-2 text-center text-xs text-brand-warning">
          This is an approximate 3D visualization. Actual sign appearance, color, and lighting may vary from this preview.
        </div>

        {/* Wizard-wrapped options area */}
        <WizardProvider stepDefinitions={WIZARD_STEPS}>
          <StepIndicator />
          <div className="flex-1 overflow-y-auto p-6 pb-4">
            <OptionsPanel />
          </div>
          {/* Inline price display above wizard nav */}
          <div className="border-t border-brand-muted bg-white px-6 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                  Estimated Total
                </p>
                <p className="font-heading text-2xl font-bold text-neutral-900">
                  {hasRequiredInput && breakdown.total > 0
                    ? formatPrice(breakdown.total)
                    : "--"}
                </p>
              </div>
              {hasRequiredInput && breakdown.total > 0 && breakdown.minOrderApplied && (
                <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-medium text-amber-700">
                  Min. order applied
                </span>
              )}
            </div>
          </div>
          <WizardNavigation />
        </WizardProvider>
      </div>

      {/* Sticky bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-neutral-200 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        <div className="px-4 py-4 sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            {/* Price */}
            <div className="shrink-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                Total
              </div>
              <div className="text-2xl font-bold text-neutral-900 sm:text-3xl">
                {hasRequiredInput && breakdown.total > 0
                  ? formatPrice(breakdown.total)
                  : "--"}
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
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:px-6"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Add to Cart</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
