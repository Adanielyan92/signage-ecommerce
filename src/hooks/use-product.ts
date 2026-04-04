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

export function useProduct(slug: string) {
  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchProduct() {
      setLoading(true);
      setError(null);
      setProduct(null);

      try {
        const url = new URL("/api/v1/products", window.location.origin);
        url.searchParams.set("slug", slug);

        const res = await fetch(url.toString());

        if (!res.ok) {
          throw new Error(`Failed to fetch product: ${res.status} ${res.statusText}`);
        }

        const data: { products: ApiProduct[] } = await res.json();
        const match = data.products.find((p) => p.slug === slug) ?? null;

        if (!cancelled) {
          setProduct(match);
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

    fetchProduct();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { product, loading, error };
}
