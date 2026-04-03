"use client";

import Link from "next/link";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice } from "@/lib/utils";
import { Trash2, Plus, Minus } from "lucide-react";
import type { UnifiedCartItem } from "@/types/configurator";

function getItemSummary(item: UnifiedCartItem): { title: string; specs: string[] } {
  const config = item.configuration;

  if ("text" in config && "height" in config && "led" in config) {
    // Channel letters or dimensional letters
    return {
      title: `"${config.text}" - ${config.height}" tall`,
      specs: [
        "lit" in config ? config.lit : "",
        "led" in config ? String(config.led) : "",
        "font" in config ? config.font : "",
      ].filter(Boolean),
    };
  }

  if ("widthInches" in config && "heightInches" in config) {
    // Lit shapes, cabinets, logos, prints
    return {
      title: `${config.widthInches}" × ${config.heightInches}"`,
      specs: [
        "led" in config && config.led ? String(config.led) : "",
        "mounting" in config ? String(config.mounting) : "",
      ].filter(Boolean),
    };
  }

  if ("signWidthInches" in config) {
    // Sign posts
    return {
      title: `${config.signWidthInches}" × ${config.signHeightInches}" sign`,
      specs: [
        config.doubleSided ? "Double sided" : "Single sided",
      ],
    };
  }

  return { title: item.productName, specs: [] };
}

function getItemAltText(item: UnifiedCartItem): string {
  const config = item.configuration;
  if ("text" in config && typeof config.text === "string") {
    return config.text;
  }
  return item.productName;
}

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const getTotal = useCartStore((s) => s.getTotal);
  const clearCart = useCartStore((s) => s.clearCart);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-900">
            Your cart is empty
          </h1>
          <p className="mt-2 text-neutral-500">
            Design a custom sign and add it to your cart to get started.
          </p>
          <Link
            href="/products"
            className="mt-6 inline-block rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-neutral-900">Shopping Cart</h1>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Cart items */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {items.map((item, index) => {
              const summary = getItemSummary(item);
              return (
                <div
                  key={index}
                  className="flex gap-4 rounded-xl border border-neutral-200 bg-white p-4"
                >
                  {/* Thumbnail */}
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={getItemAltText(item)}
                      className="h-20 w-20 flex-shrink-0 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-lg bg-neutral-100">
                      <span className="text-xs font-bold text-neutral-400">3D</span>
                    </div>
                  )}

                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-neutral-900">
                          {item.productName}
                        </h3>
                        <p className="text-sm text-neutral-500">
                          {summary.title}
                        </p>
                        {summary.specs.length > 0 && (
                          <p className="text-xs text-neutral-400">
                            {summary.specs.join(" | ")}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => removeItem(index)}
                        className="text-neutral-400 transition hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      {/* Quantity controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            updateQuantity(index, item.quantity - 1)
                          }
                          className="flex h-7 w-7 items-center justify-center rounded border border-neutral-300 text-neutral-600 hover:bg-neutral-50"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(index, item.quantity + 1)
                          }
                          className="flex h-7 w-7 items-center justify-center rounded border border-neutral-300 text-neutral-600 hover:bg-neutral-50"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <span className="font-semibold text-neutral-900">
                        {formatPrice(item.unitPrice * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={clearCart}
            className="mt-4 text-sm text-neutral-500 underline transition hover:text-neutral-700"
          >
            Clear cart
          </button>
        </div>

        {/* Order summary */}
        <div>
          <div className="rounded-xl border border-neutral-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-neutral-900">
              Order Summary
            </h2>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm text-neutral-600">
                <span>Subtotal</span>
                <span>{formatPrice(getTotal())}</span>
              </div>
              <div className="flex justify-between text-sm text-neutral-600">
                <span>Shipping</span>
                <span className="text-green-600">Free</span>
              </div>
              <div className="border-t border-neutral-200 pt-2">
                <div className="flex justify-between text-base font-semibold text-neutral-900">
                  <span>Total</span>
                  <span>{formatPrice(getTotal())}</span>
                </div>
              </div>
            </div>

            <button className="mt-6 w-full rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">
              Proceed to Checkout
            </button>

            <p className="mt-3 text-center text-xs text-neutral-400">
              Secure checkout powered by Stripe
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
