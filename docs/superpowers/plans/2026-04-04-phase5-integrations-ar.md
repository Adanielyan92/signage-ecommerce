# Phase 5: Widget, Integrations, AR & Platform Completion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract embeddable widget, add i18n/multi-currency, AR preview, manufacturer marketplace, webhook system, API docs, and tenant onboarding.

**Architecture:** The embeddable widget is a self-contained JS bundle built with esbuild that wraps the existing 3D scene + options panel + price display into a single `<script>` tag entry point. It loads product schemas via the API, renders using React Three Fiber with CSS-in-JS styles (no Tailwind dependency), and calls the pricing API for real-time quotes. i18n uses a simple JSON translation file system with a React context provider. Multi-currency adds exchange rate config per tenant and a formatting utility. The webhook system stores endpoint configs in Prisma, fires events asynchronously after order/design actions, and includes retry logic with delivery logs. AR uses WebXR for Android and USDZ Quick Look for iOS, with GLB/USDZ export from the Three.js scene. The manufacturer marketplace is a public directory backed by a new Prisma model. API docs are a static admin page documenting all v1 endpoints. Tenant onboarding is a multi-step wizard guiding new sign shops through initial setup.

**Tech Stack:** Next.js 16, esbuild, WebXR, React Three Fiber, Prisma, Tailwind CSS, three.js (GLTFExporter, USDZExporter)

---

## Task 1: i18n Translation System

Add a JSON-based translation system with a React context provider. English is the default; the framework supports adding any language by dropping a JSON file.

### Files

- `src/i18n/translations/en.json` (new)
- `src/i18n/translations/es.json` (new — Spanish as proof of second language)
- `src/i18n/i18n-context.tsx` (new)
- `src/i18n/use-translation.ts` (new)
- `src/i18n/index.ts` (new — barrel export)
- `prisma/schema.prisma` (modify — add `defaultLanguage` to Tenant)

### Steps

- [ ] **1.1** Create the migration to add `defaultLanguage` to Tenant. Add this field to the Prisma schema:

```prisma
// In the Tenant model, after the locale field:
  defaultLanguage String @default("en")
```

Run: `npx prisma migrate dev --name add-tenant-language`

- [ ] **1.2** Create `src/i18n/translations/en.json`:

```json
{
  "common": {
    "addToCart": "Add to Cart",
    "save": "Save",
    "cancel": "Cancel",
    "loading": "Loading...",
    "total": "Total",
    "subtotal": "Subtotal",
    "quantity": "Quantity",
    "price": "Price",
    "search": "Search",
    "back": "Back",
    "next": "Next",
    "finish": "Finish",
    "viewDetails": "View Details",
    "configure": "Configure",
    "signIn": "Sign In",
    "signOut": "Sign Out"
  },
  "configurator": {
    "typeYourText": "Type your business name to preview in 3D",
    "approximatePreview": "This is an approximate 3D visualization. Actual sign appearance, color, and lighting may vary from this preview.",
    "wallMockup": "Wall Mockup",
    "saveDesign": "Save Design",
    "viewInAr": "View in AR",
    "signInToSave": "Sign in to save designs",
    "designSaved": "Design saved",
    "addedToCart": "Added to cart",
    "failedToSave": "Failed to save design",
    "minimumOrder": "Our minimum order covers setup, materials, and quality assurance for any custom sign project",
    "selectProduct": "Select a product to begin"
  },
  "options": {
    "text": "Sign Text",
    "height": "Letter Height",
    "font": "Font",
    "lit": "Illumination",
    "led": "LED Color",
    "litSides": "Lit Sides",
    "sideDepth": "Side Depth",
    "painting": "Face Painting",
    "paintingColors": "Paint Colors",
    "raceway": "Raceway",
    "vinyl": "Vinyl",
    "background": "Background",
    "width": "Width",
    "material": "Material",
    "thickness": "Thickness",
    "mounting": "Mounting",
    "shape": "Shape",
    "doubleSided": "Double Sided",
    "illuminated": "Illuminated"
  },
  "cart": {
    "yourCart": "Your Cart",
    "emptyCart": "Your cart is empty",
    "startDesigning": "Start designing your custom sign",
    "browseProducts": "Browse Products",
    "remove": "Remove",
    "proceedToCheckout": "Proceed to Checkout",
    "orderSummary": "Order Summary",
    "continueShopping": "Continue Shopping"
  },
  "products": {
    "title": "Custom Signs",
    "subtitle": "Design your perfect sign with our 3D configurator",
    "channelLetters": "Channel Letters",
    "dimensionalLetters": "Dimensional Letters",
    "cabinetSigns": "Cabinet Signs",
    "litShapes": "Lit Shapes",
    "logos": "Logos",
    "printSigns": "Print Signs",
    "signPosts": "Sign Posts",
    "lightBoxSigns": "Light Box Signs",
    "bladeSigns": "Blade Signs",
    "neonSigns": "Neon Signs",
    "vinylBanners": "Vinyl Banners"
  },
  "marketplace": {
    "title": "Find a Sign Manufacturer",
    "subtitle": "Browse certified manufacturers in your area",
    "capabilities": "Capabilities",
    "location": "Location",
    "contact": "Contact",
    "visitWebsite": "Visit Website",
    "requestQuote": "Request Quote",
    "noResults": "No manufacturers found matching your criteria"
  },
  "onboarding": {
    "welcome": "Welcome to GatSoft Signs",
    "step1Title": "Create Your Account",
    "step2Title": "Set Your Branding",
    "step3Title": "Import Your First Product",
    "step4Title": "Configure Pricing",
    "step5Title": "Preview Your Configurator",
    "completeSetup": "Complete Setup",
    "skipForNow": "Skip for now"
  },
  "admin": {
    "dashboard": "Dashboard",
    "products": "Products",
    "orders": "Orders",
    "templates": "Templates",
    "formulas": "Pricing Formulas",
    "settings": "Settings",
    "webhooks": "Webhooks",
    "apiDocs": "API Docs",
    "manufacturers": "Manufacturers",
    "backToStore": "Back to store"
  }
}
```

- [ ] **1.3** Create `src/i18n/translations/es.json` with Spanish translations for the same keys. Full Spanish file matching the structure of `en.json` — translate all values to Spanish.

- [ ] **1.4** Create `src/i18n/i18n-context.tsx`:

```tsx
"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import en from "./translations/en.json";

type TranslationData = typeof en;
type NestedKeyOf<T, Prefix extends string = ""> = T extends object
  ? {
      [K in keyof T & string]: T[K] extends object
        ? NestedKeyOf<T[K], `${Prefix}${Prefix extends "" ? "" : "."}${K}`>
        : `${Prefix}${Prefix extends "" ? "" : "."}${K}`;
    }[keyof T & string]
  : never;

export type TranslationKey = NestedKeyOf<TranslationData>;

interface I18nContextValue {
  locale: string;
  setLocale: (locale: string) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  availableLocales: string[];
}

const translationCache = new Map<string, TranslationData>();
translationCache.set("en", en);

async function loadTranslation(locale: string): Promise<TranslationData> {
  if (translationCache.has(locale)) {
    return translationCache.get(locale)!;
  }
  try {
    const mod = await import(`./translations/${locale}.json`);
    const data = mod.default as TranslationData;
    translationCache.set(locale, data);
    return data;
  } catch {
    console.warn(`Translation file for "${locale}" not found, falling back to "en".`);
    return en;
  }
}

const I18nContext = createContext<I18nContextValue | null>(null);

function getNestedValue(obj: unknown, path: string): string | undefined {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== "object") {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }
  return typeof current === "string" ? current : undefined;
}

export function I18nProvider({
  children,
  defaultLocale = "en",
  availableLocales = ["en", "es"],
}: {
  children: ReactNode;
  defaultLocale?: string;
  availableLocales?: string[];
}) {
  const [locale, setLocaleState] = useState(defaultLocale);
  const [translations, setTranslations] = useState<TranslationData>(
    translationCache.get(defaultLocale) ?? en,
  );

  const setLocale = useCallback(
    async (newLocale: string) => {
      const data = await loadTranslation(newLocale);
      setTranslations(data);
      setLocaleState(newLocale);
    },
    [],
  );

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>): string => {
      let value = getNestedValue(translations, key) ?? getNestedValue(en, key) ?? key;
      if (params) {
        for (const [k, v] of Object.entries(params)) {
          value = value.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return value;
    },
    [translations],
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, availableLocales }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18nContext() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18nContext must be used within I18nProvider");
  return ctx;
}
```

- [ ] **1.5** Create `src/i18n/use-translation.ts`:

```ts
export { useI18nContext as useTranslation } from "./i18n-context";
```

- [ ] **1.6** Create `src/i18n/index.ts`:

```ts
export { I18nProvider, useI18nContext, type TranslationKey } from "./i18n-context";
export { useTranslation } from "./use-translation";
```

- [ ] **1.7** Create `src/components/ui/language-switcher.tsx`:

