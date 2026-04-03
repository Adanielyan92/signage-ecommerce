import type { UnifiedCartItem } from "@/types/configurator";

interface ServerCartItem {
  productCategory?: string;
  productType: string;
  productName: string;
  configuration: Record<string, unknown>;
  thumbnailUrl?: string;
  quantity: number;
  unitPrice: number;
}

/**
 * Fetch the user's server-side cart items.
 * Returns an empty array if the request fails.
 */
export async function fetchServerCart(): Promise<ServerCartItem[]> {
  try {
    const response = await fetch("/api/cart", {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      console.error("Failed to fetch server cart:", response.statusText);
      return [];
    }

    const data = await response.json();
    return data.items ?? [];
  } catch (error) {
    console.error("Error fetching server cart:", error);
    return [];
  }
}

/**
 * Sync the local cart state to the server.
 * Replaces the entire server cart with the provided items.
 */
export async function syncCartToServer(items: Omit<UnifiedCartItem, "dimensions">[]): Promise<boolean> {
  try {
    const response = await fetch("/api/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items }),
    });

    if (!response.ok) {
      console.error("Failed to sync cart to server:", response.statusText);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error syncing cart to server:", error);
    return false;
  }
}

/**
 * Merge server cart items with local cart items.
 * Local items take precedence. Server items with a different
 * productType+configuration combo are appended.
 */
export function mergeCartItems(
  localItems: UnifiedCartItem[],
  serverItems: UnifiedCartItem[]
): UnifiedCartItem[] {
  const localKeys = new Set(
    localItems.map((item) => `${item.productType}:${JSON.stringify(item.configuration)}`)
  );
  const uniqueServerItems = serverItems.filter(
    (item) => !localKeys.has(`${item.productType}:${JSON.stringify(item.configuration)}`)
  );
  return [...localItems, ...uniqueServerItems];
}
