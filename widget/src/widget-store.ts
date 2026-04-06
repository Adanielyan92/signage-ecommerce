import { create } from "zustand";
import type { WidgetConfig, WidgetProduct, WidgetPriceBreakdown } from "./api-client";
import { widgetApi } from "./api-client";

interface WidgetState {
  config: WidgetConfig;
  product: WidgetProduct | null;
  optionValues: Record<string, unknown>;
  priceBreakdown: WidgetPriceBreakdown | null;
  loading: boolean;
  pricingLoading: boolean;
  error: string | null;

  initialize: (config: WidgetConfig, productSlug: string) => Promise<void>;
  setOptionValue: (key: string, value: unknown) => void;
  recalculatePrice: () => Promise<void>;
}

export const useWidgetStore = create<WidgetState>((set, get) => ({
  config: { apiUrl: "" },
  product: null,
  optionValues: {},
  priceBreakdown: null,
  loading: true,
  pricingLoading: false,
  error: null,

  initialize: async (config, productSlug) => {
    set({ config, loading: true, error: null });
    try {
      const { products } = await widgetApi.getProduct(config, productSlug);
      if (products.length === 0) {
        set({ loading: false, error: "Product not found" });
        return;
      }
      const product = products[0];

      // Extract default option values from product schema
      const schema = product.productSchema as {
        options?: Array<{ id: string; defaultValue?: unknown }>;
      } | null;
      const defaults: Record<string, unknown> = {};
      if (schema?.options) {
        for (const opt of schema.options) {
          if (opt.defaultValue !== undefined) {
            defaults[opt.id] = opt.defaultValue;
          }
        }
      }

      set({ product, optionValues: defaults, loading: false });

      // Initial price calculation
      get().recalculatePrice();
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load product",
      });
    }
  },

  setOptionValue: (key, value) => {
    set((state) => ({
      optionValues: { ...state.optionValues, [key]: value },
    }));
    // Debounced price recalculation
    clearTimeout((globalThis as Record<string, unknown>).__widgetPriceTimer as number);
    (globalThis as Record<string, unknown>).__widgetPriceTimer = setTimeout(
      () => get().recalculatePrice(),
      300,
    );
  },

  recalculatePrice: async () => {
    const { config, product, optionValues } = get();
    if (!product) return;

    set({ pricingLoading: true });
    try {
      const { breakdown } = await widgetApi.calculatePrice(
        config,
        product.id,
        optionValues,
      );
      set({ priceBreakdown: breakdown, pricingLoading: false });
    } catch (err) {
      console.error("Pricing error:", err);
      set({ pricingLoading: false });
    }
  },
}));