```tsx
"use client";

import { useTranslation } from "@/i18n";

const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  es: "Espanol",
};

export function LanguageSwitcher() {
  const { locale, setLocale, availableLocales } = useTranslation();

  if (availableLocales.length <= 1) return null;

  return (
    <select
      value={locale}
      onChange={(e) => setLocale(e.target.value)}
      className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm text-neutral-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      aria-label="Select language"
    >
      {availableLocales.map((loc) => (
        <option key={loc} value={loc}>
          {LOCALE_LABELS[loc] ?? loc.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
```

- [ ] **1.8** Wrap the app's root layout with `I18nProvider`. In `src/app/layout.tsx`, import and wrap `{children}` with:

```tsx
<I18nProvider defaultLocale="en" availableLocales={["en", "es"]}>
  {children}
</I18nProvider>
```

- [ ] **1.9** Add `<LanguageSwitcher />` to the navbar in `src/components/layout/navbar.tsx`, placed before the cart icon.

**Commit:** `feat(i18n): add JSON-based translation system with English and Spanish`

---

## Task 2: Multi-Currency Support

Add currency conversion utility, tenant currency formatting, and exchange rate configuration.

### Files

- `src/lib/currency.ts` (new)
- `src/engine/__tests__/currency.test.ts` (new)
- `prisma/schema.prisma` (modify — add ExchangeRate model)
- `src/app/api/v1/admin/exchange-rates/route.ts` (new)
- `src/components/admin/exchange-rate-form.tsx` (new)
- `src/lib/utils.ts` (modify — update `formatPrice` to accept currency)

### Steps

- [ ] **2.1** Add the `ExchangeRate` model to `prisma/schema.prisma`:

```prisma
model ExchangeRate {
  id         String   @id @default(cuid())
  tenantId   String
  fromCurrency String @default("USD")
  toCurrency   String
  rate         Float
  updatedAt  DateTime @updatedAt

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([tenantId, fromCurrency, toCurrency])
}
```

Add `exchangeRates ExchangeRate[]` to the Tenant model's relations. Run migration: `npx prisma migrate dev --name add-exchange-rates`

- [ ] **2.2** Create `src/lib/currency.ts`:

```ts
// src/lib/currency.ts
/**
 * Multi-currency utilities.
 *
 * Exchange rates are admin-set per tenant (not live rates).
 * All internal prices are stored in USD. Conversion happens at display time.
 */

export interface ExchangeRateEntry {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
}

/**
 * Convert an amount from one currency to another.
 * Returns the original amount if no rate is found (safe fallback).
 */
export function convertCurrency(
  amount: number,
  from: string,
  to: string,
  rates: ExchangeRateEntry[],
): number {
  if (from === to) return amount;

  const direct = rates.find(
    (r) => r.fromCurrency === from && r.toCurrency === to,
  );
  if (direct) return amount * direct.rate;

  // Try inverse
  const inverse = rates.find(
    (r) => r.fromCurrency === to && r.toCurrency === from,
  );
  if (inverse && inverse.rate !== 0) return amount / inverse.rate;

  // No rate found — return original
  return amount;
}

/**
 * Format a price in a given currency and locale.
 */
export function formatPriceWithCurrency(
  amount: number,
  currency: string = "USD",
  locale: string = "en-US",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}

/** Common currency metadata */
export const SUPPORTED_CURRENCIES: Record<string, { symbol: string; name: string; locale: string }> = {
  USD: { symbol: "$", name: "US Dollar", locale: "en-US" },
  EUR: { symbol: "\u20AC", name: "Euro", locale: "de-DE" },
  GBP: { symbol: "\u00A3", name: "British Pound", locale: "en-GB" },
  CAD: { symbol: "CA$", name: "Canadian Dollar", locale: "en-CA" },
  AUD: { symbol: "A$", name: "Australian Dollar", locale: "en-AU" },
  MXN: { symbol: "MX$", name: "Mexican Peso", locale: "es-MX" },
};
```

- [ ] **2.3** Create `src/engine/__tests__/currency.test.ts`:

```ts
import { convertCurrency, formatPriceWithCurrency, type ExchangeRateEntry } from "../../lib/currency";

const rates: ExchangeRateEntry[] = [
  { fromCurrency: "USD", toCurrency: "EUR", rate: 0.92 },
  { fromCurrency: "USD", toCurrency: "CAD", rate: 1.36 },
];

describe("convertCurrency", () => {
  it("returns same amount for same currency", () => {
    expect(convertCurrency(100, "USD", "USD", rates)).toBe(100);
  });

  it("converts using direct rate", () => {
    expect(convertCurrency(100, "USD", "EUR", rates)).toBeCloseTo(92);
  });

  it("converts using inverse rate", () => {
    expect(convertCurrency(92, "EUR", "USD", rates)).toBeCloseTo(100);
  });

  it("returns original amount when no rate exists", () => {
    expect(convertCurrency(100, "USD", "JPY", rates)).toBe(100);
  });
});

describe("formatPriceWithCurrency", () => {
  it("formats USD", () => {
    expect(formatPriceWithCurrency(1500, "USD")).toBe("$1,500.00");
  });

  it("formats EUR", () => {
    const formatted = formatPriceWithCurrency(1500, "EUR", "de-DE");
    expect(formatted).toContain("1.500");
  });
});
```

- [ ] **2.4** Update `formatPrice` in `src/lib/utils.ts` to accept optional `currency` and `locale` params:

```ts
export function formatPrice(
  amount: number,
  currency: string = "USD",
  locale: string = "en-US",
): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
  }).format(amount);
}
```

- [ ] **2.5** Create `src/app/api/v1/admin/exchange-rates/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";

const upsertSchema = z.object({
  toCurrency: z.string().length(3),
  rate: z.number().positive(),
});

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rates = await prisma.exchangeRate.findMany({
    where: { tenantId: admin.tenantId },
    orderBy: { toCurrency: "asc" },
  });

  return NextResponse.json({ rates });
}

export async function POST(request: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = upsertSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const { toCurrency, rate } = parsed.data;

  const exchangeRate = await prisma.exchangeRate.upsert({
    where: {
      tenantId_fromCurrency_toCurrency: {
        tenantId: admin.tenantId,
        fromCurrency: "USD",
        toCurrency,
      },
    },
    update: { rate },
    create: {
      tenantId: admin.tenantId,
      fromCurrency: "USD",
      toCurrency,
      rate,
    },
  });

  return NextResponse.json({ exchangeRate });
}
```

- [ ] **2.6** Create `src/components/admin/exchange-rate-form.tsx` — a client component with a table of currency rows, each with a rate input and save button. Fetches from and posts to the exchange-rates API. Include a dropdown to add new currencies from `SUPPORTED_CURRENCIES`.

- [ ] **2.7** Add an "Exchange Rates" section to the admin settings page at `src/app/admin/settings/page.tsx`, importing and rendering `<ExchangeRateForm />` below the existing `<TenantSettingsForm />`.

**Commit:** `feat(currency): add multi-currency support with exchange rates and admin config`

---

## Task 3: Webhook System — Database & Delivery Engine

Build the core webhook infrastructure: Prisma models, delivery engine with retry logic, and delivery log.

### Files

- `prisma/schema.prisma` (modify — add Webhook and WebhookDelivery models)
- `src/lib/webhooks.ts` (new)
- `src/engine/__tests__/webhooks.test.ts` (new)

### Steps

- [ ] **3.1** Add Webhook models to `prisma/schema.prisma`:

```prisma
model Webhook {
  id        String   @id @default(cuid())
  tenantId  String
  url       String
  secret    String
  events    String[] // ["order.created", "order.paid", "order.files_ready", "design.saved"]
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  tenant     Tenant             @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  deliveries WebhookDelivery[]

  @@index([tenantId])
}

model WebhookDelivery {
  id            String   @id @default(cuid())
  webhookId     String
  event         String
  payload       Json
  responseStatus Int?
  responseBody  String?
  error         String?
  attempt       Int      @default(1)
  maxAttempts   Int      @default(3)
  nextRetryAt   DateTime?
  deliveredAt   DateTime?
  createdAt     DateTime @default(now())

  webhook Webhook @relation(fields: [webhookId], references: [id], onDelete: Cascade)

  @@index([webhookId])
  @@index([nextRetryAt])
}
```

Add `webhooks Webhook[]` to the Tenant model. Run migration: `npx prisma migrate dev --name add-webhooks`

- [ ] **3.2** Create `src/lib/webhooks.ts`:

