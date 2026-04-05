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

export interface ApiTenant {
  id: string;
  slug: string;
  name: string;
  plan: string;
  logoUrl: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  customDomain: string | null;
  currency: string;
  locale: string;
}

export interface ApiFormula {
  id: string;
  tenantId: string;
  name: string;
  description: string | null;
  type: string;
  presetId: string | null;
  formulaAst: unknown;
  scriptBody: string | null;
}

export interface ApiPresetInfo {
  id: string;
  name: string;
  description: string;
  variables: Array<{ name: string; label: string; source: string; description: string }>;
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

  admin: {
    /**
     * GET /api/v1/admin/tenant
     */
    getTenant(options?: FetchOptions): Promise<{ tenant: ApiTenant }> {
      return apiFetch<{ tenant: ApiTenant }>("/admin/tenant", {}, options);
    },

    /**
     * PATCH /api/v1/admin/tenant
     */
    updateTenant(
      data: Partial<Omit<ApiTenant, "id" | "slug">>,
      options?: FetchOptions,
    ): Promise<{ tenant: ApiTenant }> {
      return apiFetch<{ tenant: ApiTenant }>(
        "/admin/tenant",
        { method: "PATCH", body: JSON.stringify(data) },
        options,
      );
    },
  },

  formulas: {
    /**
     * GET /api/v1/formulas
     */
    list(options?: FetchOptions): Promise<{ formulas: ApiFormula[]; presets: ApiPresetInfo[] }> {
      return apiFetch<{ formulas: ApiFormula[]; presets: ApiPresetInfo[] }>(
        "/formulas",
        {},
        options,
      );
    },

    /**
     * GET /api/v1/formulas/:id
     */
    get(formulaId: string, options?: FetchOptions): Promise<{ formula: ApiFormula }> {
      return apiFetch<{ formula: ApiFormula }>(`/formulas/${formulaId}`, {}, options);
    },

    /**
     * POST /api/v1/formulas
     */
    create(
      data: Omit<ApiFormula, "id" | "tenantId">,
      options?: FetchOptions,
    ): Promise<{ formula: ApiFormula }> {
      return apiFetch<{ formula: ApiFormula }>(
        "/formulas",
        { method: "POST", body: JSON.stringify(data) },
        options,
      );
    },

    /**
     * PATCH /api/v1/formulas/:id
     */
    update(
      formulaId: string,
      data: Partial<Omit<ApiFormula, "id" | "tenantId">>,
      options?: FetchOptions,
    ): Promise<{ formula: ApiFormula }> {
      return apiFetch<{ formula: ApiFormula }>(
        `/formulas/${formulaId}`,
        { method: "PATCH", body: JSON.stringify(data) },
        options,
      );
    },

    /**
     * DELETE /api/v1/formulas/:id
     */
    delete(formulaId: string, options?: FetchOptions): Promise<{ success: boolean }> {
      return apiFetch<{ success: boolean }>(
        `/formulas/${formulaId}`,
        { method: "DELETE" },
        options,
      );
    },
  },
} as const;
