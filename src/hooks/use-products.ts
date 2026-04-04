"use client";

import { useState, useEffect } from "react";

interface ApiProduct {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  imageUrl: string | null;
  isActive: boolean;
  productSchema: unknown;
  pricingParams: Record<string, number> | null;
  renderConfig: unknown;
  pricingFormula: { id: string; name: string; type: string } | null;
}

export function useProducts(category?: string) {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchProducts() {
      setLoading(true);
      setError(null);

      try {
        const url = new URL("/api/v1/products", window.location.origin);
        if (category) {
          url.searchParams.set("category", category);
        }

        const res = await fetch(url.toString());

        if (!res.ok) {
          throw new Error(`Failed to fetch products: ${res.status} ${res.statusText}`);
        }

        const data: { products: ApiProduct[] } = await res.json();

        if (!cancelled) {
          setProducts(data.products);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchProducts();

    return () => {
      cancelled = true;
    };
  }, [category]);

  return { products, loading, error };
}