```ts
import { prisma } from "./prisma";
import { createHmac } from "crypto";

export type WebhookEvent =
  | "order.created"
  | "order.paid"
  | "order.files_ready"
  | "design.saved";

interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Sign a webhook payload with HMAC-SHA256.
 */
function signPayload(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Fire all webhooks for a given tenant and event.
 * Non-blocking — logs failures and schedules retries.
 */
export async function fireWebhooks(
  tenantId: string,
  event: WebhookEvent,
  data: Record<string, unknown>,
): Promise<void> {
  const webhooks = await prisma.webhook.findMany({
    where: {
      tenantId,
      isActive: true,
      events: { has: event },
    },
  });

  if (webhooks.length === 0) return;

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  const payloadStr = JSON.stringify(payload);

  // Fire all webhooks in parallel, non-blocking
  await Promise.allSettled(
    webhooks.map((webhook) => deliverWebhook(webhook.id, webhook.url, webhook.secret, event, payloadStr)),
  );
}

async function deliverWebhook(
  webhookId: string,
  url: string,
  secret: string,
  event: WebhookEvent,
  payloadStr: string,
  attempt: number = 1,
  maxAttempts: number = 3,
): Promise<void> {
  const signature = signPayload(payloadStr, secret);

  let responseStatus: number | undefined;
  let responseBody: string | undefined;
  let error: string | undefined;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000); // 10s timeout

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Event": event,
      },
      body: payloadStr,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    responseStatus = response.status;
    responseBody = await response.text().catch(() => "");

    if (response.ok) {
      // Success — log delivery
      await prisma.webhookDelivery.create({
        data: {
          webhookId,
          event,
          payload: JSON.parse(payloadStr),
          responseStatus,
          responseBody: responseBody.slice(0, 1000),
          attempt,
          maxAttempts,
          deliveredAt: new Date(),
        },
      });
      return;
    }

    error = `HTTP ${responseStatus}: ${responseBody?.slice(0, 200)}`;
  } catch (err) {
    error = err instanceof Error ? err.message : String(err);
  }

  // Schedule retry or log final failure
  const nextRetryAt =
    attempt < maxAttempts
      ? new Date(Date.now() + retryDelayMs(attempt))
      : undefined;

  await prisma.webhookDelivery.create({
    data: {
      webhookId,
      event,
      payload: JSON.parse(payloadStr),
      responseStatus,
      responseBody: responseBody?.slice(0, 1000),
      error,
      attempt,
      maxAttempts,
      nextRetryAt,
    },
  });
}

/**
 * Exponential backoff: 30s, 120s, 480s
 */
function retryDelayMs(attempt: number): number {
  return 30_000 * Math.pow(4, attempt - 1);
}

/**
 * Process pending webhook retries. Call from a cron job or background task.
 */
export async function processWebhookRetries(): Promise<number> {
  const pendingDeliveries = await prisma.webhookDelivery.findMany({
    where: {
      deliveredAt: null,
      nextRetryAt: { lte: new Date() },
      attempt: { lt: prisma.webhookDelivery.fields?.maxAttempts ?? 3 },
    },
    include: { webhook: true },
    take: 50,
  });

  let processed = 0;
  for (const delivery of pendingDeliveries) {
    if (!delivery.webhook.isActive) continue;

    await deliverWebhook(
      delivery.webhookId,
      delivery.webhook.url,
      delivery.webhook.secret,
      delivery.event as WebhookEvent,
      JSON.stringify(delivery.payload),
      delivery.attempt + 1,
      delivery.maxAttempts,
    );
    processed++;
  }

  return processed;
}
```

- [ ] **3.3** Create `src/engine/__tests__/webhooks.test.ts` with unit tests for `signPayload` (export it for testing). Test that the signature matches expected HMAC-SHA256. Test `retryDelayMs` returns expected exponential backoff values. These tests do not require a database.

- [ ] **3.4** Integrate webhook firing into existing order creation. In `src/app/api/v1/checkout/route.ts`, after the order is successfully created, add:

```ts
import { fireWebhooks } from "@/lib/webhooks";

// After order creation succeeds:
fireWebhooks(tenant.id, "order.created", {
  orderId: order.id,
  orderNumber: order.orderNumber,
  total: order.total,
  itemCount: order.items.length,
}).catch(console.error); // Non-blocking
```

Similarly, in `src/app/api/webhooks/stripe/route.ts`, after payment is confirmed, fire `"order.paid"`. In the production files generation code, fire `"order.files_ready"`. In `src/app/api/designs/route.ts`, fire `"design.saved"`.

**Commit:** `feat(webhooks): add webhook delivery engine with retry logic and HMAC signing`

---

## Task 4: Webhook Admin UI

Build the admin interface for managing webhook endpoints and viewing delivery logs.

### Files

- `src/app/api/v1/admin/webhooks/route.ts` (new)
- `src/app/api/v1/admin/webhooks/[webhookId]/route.ts` (new)
- `src/app/api/v1/admin/webhooks/[webhookId]/deliveries/route.ts` (new)
- `src/app/admin/webhooks/page.tsx` (new)
- `src/components/admin/webhook-list.tsx` (new)
- `src/components/admin/webhook-form.tsx` (new)
- `src/components/admin/webhook-delivery-log.tsx` (new)
- `src/components/admin/sidebar.tsx` (modify — add Webhooks link)

### Steps

- [ ] **4.1** Create `src/app/api/v1/admin/webhooks/route.ts`:

```ts
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";
import { randomBytes } from "crypto";

const createSchema = z.object({
  url: z.url(),
  events: z.array(z.enum(["order.created", "order.paid", "order.files_ready", "design.saved"])).min(1),
});

export async function GET() {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const webhooks = await prisma.webhook.findMany({
    where: { tenantId: admin.tenantId },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { deliveries: true } },
    },
  });

  return NextResponse.json({ webhooks });
}

export async function POST(request: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const secret = randomBytes(32).toString("hex");

  const webhook = await prisma.webhook.create({
    data: {
      tenantId: admin.tenantId,
      url: parsed.data.url,
      events: parsed.data.events,
      secret,
    },
  });

  return NextResponse.json({ webhook }, { status: 201 });
}
```

- [ ] **4.2** Create `src/app/api/v1/admin/webhooks/[webhookId]/route.ts` with GET (single webhook), PATCH (update url, events, isActive), and DELETE handlers. All scoped to `admin.tenantId`.

- [ ] **4.3** Create `src/app/api/v1/admin/webhooks/[webhookId]/deliveries/route.ts` — GET handler that returns the last 50 deliveries for a webhook, ordered by `createdAt` desc.

- [ ] **4.4** Create `src/components/admin/webhook-list.tsx` — client component that fetches webhooks from the API and renders a table with columns: URL (truncated), Events (badges), Status (active/inactive toggle), Deliveries count, Actions (edit/delete). Includes a "Create Webhook" button that opens the form.

- [ ] **4.5** Create `src/components/admin/webhook-form.tsx` — modal/dialog form with fields: URL (text input), Events (checkboxes for each event type). On create, shows the generated secret once (copy-to-clipboard). On edit, allows changing URL, events, and active status.

- [ ] **4.6** Create `src/components/admin/webhook-delivery-log.tsx` — client component that takes a `webhookId` prop. Fetches deliveries from the API and displays a scrollable table with columns: Event, Status (green/red badge based on `deliveredAt`), Response Code, Attempt, Timestamp. Clicking a row expands to show full payload and response body.

- [ ] **4.7** Create `src/app/admin/webhooks/page.tsx`:

```tsx
import { requireAdmin } from "@/lib/admin-auth";
import { WebhookList } from "@/components/admin/webhook-list";

export const metadata = { title: "Webhooks - Admin" };

export default async function WebhooksPage() {
  await requireAdmin();
  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Webhooks</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Configure webhook endpoints to receive event notifications for orders, payments, and designs.
      </p>
      <div className="mt-8">
        <WebhookList />
      </div>
    </div>
  );
}
```

- [ ] **4.8** Add Webhooks link to `src/components/admin/sidebar.tsx`. Import `Webhook` icon from lucide-react and add to `navLinks`:

```ts
{ href: "/admin/webhooks", label: "Webhooks", icon: Webhook, exact: false },
```

Place it after the "Settings" entry.

**Commit:** `feat(webhooks): add admin UI for webhook management and delivery logs`

---

## Task 5: REST API Documentation Page

Create a static API reference page documenting all v1 endpoints.

### Files

- `src/app/admin/api-docs/page.tsx` (new)
- `src/components/admin/api-docs-content.tsx` (new)
- `src/components/admin/sidebar.tsx` (modify — add API Docs link)

### Steps

- [ ] **5.1** Create `src/components/admin/api-docs-content.tsx` — a client component that renders the full API reference. Structure as sections, one per endpoint group. Use a left sidebar for navigation (scrollspy-style) and a main content area. Each endpoint section includes:
  - HTTP method badge (GET green, POST blue, PATCH yellow, DELETE red)
  - Full path
  - Description
  - Headers table (X-Tenant-Slug, X-API-Key, Authorization)
  - Request body JSON example (for POST/PATCH)
  - Response JSON example
  - Error codes

Document these endpoint groups:

**Products**
- `GET /api/v1/products` — List products (query params: category, slug)
- `GET /api/v1/products/:id` — Get product by ID
- `POST /api/v1/products` — Create product (admin)
- `PATCH /api/v1/products/:id` — Update product (admin)
- `DELETE /api/v1/products/:id` — Delete product (admin)

**Pricing**
- `POST /api/v1/pricing/calculate` — Calculate price for configuration

**Formulas**
- `GET /api/v1/formulas` — List pricing formulas
- `GET /api/v1/formulas/:id` — Get formula
- `POST /api/v1/formulas` — Create formula (admin)
- `PATCH /api/v1/formulas/:id` — Update formula (admin)
- `DELETE /api/v1/formulas/:id` — Delete formula (admin)

