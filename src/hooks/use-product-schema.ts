import { useState, useEffect } from "react";
import type { ProductOption } from "@/types/product";

export function useProductSchema(productSlug: string | null) {
  const [data, setData] = useState<{ pricingParams?: any, productSchema?: any } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!productSlug) return;
    setIsLoading(true);
    fetch(`/api/admin/pricing/${productSlug}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch");
        return res.json();
      })
      .then((json) => {
        setData(json);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err);
        setIsLoading(false);
      });
  }, [productSlug]);

  let options: ProductOption[] = [];
  if (data?.productSchema?.options) {
    options = data.productSchema.options;
  }

  return {
    pricingParams: data?.pricingParams || null,
    productSchema: data?.productSchema || null,
    options,
    isLoading,
    isError: error,
  };
}
