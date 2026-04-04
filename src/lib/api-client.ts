// Typed fetch wrapper for the v1 API endpoints.

// ---------------------------------------------------------------------------
// Exported types
// ---------------------------------------------------------------------------

export interface ApiProduct {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  imageUrl: string | null;
  isActive: boolean;
  productSchema: unknown;
  pricingParams: unknown;
  renderConfig: unknown;
  pricingFormula: { id: string; name: string; type: string } | null;
}

export interface ApiPriceBreakdown {
  basePrice: number;
  appliedMultipliers: Array<{ name: string; value: number }>;
  priceAfterMultipliers: number;
  lineItems: Array<{ label: string; amount: number }>;
  subtotal: number;
  total: number;
  minOrderApplied: boolean;
}

export interface CheckoutItem {
  productId: string;
  optionValues: Record<string, unknown>;
  quantity?: number;
  clientPrice?: number;
  description?: string;
}

// ---------------------------------------------------------------------------
// ApiError
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ---------------------------------------------------------------------------
// Core fetch wrapper
// ---------------------------------------------------------------------------

interface FetchOptions {
  tenantSlug?: string;
  apiKey?: string;
}

async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  options: FetchOptions = {},
): Promise<T> {
  const url = `/api/v1${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string> | undefined),
  };

  if (options.tenantSlug) {
    headers["X-Tenant-Slug"] = options.tenantSlug;
  }
  if (options.apiKey) {
    headers["X-API-Key"] = options.apiKey;
  }

  const response = await fetch(url, { ...init, headers });

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = await response.text();
    }

    const message =
      typeof body === "object" && body !== null && "error" in body
        ? String((body as { error: unknown }).error)
        : `HTTP ${response.status}`;

    throw new ApiError(response.status, message, body);
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Typed api object
// ---------------------------------------------------------------------------

export const api = {
  products: {
    /**
     * GET /api/v1/products
     * Supports optional filtering by category or slug.
     */
    list(
      params?: { category?: string; slug?: string },
      options?: FetchOptions,
    ): Promise<{ products: ApiProduct[] }> {
      const query = new URLSearchParams();
      if (params?.category) query.set("category", params.category);
      if (params?.slug) query.set("slug", params.slug);
      const qs = query.size > 0 ? `?${query.toString()}` : "";
      return apiFetch<{ products: ApiProduct[] }>(`/products${qs}`, {}, options);
    },

    /**
     * GET /api/v1/products/:id
     */
    get(productId: string, options?: FetchOptions): Promise<{ product: ApiProduct }> {
      return apiFetch<{ product: ApiProduct }>(`/products/${productId}`, {}, options);
    },
  },

  pricing: {
    /**
     * POST /api/v1/pricing/calculate
     */
    calculate(
      productId: string,
      optionValues: Record<string, unknown>,
      dimensions?: { widthInches?: number; heightInches?: number },
      options?: FetchOptions,
    ): Promise<{ breakdown: ApiPriceBreakdown }> {
      return apiFetch<{ breakdown: ApiPriceBreakdown }>(
        "/pricing/calculate",
        {
          method: "POST",
          body: JSON.stringify({ productId, optionValues, dimensions }),
        },
        options,
      );
    },
  },

  checkout: {
    /**
     * POST /api/v1/checkout
     */
    createSession(
      items: CheckoutItem[],
      successUrl: string,
      cancelUrl: string,
      customerEmail?: string,
      options?: FetchOptions,
    ): Promise<{ sessionId: string; url: string | null; orderNumber: string }> {
      return apiFetch<{ sessionId: string; url: string | null; orderNumber: string }>(
        "/checkout",
        {
          method: "POST",
          body: JSON.stringify({ items, successUrl, cancelUrl, customerEmail }),
        },
        options,
      );
    },
  },
} as const;