**Orders**
- `GET /api/v1/orders` — List orders
- `GET /api/v1/orders/:id` — Get order
- `GET /api/v1/orders/:id/files` — Get production files for order

**Templates**
- `GET /api/v1/templates` — List product templates
- `GET /api/v1/templates/:id` — Get template
- `POST /api/v1/templates/:id/clone` — Clone template into tenant product

**Checkout**
- `POST /api/v1/checkout` — Create Stripe checkout session

**Admin**
- `GET /api/v1/admin/tenant` — Get tenant settings
- `PATCH /api/v1/admin/tenant` — Update tenant settings
- `GET /api/v1/admin/exchange-rates` — List exchange rates
- `POST /api/v1/admin/exchange-rates` — Upsert exchange rate
- `GET /api/v1/admin/webhooks` — List webhooks
- `POST /api/v1/admin/webhooks` — Create webhook
- `PATCH /api/v1/admin/webhooks/:id` — Update webhook
- `DELETE /api/v1/admin/webhooks/:id` — Delete webhook

Use the following styling approach: each method badge is a small rounded pill with the method name, color-coded. Code blocks use `<pre>` with a dark background. Sections separated by horizontal rules. Include a "Copy" button on each code block.

- [ ] **5.2** Create `src/app/admin/api-docs/page.tsx`:

```tsx
import { requireAdmin } from "@/lib/admin-auth";
import { ApiDocsContent } from "@/components/admin/api-docs-content";

export const metadata = { title: "API Documentation - Admin" };

export default async function ApiDocsPage() {
  await requireAdmin();
  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">API Documentation</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Reference for all v1 REST API endpoints. Use your API key for authentication from external integrations.
      </p>
      <div className="mt-8">
        <ApiDocsContent />
      </div>
    </div>
  );
}
```

- [ ] **5.3** Add API Docs link to `src/components/admin/sidebar.tsx`. Import `FileCode` from lucide-react:

```ts
{ href: "/admin/api-docs", label: "API Docs", icon: FileCode, exact: false },
```

Place it at the end of `navLinks`, before the "Back to store" link.

**Commit:** `feat(api-docs): add REST API documentation page in admin dashboard`

---

## Task 6: Manufacturer Marketplace

Build a public manufacturer directory with registration, listing, and admin management.

### Files

- `prisma/schema.prisma` (modify — add Manufacturer model)
- `src/app/api/v1/manufacturers/route.ts` (new)
- `src/app/api/v1/manufacturers/[manufacturerId]/route.ts` (new)
- `src/app/manufacturers/page.tsx` (new)
- `src/components/manufacturers/manufacturer-grid.tsx` (new)
- `src/components/manufacturers/manufacturer-card.tsx` (new)
- `src/app/admin/manufacturers/page.tsx` (new)
- `src/components/admin/manufacturer-admin-list.tsx` (new)
- `src/components/layout/navbar.tsx` (modify — add Manufacturers link)

### Steps

- [ ] **6.1** Add Manufacturer model to `prisma/schema.prisma`:

```prisma
model Manufacturer {
  id           String   @id @default(cuid())
  name         String
  slug         String   @unique
  description  String?
  website      String?
  email        String?
  phone        String?
  logoUrl      String?
  coverImageUrl String?

  // Location
  city         String?
  state        String?
  country      String   @default("US")
  zipCode      String?

  // Capabilities (stored as string array for flexibility)
  capabilities String[] // e.g. ["channel-letters", "neon", "cabinet-signs", "monument-signs"]
  certifications String[] // e.g. ["UL Listed", "ISO 9001"]

  // Status
  isVerified   Boolean  @default(false)
  isActive     Boolean  @default(true)
  featuredOrder Int?     // null = not featured, lower = higher priority

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([country, state])
  @@index([isActive, isVerified])
}
```

Run migration: `npx prisma migrate dev --name add-manufacturers`

- [ ] **6.2** Create `src/app/api/v1/manufacturers/route.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminSession } from "@/lib/admin-auth";
import { z } from "zod/v4";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const capability = searchParams.get("capability");
  const state = searchParams.get("state");
  const country = searchParams.get("country") ?? "US";
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {
    isActive: true,
  };

  if (capability) {
    where.capabilities = { has: capability };
  }
  if (state) {
    where.state = state;
  }
  if (country) {
    where.country = country;
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { city: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
    ];
  }

  const manufacturers = await prisma.manufacturer.findMany({
    where,
    orderBy: [
      { featuredOrder: { sort: "asc", nulls: "last" } },
      { name: "asc" },
    ],
  });

  return NextResponse.json({ manufacturers });
}

export async function POST(request: Request) {
  const admin = await getAdminSession();
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const schema = z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
    description: z.string().optional(),
    website: z.string().optional(),
    email: z.email().optional(),
    phone: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().default("US"),
    zipCode: z.string().optional(),
    capabilities: z.array(z.string()).default([]),
    certifications: z.array(z.string()).default([]),
  });

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.issues }, { status: 400 });
  }

  const manufacturer = await prisma.manufacturer.create({ data: parsed.data });
  return NextResponse.json({ manufacturer }, { status: 201 });
}
```

- [ ] **6.3** Create `src/app/api/v1/manufacturers/[manufacturerId]/route.ts` with GET (single manufacturer), PATCH (admin update — including isVerified, isActive, featuredOrder), and DELETE (admin only) handlers.

- [ ] **6.4** Create `src/components/manufacturers/manufacturer-card.tsx`:

```tsx
import { MapPin, Globe, Award } from "lucide-react";

interface ManufacturerCardProps {
  name: string;
  slug: string;
  description?: string | null;
  website?: string | null;
  city?: string | null;
  state?: string | null;
  country: string;
  capabilities: string[];
  certifications: string[];
  isVerified: boolean;
  logoUrl?: string | null;
}

const CAPABILITY_LABELS: Record<string, string> = {
  "channel-letters": "Channel Letters",
  "neon": "Neon Signs",
  "cabinet-signs": "Cabinet Signs",
  "monument-signs": "Monument Signs",
  "dimensional-letters": "Dimensional Letters",
  "print-signs": "Print Signs",
  "pylon-signs": "Pylon Signs",
  "light-box": "Light Box Signs",
  "led-signs": "LED Signs",
  "vinyl-banners": "Vinyl Banners",
};

export function ManufacturerCard({
  name,
  description,
  website,
  city,
  state,
  country,
  capabilities,
  certifications,
  isVerified,
  logoUrl,
}: ManufacturerCardProps) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-4">
        {logoUrl ? (
          <img src={logoUrl} alt={name} className="h-14 w-14 rounded-lg object-cover" />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-blue-50 text-xl font-bold text-blue-600">
            {name.charAt(0)}
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-neutral-900">{name}</h3>
            {isVerified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                <Award className="h-3 w-3" /> Verified
              </span>
            )}
          </div>
          {(city || state) && (
            <p className="mt-0.5 flex items-center gap-1 text-sm text-neutral-500">
              <MapPin className="h-3.5 w-3.5" />
              {[city, state, country].filter(Boolean).join(", ")}
            </p>
          )}
        </div>
      </div>

      {description && (
        <p className="mt-3 line-clamp-2 text-sm text-neutral-600">{description}</p>
      )}

      {capabilities.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {capabilities.map((cap) => (
            <span key={cap} className="rounded-full bg-neutral-100 px-2.5 py-0.5 text-xs font-medium text-neutral-600">
              {CAPABILITY_LABELS[cap] ?? cap}
            </span>
          ))}
        </div>
      )}

      {certifications.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {certifications.map((cert) => (
            <span key={cert} className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700">
              {cert}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        {website && (
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-1.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
          >
            <Globe className="h-3.5 w-3.5" />
            Visit Website
          </a>
        )}
        <button className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-blue-700">
          Request Quote
        </button>
      </div>
    </div>
  );
}
```

- [ ] **6.5** Create `src/components/manufacturers/manufacturer-grid.tsx` — client component that fetches manufacturers from the public API. Includes filter controls: capability dropdown, state text input, search bar. Renders a responsive grid of `ManufacturerCard` components. Shows "No manufacturers found" state when empty.

- [ ] **6.6** Create `src/app/manufacturers/page.tsx`:

```tsx
import { ManufacturerGrid } from "@/components/manufacturers/manufacturer-grid";

export const metadata = {
  title: "Find a Sign Manufacturer - GatSoft Signs",
  description: "Browse certified sign manufacturers in your area. Channel letters, neon, cabinet signs, and more.",
};

export default function ManufacturersPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-neutral-900 sm:text-4xl">
          Find a Sign Manufacturer
        </h1>
        <p className="mt-3 text-lg text-neutral-500">
          Browse certified manufacturers in your area
        </p>
      </div>
      <div className="mt-10">
        <ManufacturerGrid />
      </div>
    </div>
  );
}
```

- [ ] **6.7** Create `src/app/admin/manufacturers/page.tsx` and `src/components/admin/manufacturer-admin-list.tsx` — admin page for managing manufacturers. Table with all manufacturers (including inactive), edit/delete actions, verify toggle, featured order input. Add a "Manufacturers" link to the admin sidebar using the `Factory` icon from lucide-react.

