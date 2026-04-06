// widget/src/api-client.ts

export interface WidgetConfig {
  apiUrl: string;
  tenantSlug?: string;
  apiKey?: string;
}

export interface WidgetProduct {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  productSchema: unknown;
  renderConfig: unknown;
}

export interface WidgetPriceBreakdown {
  basePrice: number;
  appliedMultipliers: Array<{ name: string; value: number }>;
  subtotal: number;
  total: number;
  minOrderApplied: boolean;
  lineItems: Array<{ label: string; amount: number }>;
}

async function widgetFetch<T>(
  config: WidgetConfig,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = `${config.apiUrl}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };
  if (config.tenantSlug) headers["X-Tenant-Slug"] = config.tenantSlug;
  if (config.apiKey) headers["X-API-Key"] = config.apiKey;

  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Widget API error ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json() as Promise<T>;
}

export const widgetApi = {
  getProduct(config: WidgetConfig, productSlug: string) {
    return widgetFetch<{ products: WidgetProduct[] }>(
      config,
      `/api/v1/products?slug=${encodeURIComponent(productSlug)}`,
    );
  },

  calculatePrice(
    config: WidgetConfig,
    productId: string,
    optionValues: Record<string, unknown>,
    dimensions?: { widthInches?: number; heightInches?: number },
  ) {
    return widgetFetch<{ breakdown: WidgetPriceBreakdown }>(
      config,
      "/api/v1/pricing/calculate",
      {
        method: "POST",
        body: JSON.stringify({ productId, optionValues, dimensions }),
      },
    );
  },
};
