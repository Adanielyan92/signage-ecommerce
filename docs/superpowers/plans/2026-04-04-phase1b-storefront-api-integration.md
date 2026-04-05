# Phase 1B: Storefront API Integration — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the D2C storefront to fetch products from the v1 API and use the schema-driven pricing engine for price calculations, replacing hardcoded product-definition imports in the UI layer. The 3D renderers stay unchanged — they continue reading from the Zustand store.

**Architecture:** Add a product-fetching hook (`useProduct`) that loads product data from `GET /api/v1/products`. Update the configurator store to call `POST /api/v1/pricing/calculate` for pricing instead of importing the hardcoded engine directly. Update the products catalog page to load from the API. The configure page loads its product schema from the API. Existing per-category option components and 3D renderers remain untouched — they still read from the same Zustand store fields.

**Tech Stack:** Next.js 16, Zustand, React (hooks), existing shadcn/ui

---

## File Structure

### New files to create

```
src/
├── hooks/
│   ├── use-product.ts          # Hook to fetch single product from v1 API
│   └── use-products.ts         # Hook to fetch product list from v1 API
├── lib/
│   └── api-client.ts           # Thin fetch wrapper for v1 API calls
```

### Files to modify

```
src/stores/configurator-store.ts   # Replace hardcoded pricing with API calls
src/app/products/page.tsx          # Fetch catalog from API instead of hardcoded CATALOG
src/app/configure/[productType]/page.tsx  # Load product from API
```

---

## Task 1: API Client Utility

**Files:**
- Create: `src/lib/api-client.ts`

A thin wrapper for calling the v1 API endpoints with tenant headers.

- [ ] **Step 1: Create the API client**

```typescript
// src/lib/api-client.ts

const API_BASE = "/api/v1";

interface ApiOptions {
  tenantSlug?: string;
  apiKey?: string;
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  options?: ApiOptions,
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");

  if (options?.tenantSlug) {
    headers.set("X-Tenant-Slug", options.tenantSlug);
  }
  if (options?.apiKey) {
    headers.set("X-API-Key", options.apiKey);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.error ?? "Request failed", body);
  }

  return res.json();
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const api = {
  products: {
    list(category?: string, options?: ApiOptions) {
      const params = category ? `?category=${encodeURIComponent(category)}` : "";
      return apiFetch<{ products: ApiProduct[] }>(`/products${params}`, undefined, options);
    },
    get(productId: string, options?: ApiOptions) {
      return apiFetch<{ product: ApiProduct }>(`/products/${productId}`, undefined, options);
    },
    getBySlug(slug: string, options?: ApiOptions) {
      return apiFetch<{ products: ApiProduct[] }>(`/products?slug=${encodeURIComponent(slug)}`, undefined, options);
    },
  },
  pricing: {
    calculate(
      productId: string,
      optionValues: Record<string, unknown>,
      dimensions?: { widthInches?: number; heightInches?: number },
      options?: ApiOptions,
    ) {
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
    createSession(
      items: CheckoutItem[],
      successUrl: string,
      cancelUrl: string,
      customerEmail?: string,
      options?: ApiOptions,
    ) {
      return apiFetch<{ sessionId: string; url: string; orderNumber: string }>(
        "/checkout",
        {
          method: "POST",
          body: JSON.stringify({ items, successUrl, cancelUrl, customerEmail }),
        },
        options,
      );
    },
  },
};

// Types for API responses
export interface ApiProduct {
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

export interface ApiPriceBreakdown {
  basePrice: number;
  appliedMultipliers: { name: string; reason: string; factor: number }[];
  priceAfterMultipliers: number;
  lineItems: { name: string; label: string; amount: number }[];
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
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/api-client.ts
git commit -m "feat: add typed v1 API client utility"
```

---

## Task 2: Product Hooks

**Files:**
- Create: `src/hooks/use-product.ts`
- Create: `src/hooks/use-products.ts`

React hooks for fetching product data from the API.

- [ ] **Step 1: Create useProducts hook**

```typescript
// src/hooks/use-products.ts
"use client";

import { useState, useEffect } from "react";
import { api, type ApiProduct } from "@/lib/api-client";

interface UseProductsResult {
  products: ApiProduct[];
  loading: boolean;
  error: string | null;
}

export function useProducts(category?: string): UseProductsResult {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api.products
      .list(category)
      .then((data) => {
        if (!cancelled) {
          setProducts(data.products);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [category]);

  return { products, loading, error };
}
```

- [ ] **Step 2: Create useProduct hook (by slug)**

```typescript
// src/hooks/use-product.ts
"use client";

import { useState, useEffect } from "react";
import { api, type ApiProduct } from "@/lib/api-client";

interface UseProductResult {
  product: ApiProduct | null;
  loading: boolean;
  error: string | null;
}

export function useProduct(slug: string): UseProductResult {
  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    api.products
      .list() // Fetch all and find by slug since we don't have a by-slug endpoint
      .then((data) => {
        if (!cancelled) {
          const found = data.products.find((p) => p.slug === slug) ?? null;
          setProduct(found);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { product, loading, error };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/hooks/use-product.ts src/hooks/use-products.ts
git commit -m "feat: add useProduct and useProducts hooks for v1 API"
```