- [ ] **6.8** Add "Manufacturers" link to the public navbar in `src/components/layout/navbar.tsx`.

**Commit:** `feat(marketplace): add manufacturer directory with public listing and admin management`

---

## Task 7: Embeddable 3D Configurator Widget — Build System

Set up the esbuild-based build pipeline that compiles the widget into a self-contained JS bundle.

### Files

- `widget/build.mjs` (new)
- `widget/package.json` (new)
- `widget/tsconfig.json` (new)
- `widget/src/index.tsx` (new — entry point)
- `widget/src/widget-app.tsx` (new)
- `widget/src/widget-styles.ts` (new — CSS-in-JS styles)
- `widget/src/api-client.ts` (new — standalone API client for widget)
- `widget/example.html` (new — test page)
- `package.json` (modify — add `build:widget` script)

### Steps

- [ ] **7.1** Create `widget/package.json`:

```json
{
  "name": "@gatsoft/configurator-widget",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "node build.mjs",
    "dev": "node build.mjs --watch"
  },
  "dependencies": {
    "react": "19.2.3",
    "react-dom": "19.2.3",
    "three": "^0.183.1",
    "@react-three/fiber": "^9.5.0",
    "@react-three/drei": "^10.7.7",
    "zustand": "^5.0.11"
  },
  "devDependencies": {
    "esbuild": "^0.25.0",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@types/three": "^0.183.1",
    "typescript": "^5.8.0"
  }
}
```

- [ ] **7.2** Create `widget/tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": false,
    "outDir": "dist",
    "baseUrl": ".",
    "paths": {
      "@widget/*": ["src/*"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.tsx"]
}
```

- [ ] **7.3** Create `widget/build.mjs`:

```js
// widget/build.mjs
import * as esbuild from "esbuild";

const isWatch = process.argv.includes("--watch");

/** @type {esbuild.BuildOptions} */
const buildOptions = {
  entryPoints: ["src/index.tsx"],
  bundle: true,
  minify: !isWatch,
  sourcemap: isWatch ? "inline" : false,
  format: "iife",
  globalName: "GatSoftConfigurator",
  target: ["es2020", "chrome90", "firefox90", "safari15"],
  outfile: "dist/configurator-widget.js",
  loader: {
    ".tsx": "tsx",
    ".ts": "ts",
  },
  define: {
    "process.env.NODE_ENV": isWatch ? '"development"' : '"production"',
  },
  // Inject global styles as JS
  jsx: "automatic",
  // Bundle everything into a single file
  external: [],
};

if (isWatch) {
  const ctx = await esbuild.context(buildOptions);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  const result = await esbuild.build(buildOptions);
  const size = (result.metafile?.outputs?.["dist/configurator-widget.js"]?.bytes ?? 0) / 1024;
  console.log(`Built: dist/configurator-widget.js`);
  if (size > 0) console.log(`Size: ${size.toFixed(1)} KB`);
}
```

