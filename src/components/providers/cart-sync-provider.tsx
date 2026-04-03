"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import { useCartStore } from "@/stores/cart-store";
import { fetchServerCart, syncCartToServer, mergeCartItems } from "@/lib/cart-sync";
import type { UnifiedCartItem, AnySignConfiguration } from "@/types/configurator";
import type { ProductCategory, ProductTypeSlug } from "@/types/product";

interface Props {
  children: ReactNode;
}

/**
 * Syncs the Zustand cart store with the server-side cart when the user
 * authenticates. On sign-in, it fetches the server cart, merges with
 * the local cart (local takes precedence for duplicates), and pushes
 * the merged result back to the server.
 */
export function CartSyncProvider({ children }: Props) {
  const { data: session, status } = useSession();
  const hasSynced = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || !session?.user?.id) {
      // Reset sync flag when user signs out
      if (status === "unauthenticated") {
        hasSynced.current = false;
      }
      return;
    }

    // Only sync once per auth session
    if (hasSynced.current) return;
    hasSynced.current = true;

    async function syncCart() {
      try {
        const localItems = useCartStore.getState().items;
        const serverItems = await fetchServerCart();

        // Adapt server items to UnifiedCartItem shape
        const adaptedServerItems: UnifiedCartItem[] = serverItems.map((item) => ({
          productCategory: (item.productCategory as ProductCategory) || "CHANNEL_LETTERS",
          productType: item.productType as ProductTypeSlug,
          productName: item.productName,
          configuration: item.configuration as unknown as AnySignConfiguration,
          dimensions: {
            totalWidthInches: 0,
            heightInches: 0,
            squareFeet: 0,
            linearFeet: 0,
            letterWidths: [],
          },
          thumbnailUrl: item.thumbnailUrl,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }));

        // Merge: local items take precedence
        const merged = mergeCartItems(localItems, adaptedServerItems);

        // Update local store if we got new items from the server
        if (merged.length !== localItems.length) {
          useCartStore.setState({ items: merged });
        }

        // Sync merged cart back to server
        const itemsForServer = merged.map((item) => ({
          productCategory: item.productCategory,
          productType: item.productType,
          productName: item.productName,
          configuration: item.configuration,
          thumbnailUrl: item.thumbnailUrl,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }));
        await syncCartToServer(itemsForServer);
      } catch (error) {
        console.error("Cart sync error:", error);
      }
    }

    syncCart();
  }, [status, session?.user?.id]);

  return <>{children}</>;
}