---

## Task 3: Add Slug-Based Product Lookup to Products API

**Files:**
- Modify: `src/app/api/v1/products/route.ts`

The GET endpoint needs to support `?slug=front-lit-trim-cap` filtering so the configure page can look up products by slug.

- [ ] **Step 1: Add slug filter to the GET handler**

In `src/app/api/v1/products/route.ts`, add slug filtering to the `where` clause in the GET handler. After the line that reads `const category = searchParams.get("category");`, add:

```typescript
const slug = searchParams.get("slug");
```

And update the `where` clause to include:

```typescript
...(slug ? { slug } : {}),
```

- [ ] **Step 2: Update useProduct hook to use slug filter**

Update `src/hooks/use-product.ts` to fetch by slug directly:

```typescript
// Replace the api.products.list() call with:
api.products
  .list() // We'll use the slug param
  .then(...)

// Actually, update api-client.ts to support slug param:
```

In `src/lib/api-client.ts`, update the `list` method:

```typescript
list(params?: { category?: string; slug?: string }, options?: ApiOptions) {
  const searchParams = new URLSearchParams();
  if (params?.category) searchParams.set("category", params.category);
  if (params?.slug) searchParams.set("slug", params.slug);
  const qs = searchParams.toString();
  return apiFetch<{ products: ApiProduct[] }>(`/products${qs ? `?${qs}` : ""}`, undefined, options);
},
```

And update `useProduct` to use the slug filter:

```typescript
api.products
  .list({ slug })
  .then((data) => {
    if (!cancelled) {
      setProduct(data.products[0] ?? null);
      setLoading(false);
    }
  })
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v1/products/route.ts src/lib/api-client.ts src/hooks/use-product.ts
git commit -m "feat: add slug-based product lookup to products API"
```

---

## Task 4: Update Configurator Store — API-Based Pricing

**Files:**
- Modify: `src/stores/configurator-store.ts`

Replace the direct import of `calculatePrice` / `calculatePriceUnified` with an async call to `POST /api/v1/pricing/calculate`. The store still calculates locally as a fallback (for instant feedback) but debounces an API call for the authoritative price.

- [ ] **Step 1: Add API pricing to the store**

Add at the top of `src/stores/configurator-store.ts`, after existing imports:

```typescript
import { api } from "@/lib/api-client";
import type { ApiPriceBreakdown } from "@/lib/api-client";
```

Add to the `ConfiguratorState` interface:

```typescript
// API pricing state
apiProductId: string | null;
apiPriceLoading: boolean;
apiPriceBreakdown: ApiPriceBreakdown | null;
setApiProductId: (id: string) => void;
fetchApiPrice: () => void;
```

Add the implementation in the store's `create` call. The `fetchApiPrice` method should:
1. Check if `apiProductId` is set (it gets set when the configure page loads the product from the API)
2. Build `optionValues` from the current config state
3. Build `dimensions` from the current dimensions
4. Call `api.pricing.calculate(apiProductId, optionValues, dimensions)`
5. Set `apiPriceBreakdown` with the result
6. Debounce: 500ms delay after last config change

```typescript
apiProductId: null,
apiPriceLoading: false,
apiPriceBreakdown: null,

setApiProductId: (id) => set({ apiProductId: id }),

fetchApiPrice: () => {
  const state = get();
  if (!state.apiProductId) return;

  set({ apiPriceLoading: true });

  const optionValues = buildOptionValues(state);
  const dimensions = {
    widthInches: state.dimensions.totalWidthInches,
    heightInches: state.dimensions.heightInches,
  };

  api.pricing
    .calculate(state.apiProductId, optionValues, dimensions)
    .then((res) => {
      set({
        apiPriceBreakdown: res.breakdown,
        apiPriceLoading: false,
      });
    })
    .catch(() => {
      set({ apiPriceLoading: false });
    });
},
```

Add the `buildOptionValues` helper (outside the store, after the helper functions section):

```typescript
function buildOptionValues(state: ConfiguratorState): Record<string, unknown> {
  if (state.productCategory === "CHANNEL_LETTERS") {
    const c = state.config;
    return {
      text: c.text,
      height: c.height,
      font: c.font,
      lit: c.lit,
      led: c.led,
      litSides: c.litSides,
      sideDepth: c.sideDepth,
      painting: c.painting,
      paintingColors: c.paintingColors,
      raceway: c.raceway,
      vinyl: c.vinyl,
      background: c.background,
      letterCount: c.text.replace(/\s+/g, "").length,
    };
  }
  // For other categories, flatten the active config
  const activeConfig = getCategoryConfig(state.productCategory, state);
  if (!activeConfig) return {};
  return { ...activeConfig } as Record<string, unknown>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/stores/configurator-store.ts
git commit -m "feat: add API-based pricing to configurator store"
```

