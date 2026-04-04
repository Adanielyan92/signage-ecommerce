"use client";

import { useProducts } from "@/hooks/use-products";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function ProductCatalogClient() {
  const { products, loading, error } = useProducts();

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error || products.length === 0) return null;

  // Group products by category
  const grouped = products.reduce<Record<string, typeof products>>((acc, p) => {
    const cat = p.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  // Format category name: "CHANNEL_LETTERS" → "Channel Letters"
  const formatCategory = (cat: string) =>
    cat.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\bSign(s?)\b/gi, "Sign$1");

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold">All Products</h2>
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="rounded-xl border border-neutral-200 p-6">
          <h3 className="mb-4 text-lg font-semibold text-neutral-800">
            {formatCategory(category)}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((product) => (
              <Link
                key={product.slug}
                href={`/configure/${product.slug}`}
                className="group flex items-center justify-between rounded-lg border border-neutral-100 p-4 transition-colors hover:border-blue-200 hover:bg-blue-50/50"
              >
                <div>
                  <p className="font-medium text-neutral-900">{product.name}</p>
                  {product.description && (
                    <p className="mt-1 text-sm text-neutral-500 line-clamp-1">
                      {product.description}
                    </p>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
