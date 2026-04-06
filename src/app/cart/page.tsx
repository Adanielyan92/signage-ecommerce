"use client";

import Link from "next/link";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice } from "@/lib/utils";
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight, ArrowLeft, Pencil } from "lucide-react";
import type { UnifiedCartItem } from "@/types/configurator";

function getItemSummary(item: UnifiedCartItem): { title: string; specs: string[] } {
  const config = item.configuration;
  const cat = item.productCategory;

  if (cat === "CHANNEL_LETTERS" && "text" in config && "height" in config) {
    return {
      title: `"${config.text}" - ${config.height}" tall`,
      specs: [
        "led" in config ? String(config.led) : "",
        "font" in config ? String(config.font) : "",
      ].filter(Boolean),
    };
  }

  if (cat === "DIMENSIONAL_LETTERS" && "text" in config && "height" in config) {
    return {
      title: `"${config.text}" - ${config.height}" tall`,
      specs: [
        "productType" in config ? String(config.productType) : "",
      ].filter(Boolean),
    };
  }

  if (cat === "CABINET_SIGNS" && "widthInches" in config && "heightInches" in config) {
    return {
      title: `${config.widthInches}" x ${config.heightInches}"`,
      specs: [
        "led" in config && config.led ? String(config.led) : "",
      ].filter(Boolean),
    };
  }

  if (cat === "LIT_SHAPES" && "widthInches" in config && "heightInches" in config) {
    return {
      title: `${config.widthInches}" x ${config.heightInches}"`,
      specs: [
        "led" in config && config.led ? String(config.led) : "",
      ].filter(Boolean),
    };
  }

  if (cat === "LOGOS" && "widthInches" in config && "heightInches" in config) {
    return {
      title: `${config.widthInches}" x ${config.heightInches}"`,
      specs: [
        "led" in config && config.led ? "Lit" : "Non-lit",
      ].filter(Boolean),
    };
  }

  if (cat === "PRINT_SIGNS" && "widthInches" in config && "heightInches" in config) {
    return {
      title: `${config.widthInches}" x ${config.heightInches}"`,
      specs: [
        "productType" in config ? String(config.productType) : "",
      ].filter(Boolean),
    };
  }

  if (cat === "SIGN_POSTS" && "signWidthInches" in config && "signHeightInches" in config && "postHeight" in config) {
    return {
      title: `${config.signWidthInches}" x ${config.signHeightInches}" panel`,
      specs: [
        `${config.postHeight}" post`,
      ],
    };
  }

  if (cat === "LIGHT_BOX_SIGNS" && "widthInches" in config && "heightInches" in config) {
    return {
      title: `${config.widthInches}" x ${config.heightInches}"`,
      specs: [
        "led" in config ? String(config.led) : "",
        "faceType" in config ? String(config.faceType) : "",
      ].filter(Boolean),
    };
  }

  if (cat === "BLADE_SIGNS" && "widthInches" in config && "heightInches" in config) {
    return {
      title: `${config.widthInches}" x ${config.heightInches}"`,
      specs: [
        "illuminated" in config && config.illuminated ? "Illuminated" : "Non-lit",
        "doubleSided" in config && config.doubleSided ? "Double sided" : "Single sided",
      ].filter(Boolean),
    };
  }

  if (cat === "NEON_SIGNS" && "text" in config && "height" in config) {
    return {
      title: `"${config.text}" - ${config.height}" tall`,
      specs: [
        "neonColor" in config ? String(config.neonColor) : "",
      ].filter(Boolean),
    };
  }

  if (cat === "VINYL_BANNERS" && "widthInches" in config && "heightInches" in config) {
    return {
      title: `${config.widthInches}" x ${config.heightInches}"`,
      specs: [
        "material" in config ? String(config.material) : "",
        "finishing" in config ? String(config.finishing) : "",
      ].filter(Boolean),
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
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-muted">
            <ShoppingCart className="h-8 w-8 text-brand-text-secondary" />
          </div>
          <h1 className="mt-6 font-heading text-2xl font-bold text-brand-navy">
            Your cart is empty
          </h1>
          <p className="mt-2 text-brand-text-secondary">
            Design a custom sign and add it to your cart to get started.
          </p>
          <Link
            href="/products"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-accent/90"
          >
            Browse Products
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold text-brand-navy">Shopping Cart</h1>
        <Link
          href="/products"
          className="flex items-center gap-1 text-sm font-medium text-brand-accent transition hover:text-brand-accent/80"
        >
          <ArrowLeft className="h-4 w-4" />
          Continue Shopping
        </Link>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Cart items */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {items.map((item, index) => {
              const summary = getItemSummary(item);
              return (
                <div
                  key={index}
                  className="flex gap-4 rounded-xl border border-brand-muted bg-white p-4"
                >
                  {/* Thumbnail */}
                  {item.thumbnailUrl ? (
                    <img
                      src={item.thumbnailUrl}
                      alt={getItemAltText(item)}
                      className="h-28 w-28 flex-shrink-0 rounded-lg border border-brand-muted object-cover"
                    />
                  ) : (
                    <div className="flex h-28 w-28 flex-shrink-0 items-center justify-center rounded-lg bg-brand-bg">
                      <span className="text-xs font-bold text-brand-text-secondary">3D</span>
                    </div>
                  )}

                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-heading font-semibold text-brand-navy">
                          {item.productName}
                        </h3>
                        <p className="text-sm text-brand-text-secondary">
                          {summary.title}
                        </p>
                        {summary.specs.length > 0 && (
                          <p className="text-xs text-brand-text-secondary/70">
                            {summary.specs.join(" | ")}
                          </p>
                        )}
                        <Link
                          href={`/configure/${item.productType}`}
                          className="mt-2 inline-flex items-center gap-1 rounded-lg border border-brand-muted px-3 py-1.5 text-xs font-medium text-brand-accent transition hover:bg-brand-accent/5"
                        >
                          <Pencil className="h-3 w-3" />
                          Edit Design
                        </Link>
                      </div>
                      <button
                        onClick={() => removeItem(index)}
                        className="text-brand-text-secondary/50 transition hover:text-brand-error"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      {/* Quantity controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            updateQuantity(index, item.quantity - 1)
                          }
                          className="flex h-7 w-7 items-center justify-center rounded border border-brand-muted text-brand-text-secondary hover:bg-brand-bg"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-medium text-brand-navy">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() =>
                            updateQuantity(index, item.quantity + 1)
                          }
                          className="flex h-7 w-7 items-center justify-center rounded border border-brand-muted text-brand-text-secondary hover:bg-brand-bg"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <span className="font-heading font-bold text-brand-navy">
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
            className="mt-4 text-sm text-brand-text-secondary underline transition hover:text-brand-navy"
          >
            Clear cart
          </button>
        </div>

        {/* Order summary */}
        <div>
          <div className="rounded-xl border border-brand-muted bg-white p-6">
            <h2 className="font-heading text-lg font-semibold text-brand-navy">
              Order Summary
            </h2>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm text-brand-text-secondary">
                <span>Subtotal</span>
                <span>{formatPrice(getTotal())}</span>
              </div>
              <div className="flex justify-between text-sm text-brand-text-secondary">
                <span>Shipping</span>
                <span className="text-brand-success">Free</span>
              </div>
              <div className="border-t border-brand-muted pt-2">
                <div className="flex justify-between text-base font-semibold text-brand-navy">
                  <span>Total</span>
                  <span>{formatPrice(getTotal())}</span>
                </div>
              </div>
            </div>

            <button className="mt-6 w-full rounded-lg bg-brand-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-accent/90">
              Proceed to Checkout
            </button>

            <p className="mt-3 text-center text-xs text-brand-text-secondary/60">
              Secure checkout powered by Stripe
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