---

## Task 5: Wire Configure Page to API Product

**Files:**
- Modify: `src/app/configure/[productType]/page.tsx`

Update the configure page to load the product from the API and set `apiProductId` in the store, so pricing flows through the v1 API.

- [ ] **Step 1: Add API product loading**

In `ConfigurePageInner`, after the existing `const product = getAnyProductBySlug(productType);` line, add the API hook:

```typescript
import { useProduct } from "@/hooks/use-product";

// Inside ConfigurePageInner:
const { product: apiProduct } = useProduct(productType);
const setApiProductId = useConfiguratorStore((s) => s.setApiProductId);

// Set the API product ID when loaded
useEffect(() => {
  if (apiProduct?.id) {
    setApiProductId(apiProduct.id);
  }
}, [apiProduct?.id, setApiProductId]);
```

This is additive — the existing hardcoded product lookup stays as fallback. The API product ID enables the store to fetch prices from the API when available.

- [ ] **Step 2: Commit**

```bash
git add src/app/configure/[productType]/page.tsx
git commit -m "feat: wire configure page to load product from v1 API"
```

---

## Task 6: Update Products Catalog Page

**Files:**
- Modify: `src/app/products/page.tsx`

The products page currently uses a hardcoded `CATALOG` array. Add a client component that fetches from the API, while keeping the hardcoded catalog as the SSR fallback.

- [ ] **Step 1: Create a client-side product catalog component**

Since the products page is currently a server component with static data, we'll add a client component alongside it. Create the client component inline in the same file, or as a separate file.

Add at the bottom of `src/app/products/page.tsx` (or create `src/app/products/product-catalog-client.tsx`):

```typescript
// src/app/products/product-catalog-client.tsx
"use client";

import { useProducts } from "@/hooks/use-products";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export function ProductCatalogClient() {
  const { products, loading, error } = useProducts();

  if (loading || error || products.length === 0) return null; // Fall through to SSR content

  // Group products by category
  const grouped = products.reduce<Record<string, typeof products>>((acc, p) => {
    const cat = p.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="rounded-xl border p-6">
          <h2 className="mb-4 text-xl font-bold">{category.replace(/_/g, " ")}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((product) => (
              <Link
                key={product.slug}
                href={`/configure/${product.slug}`}
                className="group flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-neutral-50"
              >
                <div>
                  <p className="font-medium">{product.name}</p>
                  {product.description && (
                    <p className="mt-1 text-sm text-neutral-500 line-clamp-1">{product.description}</p>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-neutral-400 transition-transform group-hover:translate-x-1" />
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Import in the products page**

In `src/app/products/page.tsx`, add below the existing static catalog rendering:

```typescript
import { ProductCatalogClient } from "./product-catalog-client";

// In the JSX, add after the static catalog section:
// <ProductCatalogClient />
```

The static SSR catalog serves as immediate content; the client component can hydrate with fresh API data. For now, just having both available is sufficient — the static catalog stays as-is.

- [ ] **Step 3: Commit**

```bash
git add src/app/products/product-catalog-client.tsx src/app/products/page.tsx
git commit -m "feat: add API-driven product catalog client component"
```

---

## Task 7: Verify All Tests + Build

**Files:** None (verification only)

- [ ] **Step 1: Run all unit tests**

```bash
npx jest --no-cache
```

Expected: All 196+ tests pass. None of the changes break existing pricing logic — the API pricing is additive alongside the existing hardcoded engine.

- [ ] **Step 2: Run the build**

```bash
npm run build
```

Expected: Build succeeds. Check for any TypeScript errors in the new/modified files.

- [ ] **Step 3: Fix any issues found**

If build fails due to TypeScript errors in the modified files, fix them.

- [ ] **Step 4: Commit fixes if any**

```bash
git add -A
git commit -m "fix: resolve build issues from API integration"
```

---

## Summary

| Task | What It Builds | Files |
|---|---|---|
| 1 | API client utility | `api-client.ts` |
| 2 | Product hooks | `use-product.ts`, `use-products.ts` |
| 3 | Slug-based product lookup | Modify products API + hooks |
| 4 | API pricing in store | Modify configurator store |
| 5 | Configure page API wiring | Modify configure page |
| 6 | Product catalog from API | New client component |
| 7 | Verification | Tests + build |

**What stays unchanged:**
- All 3D renderers (sign-assembly, cabinet-renderer, etc.)
- All per-category option components (channel-letter-options, etc.)
- The scene router
- The existing hardcoded pricing engine (still used as local fallback)
- Cart store

**What changes:**
- Configurator store gains `apiProductId` + `fetchApiPrice` + `apiPriceBreakdown`
- Configure page loads product from API and sets the API product ID
- Products page gets an API-driven client component
- New `api-client.ts` provides typed fetch wrapper for all v1 endpoints