- [ ] **7.4** Create `widget/src/api-client.ts` — a minimal standalone fetch wrapper (no dependency on the main app's api-client) that the widget uses to communicate with the host API:

```ts
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
```

- [ ] **7.5** Create `widget/src/widget-styles.ts` — all styles as JavaScript objects (CSS-in-JS) so the widget is self-contained with no Tailwind dependency. Define styles for: container, options panel, option groups, inputs, selects, color pickers, price display, buttons, loading states. Use a neutral design system that can be customized via CSS custom properties (`--widget-primary`, `--widget-bg`, etc.):

```ts
// widget/src/widget-styles.ts

export const styles = {
  container: {
    display: "flex",
    flexDirection: "row" as const,
    width: "100%",
    height: "600px",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    fontSize: "14px",
    color: "#171717",
    backgroundColor: "#fafafa",
    borderRadius: "12px",
    overflow: "hidden",
    border: "1px solid #e5e5e5",
  },
  viewport: {
    flex: "1 1 60%",
    position: "relative" as const,
    backgroundColor: "#f5f5f5",
    minHeight: "300px",
  },
  panel: {
    flex: "1 1 40%",
    overflowY: "auto" as const,
    padding: "24px",
    borderLeft: "1px solid #e5e5e5",
    backgroundColor: "#ffffff",
  },
  optionGroup: {
    marginBottom: "20px",
  },
  label: {
    display: "block",
    fontSize: "12px",
    fontWeight: "600" as const,
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
    color: "#737373",
    marginBottom: "6px",
  },
  input: {
    width: "100%",
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #d4d4d4",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.2s",
  },
  select: {
    width: "100%",
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid #d4d4d4",
    fontSize: "14px",
    backgroundColor: "#ffffff",
    outline: "none",
  },
  priceBar: {
    position: "sticky" as const,
    bottom: "0",
    padding: "16px 24px",
    borderTop: "1px solid #e5e5e5",
    backgroundColor: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  priceLabel: {
    fontSize: "10px",
    fontWeight: "600" as const,
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
    color: "#a3a3a3",
  },
  priceValue: {
    fontSize: "24px",
    fontWeight: "700" as const,
    color: "#171717",
  },
  button: {
    padding: "10px 20px",
    borderRadius: "8px",
    border: "none",
    fontSize: "14px",
    fontWeight: "600" as const,
    cursor: "pointer",
    transition: "background-color 0.2s",
    backgroundColor: "var(--widget-primary, #2563eb)",
    color: "#ffffff",
  },
  loading: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: "#a3a3a3",
  },
} as const;
```

- [ ] **7.6** Add `"build:widget": "cd widget && npm run build"` to the root `package.json` scripts.

**Commit:** `feat(widget): scaffold esbuild-based embeddable widget build system`

---

## Task 8: Embeddable 3D Configurator Widget — React App

Build the widget's React application: schema-driven options panel, 3D scene, and price display.

### Files

- `widget/src/widget-app.tsx` (new)
- `widget/src/widget-store.ts` (new — Zustand store for widget state)
- `widget/src/components/widget-scene.tsx` (new)
- `widget/src/components/widget-options.tsx` (new)
- `widget/src/components/widget-price.tsx` (new)
- `widget/src/index.tsx` (new — entry point with mount/unmount)
- `widget/example.html` (new)

### Steps

- [ ] **8.1** Create `widget/src/widget-store.ts`:

```ts
import { create } from "zustand";
import type { WidgetConfig, WidgetProduct, WidgetPriceBreakdown } from "./api-client";
import { widgetApi } from "./api-client";

interface WidgetState {
  config: WidgetConfig;
  product: WidgetProduct | null;
  optionValues: Record<string, unknown>;
  priceBreakdown: WidgetPriceBreakdown | null;
  loading: boolean;
  pricingLoading: boolean;
  error: string | null;

  initialize: (config: WidgetConfig, productSlug: string) => Promise<void>;
  setOptionValue: (key: string, value: unknown) => void;
  recalculatePrice: () => Promise<void>;
}

export const useWidgetStore = create<WidgetState>((set, get) => ({
  config: { apiUrl: "" },
  product: null,
  optionValues: {},
  priceBreakdown: null,
  loading: true,
  pricingLoading: false,
  error: null,

  initialize: async (config, productSlug) => {
    set({ config, loading: true, error: null });
    try {
      const { products } = await widgetApi.getProduct(config, productSlug);
      if (products.length === 0) {
        set({ loading: false, error: "Product not found" });
        return;
      }
      const product = products[0];

      // Extract default option values from product schema
      const schema = product.productSchema as {
        options?: Array<{ id: string; defaultValue?: unknown }>;
      } | null;
      const defaults: Record<string, unknown> = {};
      if (schema?.options) {
        for (const opt of schema.options) {
          if (opt.defaultValue !== undefined) {
            defaults[opt.id] = opt.defaultValue;
          }
        }
      }

      set({ product, optionValues: defaults, loading: false });

      // Initial price calculation
      get().recalculatePrice();
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load product",
      });
    }
  },

  setOptionValue: (key, value) => {
    set((state) => ({
      optionValues: { ...state.optionValues, [key]: value },
    }));
    // Debounced price recalculation
    clearTimeout((globalThis as Record<string, unknown>).__widgetPriceTimer as number);
    (globalThis as Record<string, unknown>).__widgetPriceTimer = setTimeout(
      () => get().recalculatePrice(),
      300,
    );
  },

  recalculatePrice: async () => {
    const { config, product, optionValues } = get();
    if (!product) return;

    set({ pricingLoading: true });
    try {
      const { breakdown } = await widgetApi.calculatePrice(
        config,
        product.id,
        optionValues,
      );
      set({ priceBreakdown: breakdown, pricingLoading: false });
    } catch (err) {
      console.error("Pricing error:", err);
      set({ pricingLoading: false });
    }
  },
}));
```

- [ ] **8.2** Create `widget/src/components/widget-options.tsx` — a schema-driven options panel. Reads `product.productSchema.options` and renders the appropriate control for each option type (text, number, select, color, toggle). Uses `widget-styles.ts` for all styling. Calls `setOptionValue` on change. Evaluates `dependsOn` rules to show/hide options dynamically.

- [ ] **8.3** Create `widget/src/components/widget-scene.tsx` — a minimal 3D scene using React Three Fiber. Reads `product.productSchema` and `optionValues` to render a basic 3D representation. For text-to-3D products, uses `Text3D` from drei with the bundled Helvetiker font. For other products, renders a box/plane placeholder with correct dimensions. Includes OrbitControls, studio lighting, and environment. The scene is wrapped in a Canvas with `style={styles.viewport}`.

- [ ] **8.4** Create `widget/src/components/widget-price.tsx`:

```tsx
import { useWidgetStore } from "../widget-store";
import { styles } from "../widget-styles";

export function WidgetPrice() {
  const breakdown = useWidgetStore((s) => s.priceBreakdown);
  const pricingLoading = useWidgetStore((s) => s.pricingLoading);

  const total = breakdown?.total ?? 0;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(total);

  return (
    <div style={styles.priceBar}>
      <div>
        <div style={styles.priceLabel}>Total</div>
        <div style={{ ...styles.priceValue, opacity: pricingLoading ? 0.5 : 1 }}>
          {formatted}
        </div>
      </div>
      <button
        style={styles.button}
        onClick={() => {
          const state = useWidgetStore.getState();
          const event = new CustomEvent("gatsoft:add-to-cart", {
            detail: {
              product: state.product,
              optionValues: state.optionValues,
              priceBreakdown: state.priceBreakdown,
            },
          });
          document.dispatchEvent(event);
        }}
      >
        Add to Cart
      </button>
    </div>
  );
}
```

- [ ] **8.5** Create `widget/src/widget-app.tsx`:

```tsx
import { Suspense } from "react";
import { useWidgetStore } from "./widget-store";
import { WidgetOptions } from "./components/widget-options";
import { WidgetScene } from "./components/widget-scene";
import { WidgetPrice } from "./components/widget-price";
import { styles } from "./widget-styles";

export function WidgetApp() {
  const loading = useWidgetStore((s) => s.loading);
  const error = useWidgetStore((s) => s.error);
  const product = useWidgetStore((s) => s.product);

  if (loading) {
    return (
      <div style={{ ...styles.container, alignItems: "center", justifyContent: "center" }}>
        <div style={styles.loading}>Loading configurator...</div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div style={{ ...styles.container, alignItems: "center", justifyContent: "center" }}>
        <div style={{ ...styles.loading, color: "#ef4444" }}>{error ?? "Product not found"}</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.viewport}>
        <Suspense fallback={<div style={styles.loading}>Loading 3D...</div>}>
          <WidgetScene />
        </Suspense>
      </div>
      <div style={{ ...styles.panel, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, overflowY: "auto" }}>
          <WidgetOptions />
        </div>
        <WidgetPrice />
      </div>
    </div>
  );
}
```

- [ ] **8.6** Create `widget/src/index.tsx` — the entry point that exposes `GatSoftConfigurator.mount()` globally and auto-mounts on `[data-gatsoft-configurator]` elements:

```tsx
import { createRoot, type Root } from "react-dom/client";
import { WidgetApp } from "./widget-app";
import { useWidgetStore } from "./widget-store";

interface MountOptions {
  container: HTMLElement;
  apiUrl: string;
  product: string;
  tenant?: string;
  apiKey?: string;
}

const roots = new Map<HTMLElement, Root>();

function mount(options: MountOptions): { unmount: () => void } {
  const { container, apiUrl, product, tenant, apiKey } = options;

  if (roots.has(container)) {
    roots.get(container)!.unmount();
  }

  const root = createRoot(container);
  roots.set(container, root);

  // Initialize the store
  useWidgetStore.getState().initialize(
    { apiUrl, tenantSlug: tenant, apiKey },
    product,
  );

  root.render(<WidgetApp />);

  return {
    unmount: () => {
      root.unmount();
      roots.delete(container);
    },
  };
}

// Auto-mount on data attribute elements
function autoMount() {
  const elements = document.querySelectorAll<HTMLElement>("[data-gatsoft-configurator]");
  elements.forEach((el) => {
    const apiUrl = el.dataset.apiUrl ?? el.dataset.gatsoft_api_url ?? "";
    const product = el.dataset.product ?? "";
    const tenant = el.dataset.tenant;
    const apiKey = el.dataset.apiKey;

    if (!apiUrl || !product) {
      console.warn("GatSoft Widget: data-api-url and data-product are required", el);
      return;
    }

    mount({ container: el, apiUrl, product, tenant, apiKey });
  });
}

// Auto-mount when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", autoMount);
} else {
  autoMount();
}

// Export for programmatic usage
export { mount };
```

- [ ] **8.7** Create `widget/example.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GatSoft Configurator Widget - Example</title>
  <style>
    body { font-family: sans-serif; margin: 40px; background: #f5f5f5; }
    h1 { font-size: 24px; margin-bottom: 20px; }
    .widget-container { max-width: 1200px; margin: 0 auto; }
  </style>
</head>
<body>
  <h1>Embeddable 3D Configurator Widget</h1>
  <div class="widget-container">
    <!-- Auto-mount via data attributes -->
    <div
      data-gatsoft-configurator
      data-api-url="http://localhost:3000"
      data-product="front-lit-trim-cap"
      data-tenant="gatsoft"
      style="height: 600px;"
    ></div>
  </div>

  <script src="dist/configurator-widget.js"></script>

  <script>
    // Listen for add-to-cart events
    document.addEventListener("gatsoft:add-to-cart", (e) => {
      console.log("Add to cart:", e.detail);
      alert("Added to cart! Check console for details.");
    });
  </script>
</body>
</html>
```

- [ ] **8.8** Run `cd widget && npm install && npm run build` to verify the widget builds. Fix any TypeScript or bundling issues. Verify the output `widget/dist/configurator-widget.js` is a single self-contained file.

**Commit:** `feat(widget): build embeddable 3D configurator with schema-driven options and API pricing`

---

## Task 9: WebXR AR Preview

Add AR preview capability: "View in AR" button, GLB/USDZ export from the 3D scene, and WebXR session or iOS AR Quick Look fallback.

### Files

- `src/lib/ar-export.ts` (new)
- `src/components/configurator/ar-button.tsx` (new)
- `src/components/configurator/configurator-layout.tsx` (modify — add AR button)

### Steps

- [ ] **9.1** Create `src/lib/ar-export.ts`:

```ts
// src/lib/ar-export.ts
/**
 * Export the current Three.js scene to GLB (Android) or USDZ (iOS) for AR preview.
 *
 * Uses Three.js GLTFExporter and USDZExporter.
 * These are imported dynamically to avoid adding to the main bundle.
 */

import type { Scene, Object3D } from "three";

export type ArFormat = "glb" | "usdz";

export function detectArSupport(): {
  webxr: boolean;
  arQuickLook: boolean;
  preferredFormat: ArFormat | null;
} {
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  const arQuickLook = isIOS; // iOS Safari supports AR Quick Look via <a rel="ar">
  const webxr = "xr" in navigator;

  return {
    webxr,
    arQuickLook,
    preferredFormat: arQuickLook ? "usdz" : webxr ? "glb" : null,
  };
}

/**
 * Export a Three.js Object3D (typically the sign group) to a GLB blob.
 */
export async function exportToGlb(object: Object3D): Promise<Blob> {
  const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");

  const exporter = new GLTFExporter();

  return new Promise<Blob>((resolve, reject) => {
    exporter.parse(
      object,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolve(new Blob([result], { type: "model/gltf-binary" }));
        } else {
          // JSON result — convert to GLB not supported, return as JSON
          const json = JSON.stringify(result);
          resolve(new Blob([json], { type: "model/gltf+json" }));
        }
      },
      (error) => reject(error),
      { binary: true },
    );
  });
}

/**
 * Export a Three.js Object3D to USDZ (for iOS AR Quick Look).
 */
export async function exportToUsdz(object: Object3D): Promise<Blob> {
  const { USDZExporter } = await import("three/examples/jsm/exporters/USDZExporter.js");

  const exporter = new USDZExporter();
  const arrayBuffer = await exporter.parse(object as unknown as Scene);
  return new Blob([arrayBuffer], { type: "model/vnd.usdz+zip" });
}

/**
 * Trigger AR Quick Look on iOS by creating a temporary <a rel="ar"> link.
 */
export function openArQuickLook(usdzBlob: Blob): void {
  const url = URL.createObjectURL(usdzBlob);
  const anchor = document.createElement("a");
  anchor.setAttribute("rel", "ar");
  anchor.setAttribute("href", url);
  // AR Quick Look requires a child <img> element
  const img = document.createElement("img");
  img.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  anchor.appendChild(img);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Clean up blob URL after a delay
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Start a WebXR AR session (Android Chrome).
 * Returns false if WebXR AR is not available.
 */
export async function startWebXrArSession(
  glbBlob: Blob,
): Promise<boolean> {
  // Use the model-viewer approach as a fallback for WebXR:
  // Create an <a> link that triggers the intent viewer on Android
  const url = URL.createObjectURL(glbBlob);

  // Android Chrome supports intent-based AR via scene-viewer
  const intentUrl =
    `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(url)}&mode=ar_preferred#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;end;`;

  const anchor = document.createElement("a");
  anchor.href = intentUrl;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}
