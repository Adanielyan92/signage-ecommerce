"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { UnifiedCartItem } from "@/types/configurator";

interface CartState {
  items: UnifiedCartItem[];
  addItem: (item: UnifiedCartItem) => void;
  removeItem: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clearCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        set((state) => ({
          items: [...state.items, item],
        }));
      },

      removeItem: (index) => {
        set((state) => ({
          items: state.items.filter((_, i) => i !== index),
        }));
      },

      updateQuantity: (index, quantity) => {
        set((state) => ({
          items: state.items.map((item, i) =>
            i === index ? { ...item, quantity: Math.max(1, quantity) } : item
          ),
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      getTotal: () => {
        return get().items.reduce(
          (sum, item) => sum + item.unitPrice * item.quantity,
          0
        );
      },

      getItemCount: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: "signage-cart",
      version: 2,
      migrate: (persistedState: unknown, version: number) => {
        if (version < 2) {
          const state = persistedState as { items: Record<string, unknown>[] };
          if (state?.items) {
            state.items = state.items.map((item) => ({
              ...item,
              productCategory: item.productCategory || "CHANNEL_LETTERS",
            }));
          }
        }
        return persistedState as CartState;
      },
    }
  )
);