```

- [ ] **9.2** Create `src/components/configurator/ar-button.tsx`:

```tsx
"use client";

import { useState, useEffect, useCallback } from "react";
import { Smartphone } from "lucide-react";
import { detectArSupport, exportToGlb, exportToUsdz, openArQuickLook, startWebXrArSession } from "@/lib/ar-export";
import { toast } from "sonner";

interface ArButtonProps {
  /** Called to get the Three.js Object3D to export. */
  getSceneObject: () => import("three").Object3D | null;
  disabled?: boolean;
}

export function ArButton({ getSceneObject, disabled }: ArButtonProps) {
  const [arSupport, setArSupport] = useState<ReturnType<typeof detectArSupport> | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setArSupport(detectArSupport());
  }, []);

  const handleArClick = useCallback(async () => {
    if (!arSupport?.preferredFormat) {
      toast.error("AR is not supported on this device");
      return;
    }

    const object = getSceneObject();
    if (!object) {
      toast.error("No 3D model to export");
      return;
    }

    setExporting(true);
    try {
      if (arSupport.arQuickLook) {
        const usdz = await exportToUsdz(object);
        openArQuickLook(usdz);
      } else {
        const glb = await exportToGlb(object);
        await startWebXrArSession(glb);
      }
    } catch (err) {
      console.error("AR export error:", err);
      toast.error("Failed to open AR preview");
    } finally {
      setExporting(false);
    }
  }, [arSupport, getSceneObject]);

  // Hide if no AR support detected
  if (arSupport && !arSupport.preferredFormat) return null;

  // Show loading during SSR (arSupport is null on server)
  if (!arSupport) return null;

  return (
    <button
      onClick={handleArClick}
      disabled={disabled || exporting}
      className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-2.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
      title="View in AR"
    >
      <Smartphone className="h-4 w-4" />
      <span className="hidden sm:inline">{exporting ? "Preparing..." : "View in AR"}</span>
    </button>
  );
}
```

- [ ] **9.3** Modify `src/components/configurator/configurator-layout.tsx` to add the AR button. The 3D scene needs to expose a ref to the sign group. Add a module-level ref that the scene can write to:

Create `src/components/three/scene-ref.ts`:

```ts
import type { Object3D } from "three";

/** Shared ref for the sign group, written by the 3D scene, read by AR export. */
let signGroupRef: Object3D | null = null;

export function setSignGroupRef(obj: Object3D | null) {
  signGroupRef = obj;
}

export function getSignGroupRef(): Object3D | null {
  return signGroupRef;
}
```

In `src/components/three/scene.tsx`, inside the `<Center>` component wrapper, add an effect that calls `setSignGroupRef` with the Center's group ref so the AR exporter can access it.

In `src/components/configurator/configurator-layout.tsx`, import `ArButton` and `getSignGroupRef`, then add the AR button in the action buttons row (between Wall Mockup and Add to Cart):

```tsx
<ArButton
  getSceneObject={getSignGroupRef}
  disabled={!hasRequiredInput}
/>
```

- [ ] **9.4** Add a photo-overlay fallback for devices without AR support. Create `src/components/configurator/photo-overlay-fallback.tsx` — when the user clicks "View in AR" on unsupported devices, show a modal that lets them upload a photo of their building, then composites the 3D screenshot on top of the photo using a `<canvas>` element. The user can drag/resize the sign overlay. This uses `captureCanvasScreenshot()` from `src/lib/capture-screenshot.ts` for the sign image. The modal is shown only when `detectArSupport().preferredFormat === null`.

Update `ArButton` to show the overlay fallback instead of hiding when AR is not supported.

**Commit:** `feat(ar): add WebXR AR preview with USDZ/GLB export and photo overlay fallback`

---

## Task 10: Tenant Onboarding Wizard

Build a multi-step onboarding flow for new sign shops: create account, set branding, import first product, configure pricing, and preview configurator.

### Files

- `src/app/onboarding/page.tsx` (new)
- `src/app/onboarding/layout.tsx` (new)
- `src/components/onboarding/onboarding-wizard.tsx` (new)
- `src/components/onboarding/steps/account-step.tsx` (new)
- `src/components/onboarding/steps/branding-step.tsx` (new)
- `src/components/onboarding/steps/product-step.tsx` (new)
- `src/components/onboarding/steps/pricing-step.tsx` (new)
- `src/components/onboarding/steps/preview-step.tsx` (new)
- `src/app/api/v1/onboarding/route.ts` (new)
- `prisma/schema.prisma` (modify — add `onboardingCompleted` to Tenant)

### Steps

- [ ] **10.1** Add `onboardingCompleted Boolean @default(false)` to the Tenant model in `prisma/schema.prisma`. Run migration: `npx prisma migrate dev --name add-onboarding-completed`

- [ ] **10.2** Create `src/app/api/v1/onboarding/route.ts` — handles the full onboarding flow in a single POST. Accepts a JSON body with all onboarding data. In a transaction:
  1. Creates the User (with hashed password)
  2. Creates the Tenant (with branding)
  3. Links User to Tenant as ADMIN
  4. Creates an ApiKey for the tenant
  5. Clones the selected ProductTemplate into a Product for the tenant
  6. Creates a PricingFormula from the selected preset
  7. Marks `onboardingCompleted: true`
  8. Returns the tenant slug and a session token

Validation with Zod. All fields that are "skip for now" have sensible defaults.

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod/v4";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

const onboardingSchema = z.object({
  // Step 1: Account
  email: z.email(),
  password: z.string().min(8),
  name: z.string().min(1),
  shopName: z.string().min(1),

  // Step 2: Branding (optional)
  primaryColor: z.string().optional(),
  accentColor: z.string().optional(),
  logoUrl: z.string().optional(),

  // Step 3: Product template
  templateSlug: z.string().min(1),

  // Step 4: Pricing overrides (optional)
  pricingOverrides: z
    .record(z.string(), z.number())
    .optional(),
});

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const slug = data.shopName
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();

  // Check for existing user or tenant
  const existingUser = await prisma.user.findUnique({ where: { email: data.email } });
  if (existingUser) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const existingTenant = await prisma.tenant.findUnique({ where: { slug } });
  if (existingTenant) {
    return NextResponse.json({ error: "Shop name already taken" }, { status: 409 });
  }

  // Find the template
  const template = await prisma.productTemplate.findUnique({ where: { slug: data.templateSlug } });
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  const passwordHash = await bcrypt.hash(data.password, 12);
  const apiKey = `gsk_${randomBytes(24).toString("hex")}`;

  const result = await prisma.$transaction(async (tx) => {
    // Create tenant
    const tenant = await tx.tenant.create({
      data: {
        slug,
        name: data.shopName,
        primaryColor: data.primaryColor ?? "#2563eb",
        accentColor: data.accentColor ?? "#1e40af",
        logoUrl: data.logoUrl,
        onboardingCompleted: true,
      },
    });

    // Create user
    const user = await tx.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        role: "ADMIN",
        tenantId: tenant.id,
      },
    });

    // Create API key
    await tx.apiKey.create({
      data: {
        tenantId: tenant.id,
        key: apiKey,
        name: "Default API Key",
      },
    });

    // Create pricing formula from template defaults
    const formula = await tx.pricingFormula.create({
      data: {
        tenantId: tenant.id,
        name: `${template.name} Pricing`,
        type: "PRESET",
        presetId: "per-inch-letter",
        formulaAst: null,
      },
    });

    // Clone template into product
    const pricingParams =
      data.pricingOverrides && template.pricingParams
        ? { ...(template.pricingParams as Record<string, unknown>), ...data.pricingOverrides }
        : template.pricingParams;

    await tx.product.create({
      data: {
        tenantId: tenant.id,
        slug: template.slug,
        name: template.name,
        description: template.description,
        category: template.category,
        productSchema: template.productSchema,
        pricingParams,
        renderConfig: template.renderConfig,
        pricingFormulaId: formula.id,
      },
    });

    return { tenant, user };
  });

  return NextResponse.json(
    {
      tenantSlug: result.tenant.slug,
      tenantId: result.tenant.id,
      userId: result.user.id,
      apiKey,
    },
    { status: 201 },
  );
}
```

- [ ] **10.3** Create `src/app/onboarding/layout.tsx`:

```tsx
export const metadata = {
  title: "Set Up Your Sign Shop - GatSoft Signs",
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-4">
      <div className="w-full max-w-2xl">
        {children}
      </div>
    </div>
  );
}
```

- [ ] **10.4** Create `src/components/onboarding/onboarding-wizard.tsx` — client component that manages the multi-step wizard state. Tracks the current step (1-5), form data as a single state object, and navigation (next/back/skip). Renders a progress bar at the top showing all 5 steps with labels. Each step is a child component that receives `data` and `onChange` props. The wizard calls the onboarding API on the final step, then redirects to `/admin`.

```tsx
"use client";

import { useState, useCallback } from "react";
import { AccountStep } from "./steps/account-step";
import { BrandingStep } from "./steps/branding-step";
import { ProductStep } from "./steps/product-step";
import { PricingStep } from "./steps/pricing-step";
import { PreviewStep } from "./steps/preview-step";
import { useRouter } from "next/navigation";

interface OnboardingData {
  email: string;
  password: string;
  name: string;
  shopName: string;
  primaryColor: string;
  accentColor: string;
  logoUrl: string;
  templateSlug: string;
  pricingOverrides: Record<string, number>;
}

const STEPS = [
  { label: "Account", component: AccountStep },
  { label: "Branding", component: BrandingStep },
  { label: "Product", component: ProductStep },
  { label: "Pricing", component: PricingStep },
  { label: "Preview", component: PreviewStep },
];

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OnboardingData>({
    email: "",
    password: "",
    name: "",
    shopName: "",
    primaryColor: "#2563eb",
    accentColor: "#1e40af",
    logoUrl: "",
    templateSlug: "front-lit-trim-cap",
    pricingOverrides: {},
  });

  const updateData = useCallback(
    (partial: Partial<OnboardingData>) => {
      setData((prev) => ({ ...prev, ...partial }));
    },
    [],
  );

  const handleNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleFinish = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setSubmitting(false);
    }
  };

  const StepComponent = STEPS[step].component;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
      {/* Progress bar */}
      <div className="border-b border-neutral-100 px-8 py-4">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                  i <= step
                    ? "bg-blue-600 text-white"
                    : "bg-neutral-100 text-neutral-400"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`hidden text-sm font-medium sm:inline ${
                  i <= step ? "text-neutral-900" : "text-neutral-400"
                }`}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div className="mx-2 hidden h-px w-8 bg-neutral-200 sm:block" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="px-8 py-8">
        <StepComponent data={data} onChange={updateData} />

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-neutral-100 px-8 py-4">
        <button
          onClick={handleBack}
          disabled={step === 0}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:invisible"
        >
          Back
        </button>
        <div className="flex gap-2">
          {step > 0 && step < STEPS.length - 1 && (
            <button
              onClick={handleNext}
              className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-500 transition hover:text-neutral-700"
            >
              Skip for now
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Setting up..." : "Complete Setup"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **10.5** Create the 5 step components in `src/components/onboarding/steps/`:

**`account-step.tsx`** — email, password, full name, shop name inputs. Validate email format and password length client-side. Required fields marked with asterisk.

**`branding-step.tsx`** — primary color picker, accent color picker, logo upload placeholder (text input for URL for now). Shows a live preview bar with the selected colors.

**`product-step.tsx`** — fetches available `ProductTemplate` records from `/api/v1/templates` and displays them as a visual grid of cards. Each card shows the template name, category, and thumbnail. The user selects one to use as their first product.

**`pricing-step.tsx`** — shows the selected template's default pricing params in editable number inputs. Fields: basePricePerInch, largeSizePricePerInch, largeSizeThreshold, minHeightForPrice, minOrderPrice. Users can adjust or keep defaults.

**`preview-step.tsx`** — shows a summary of all selections: shop name, branding colors, selected product template, pricing params. Includes a simple mockup of what their configurator page will look like (just a styled div with their colors and product name). Shows a "Complete Setup" button.

Each step component has props: `{ data: OnboardingData; onChange: (partial: Partial<OnboardingData>) => void }`.

- [ ] **10.6** Create `src/app/onboarding/page.tsx`:

```tsx
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default function OnboardingPage() {
  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-neutral-900">
          Set Up Your Sign Shop
        </h1>
        <p className="mt-2 text-neutral-500">
          Get your 3D configurator running in minutes
        </p>
      </div>
      <OnboardingWizard />
    </div>
  );
}
```

**Commit:** `feat(onboarding): add multi-step tenant onboarding wizard`

---

## Task 11: Integration Wiring & Final Polish

Wire all the new features together: add i18n to key components, connect currency formatting to tenant settings, add navigation links, and ensure all new pages are accessible.

### Files

- `src/app/layout.tsx` (modify — wrap with I18nProvider)
- `src/components/layout/navbar.tsx` (modify — add links and language switcher)
- `src/components/configurator/configurator-layout.tsx` (modify — use translations for labels)
- `src/app/cart/page.tsx` (modify — use translations for cart labels)
- `src/components/admin/sidebar.tsx` (verify all links added)

### Steps

- [ ] **11.1** Update `src/app/layout.tsx` to wrap the root children with `<I18nProvider>`. Import from `@/i18n`. The `defaultLocale` should eventually come from the tenant, but for now hardcode `"en"`.

- [ ] **11.2** Update `src/components/layout/navbar.tsx`:
  - Add "Manufacturers" link in the main navigation
  - Add `<LanguageSwitcher />` before the cart icon
  - Use `useTranslation()` for any translatable label (e.g., "Sign In", "Products")

- [ ] **11.3** Update `src/components/configurator/configurator-layout.tsx`:
  - Import `useTranslation` from `@/i18n`
  - Replace hardcoded strings with translation keys: "Add to Cart" -> `t("common.addToCart")`, "Wall Mockup" -> `t("configurator.wallMockup")`, "Save" -> `t("common.save")`, etc.
  - Add `<ArButton>` import and render in the action buttons row (from Task 9)

- [ ] **11.4** Update the cart page (`src/app/cart/page.tsx`) to use translation keys for "Your Cart", "Empty Cart", "Proceed to Checkout", etc.

- [ ] **11.5** Update `formatPrice` calls throughout the app to pass tenant currency when available. For now, this means the configurator layout and cart page read the store/context for currency and pass it to `formatPrice`. The widget handles its own formatting.

- [ ] **11.6** Verify the admin sidebar has all links:
  - Dashboard
  - Products
  - Orders
  - Templates
  - Pricing Formulas
  - Settings
  - Webhooks
  - API Docs
  - Manufacturers
  - Back to store

- [ ] **11.7** Run `npm run build` to verify no TypeScript errors across all new files. Fix any import issues or type errors.

**Commit:** `feat(integration): wire i18n, currency, AR, and navigation across the platform`

---

## Task 12: Widget Documentation & End-to-End Verification

Create usage documentation for the embeddable widget and verify the full Phase 5 feature set works together.

### Files

- `widget/README.md` (new)
- `src/app/admin/api-docs/page.tsx` (modify — add widget embed section)

### Steps

- [ ] **12.1** Create `widget/README.md` documenting the embeddable widget:

```markdown
# GatSoft 3D Configurator Widget

Embeddable 3D sign configurator for external websites.

## Quick Start

Add the script tag to your page:

    <script src="https://your-domain.com/widget/configurator-widget.js"></script>

Add a container element with data attributes:

    <div
      data-gatsoft-configurator
      data-api-url="https://your-domain.com"
      data-product="front-lit-trim-cap"
      data-tenant="your-tenant-slug"
      data-api-key="gsk_your_api_key"
      style="height: 600px;"
    ></div>

## Data Attributes

| Attribute | Required | Description |
|-----------|----------|-------------|
| data-api-url | Yes | Base URL of the GatSoft API |
| data-product | Yes | Product slug to configure |
| data-tenant | No | Tenant slug (uses default if omitted) |
| data-api-key | No | API key for authentication |

## Programmatic Usage

    const instance = GatSoftConfigurator.mount({
      container: document.getElementById("my-widget"),
      apiUrl: "https://your-domain.com",
      product: "front-lit-trim-cap",
      tenant: "your-tenant-slug",
      apiKey: "gsk_your_api_key",
    });

    // Later:
    instance.unmount();

## Events

Listen for cart events:

    document.addEventListener("gatsoft:add-to-cart", (e) => {
      console.log(e.detail.product);
      console.log(e.detail.optionValues);
      console.log(e.detail.priceBreakdown);
    });

## Customization

Override CSS custom properties on the container:

    [data-gatsoft-configurator] {
      --widget-primary: #2563eb;
      --widget-bg: #fafafa;
    }

## Build

    cd widget
    npm install
    npm run build

Output: `widget/dist/configurator-widget.js`
```

- [ ] **12.2** Add a "Widget Embed" section to the API docs page. In `src/components/admin/api-docs-content.tsx`, add a section at the top (before the endpoint groups) that explains how to embed the configurator widget. Include the `<script>` tag snippet, data attribute reference, and a note about CORS (the API must allow the external domain's origin).

- [ ] **12.3** Build verification checklist (manual):
  - `npm run build` passes with no errors
  - `cd widget && npm run build` produces `dist/configurator-widget.js`
  - `/manufacturers` page renders the manufacturer directory
  - `/onboarding` page shows the multi-step wizard
  - `/admin/webhooks` shows the webhook management UI
  - `/admin/api-docs` shows the full API reference
  - Language switcher changes text in the navbar and configurator
  - AR button appears on mobile devices (hidden on desktop without WebXR)
  - Admin sidebar shows all 9 navigation items
  - Widget example.html loads and shows the configurator

- [ ] **12.4** Run `npx jest` to verify all existing pricing engine tests still pass after the `formatPrice` signature change (it's backward-compatible since new params are optional).

**Commit:** `docs(widget): add widget documentation and verify Phase 5 feature set`
