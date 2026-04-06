"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

// ---------------------------------------------------------------------------
// Method badge
// ---------------------------------------------------------------------------

const METHOD_COLORS: Record<string, string> = {
  GET: "bg-green-100 text-green-700",
  POST: "bg-blue-100 text-blue-700",
  PATCH: "bg-yellow-100 text-yellow-700",
  DELETE: "bg-red-100 text-red-700",
};

function MethodBadge({ method }: { method: string }) {
  return (
    <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-bold ${METHOD_COLORS[method] ?? "bg-neutral-100 text-neutral-700"}`}>
      {method}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Copyable code block
// ---------------------------------------------------------------------------

function CodeBlock({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    await navigator.clipboard.writeText(children);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="group relative">
      <pre className="overflow-x-auto rounded-lg bg-neutral-900 p-4 text-xs leading-relaxed text-neutral-200">
        {children}
      </pre>
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 rounded-md bg-neutral-700 p-1.5 text-neutral-300 opacity-0 transition hover:bg-neutral-600 group-hover:opacity-100"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Endpoint section
// ---------------------------------------------------------------------------

interface EndpointProps {
  method: string;
  path: string;
  description: string;
  requestExample?: string;
  responseExample?: string;
}

function Endpoint({ method, path, description, requestExample, responseExample }: EndpointProps) {
  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-5">
      <div className="flex items-center gap-3">
        <MethodBadge method={method} />
        <code className="text-sm font-semibold text-neutral-800">{path}</code>
      </div>
      <p className="mt-2 text-sm text-neutral-600">{description}</p>
      {requestExample && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">Request Body</p>
          <CodeBlock>{requestExample}</CodeBlock>
        </div>
      )}
      {responseExample && (
        <div className="mt-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">Response</p>
          <CodeBlock>{responseExample}</CodeBlock>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section grouping
// ---------------------------------------------------------------------------

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section id={title.toLowerCase().replace(/\s+/g, "-")} className="scroll-mt-20">
      <h2 className="text-lg font-bold text-neutral-900">{title}</h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

const SECTIONS = [
  "Widget Embed",
  "Authentication",
  "Products",
  "Pricing",
  "Formulas",
  "Orders",
  "Templates",
  "Checkout",
  "Admin",
  "Webhooks",
  "Manufacturers",
];

// ---------------------------------------------------------------------------
// Main content
// ---------------------------------------------------------------------------

export function ApiDocsContent() {
  return (
    <div className="flex gap-8">
      {/* Left nav */}
      <nav className="hidden w-48 shrink-0 lg:block">
        <div className="sticky top-24 space-y-1">
          {SECTIONS.map((s) => (
            <a
              key={s}
              href={`#${s.toLowerCase().replace(/\s+/g, "-")}`}
              className="block rounded-md px-3 py-1.5 text-sm text-neutral-600 transition hover:bg-neutral-100 hover:text-neutral-900"
            >
              {s}
            </a>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <div className="min-w-0 flex-1 space-y-12">

        {/* Widget Embed */}
        <Section title="Widget Embed">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-5">
            <h3 className="text-sm font-semibold text-blue-900">Embeddable 3D Configurator</h3>
            <p className="mt-1 text-sm text-blue-700">
              Embed the 3D configurator on any external website with a single script tag.
            </p>
            <div className="mt-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-blue-400">Script Tag</p>
              <CodeBlock>{`<script src="https://your-domain.com/widget/configurator-widget.js"></script>`}</CodeBlock>
            </div>
            <div className="mt-3">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-blue-400">Container</p>
              <CodeBlock>{`<div
  data-gatsoft-configurator
  data-api-url="https://your-domain.com"
  data-product="front-lit-trim-cap"
  data-tenant="your-tenant-slug"
  data-api-key="gsk_your_api_key"
  style="height: 600px;"
></div>`}</CodeBlock>
            </div>
            <p className="mt-3 text-xs text-blue-600">
              Note: Ensure CORS is configured to allow the external domain that embeds the widget.
            </p>
          </div>
        </Section>

        {/* Authentication */}
        <Section title="Authentication">
          <div className="rounded-lg border border-neutral-200 bg-white p-5 text-sm text-neutral-600">
            <p>All API requests require authentication via headers:</p>
            <table className="mt-3 w-full text-xs">
              <thead>
                <tr className="border-b text-left text-neutral-500">
                  <th className="pb-2 pr-4">Header</th>
                  <th className="pb-2">Description</th>
                </tr>
              </thead>
              <tbody className="text-neutral-700">
                <tr className="border-b border-neutral-50">
                  <td className="py-2 pr-4 font-mono">X-Tenant-Slug</td>
                  <td className="py-2">Your tenant slug (identifies your store)</td>
                </tr>
                <tr className="border-b border-neutral-50">
                  <td className="py-2 pr-4 font-mono">X-API-Key</td>
                  <td className="py-2">API key for external integrations</td>
                </tr>
                <tr>
                  <td className="py-2 pr-4 font-mono">Authorization</td>
                  <td className="py-2">Bearer token for admin endpoints (from session)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Section>

        {/* Products */}
        <Section title="Products">
          <Endpoint method="GET" path="/api/v1/products" description="List all active products for the tenant. Supports query params: category, slug." responseExample={`{
  "products": [
    {
      "id": "clx...",
      "slug": "front-lit-trim-cap",
      "name": "Front-Lit with Trim Cap",
      "category": "channel-letters",
      "productSchema": { ... },
      "pricingParams": { ... }
    }
  ]
}`} />
          <Endpoint method="GET" path="/api/v1/products/:id" description="Get a single product by ID." />
          <Endpoint method="POST" path="/api/v1/products" description="Create a new product (admin only)." requestExample={`{
  "slug": "custom-sign",
  "name": "Custom Sign",
  "category": "channel-letters",
  "productSchema": { ... },
  "pricingParams": { ... }
}`} />
          <Endpoint method="PATCH" path="/api/v1/products/:id" description="Update a product (admin only)." />
          <Endpoint method="DELETE" path="/api/v1/products/:id" description="Delete a product (admin only)." />
        </Section>

        {/* Pricing */}
        <Section title="Pricing">
          <Endpoint method="POST" path="/api/v1/pricing/calculate" description="Calculate price for a product configuration. Returns a full breakdown." requestExample={`{
  "productId": "clx...",
  "optionValues": {
    "text": "HELLO",
    "height": 24,
    "lit": "front-lit",
    "led": "6000K"
  },
  "dimensions": {
    "widthInches": 60,
    "heightInches": 24
  }
}`} responseExample={`{
  "breakdown": {
    "basePrice": 1920,
    "appliedMultipliers": [
      { "name": "LED Upgrade", "value": 1.1 }
    ],
    "subtotal": 2112,
    "total": 2112,
    "minOrderApplied": false,
    "lineItems": [
      { "label": "5 letters x 24\\" x $16/in", "amount": 1920 }
    ]
  }
}`} />
        </Section>

        {/* Formulas */}
        <Section title="Formulas">
          <Endpoint method="GET" path="/api/v1/formulas" description="List all pricing formulas for the tenant." />
          <Endpoint method="GET" path="/api/v1/formulas/:id" description="Get a single pricing formula." />
          <Endpoint method="POST" path="/api/v1/formulas" description="Create a new pricing formula (admin)." requestExample={`{
  "name": "Premium Pricing",
  "type": "PRESET",
  "presetId": "per-inch-letter"
}`} />
          <Endpoint method="PATCH" path="/api/v1/formulas/:id" description="Update a pricing formula (admin)." />
          <Endpoint method="DELETE" path="/api/v1/formulas/:id" description="Delete a pricing formula (admin)." />
        </Section>

        {/* Orders */}
        <Section title="Orders">
          <Endpoint method="GET" path="/api/v1/orders" description="List orders for the tenant." responseExample={`{
  "orders": [
    {
      "id": "clx...",
      "orderNumber": "GS-20260001",
      "status": "PAYMENT_RECEIVED",
      "total": 2500.00,
      "createdAt": "2026-04-01T..."
    }
  ]
}`} />
          <Endpoint method="GET" path="/api/v1/orders/:id" description="Get a single order with items." />
          <Endpoint method="GET" path="/api/v1/orders/:id/files" description="Get production files for an order." />
        </Section>

        {/* Templates */}
        <Section title="Templates">
          <Endpoint method="GET" path="/api/v1/templates" description="List available product templates." />
          <Endpoint method="GET" path="/api/v1/templates/:id" description="Get a single template." />
          <Endpoint method="POST" path="/api/v1/templates/:id/clone" description="Clone a template into a tenant product." />
        </Section>

        {/* Checkout */}
        <Section title="Checkout">
          <Endpoint method="POST" path="/api/v1/checkout" description="Create a Stripe checkout session for cart items." requestExample={`{
  "items": [
    {
      "productId": "clx...",
      "optionValues": { "text": "HELLO", "height": 24 },
      "quantity": 1,
      "clientPrice": 2112
    }
  ],
  "customerEmail": "customer@example.com",
  "successUrl": "https://your-site.com/success",
  "cancelUrl": "https://your-site.com/cart"
}`} responseExample={`{
  "sessionId": "cs_...",
  "url": "https://checkout.stripe.com/...",
  "orderNumber": "GS-20260042"
}`} />
        </Section>

        {/* Admin */}
        <Section title="Admin">
          <Endpoint method="GET" path="/api/v1/admin/tenant" description="Get tenant settings." />
          <Endpoint method="PATCH" path="/api/v1/admin/tenant" description="Update tenant settings (name, branding, currency)." />
          <Endpoint method="GET" path="/api/v1/admin/exchange-rates" description="List exchange rates for the tenant." />
          <Endpoint method="POST" path="/api/v1/admin/exchange-rates" description="Create or update an exchange rate." requestExample={`{
  "toCurrency": "EUR",
  "rate": 0.92
}`} />
        </Section>

        {/* Webhooks */}
        <Section title="Webhooks">
          <Endpoint method="GET" path="/api/v1/admin/webhooks" description="List all webhook endpoints for the tenant." />
          <Endpoint method="POST" path="/api/v1/admin/webhooks" description="Create a new webhook endpoint. Returns the signing secret (shown once)." requestExample={`{
  "url": "https://your-server.com/webhooks",
  "events": ["order.created", "order.paid"]
}`} />
          <Endpoint method="PATCH" path="/api/v1/admin/webhooks/:id" description="Update a webhook (URL, events, active status)." />
          <Endpoint method="DELETE" path="/api/v1/admin/webhooks/:id" description="Delete a webhook endpoint." />
        </Section>

        {/* Manufacturers */}
        <Section title="Manufacturers">
          <Endpoint method="GET" path="/api/v1/manufacturers" description="List manufacturers (public). Supports query params: capability, state, country, search." responseExample={`{
  "manufacturers": [
    {
      "id": "clx...",
      "name": "Premium Signs Co",
      "slug": "premium-signs-co",
      "capabilities": ["channel-letters", "neon"],
      "isVerified": true
    }
  ]
}`} />
          <Endpoint method="POST" path="/api/v1/manufacturers" description="Create a manufacturer listing (admin)." />
          <Endpoint method="PATCH" path="/api/v1/manufacturers/:id" description="Update a manufacturer (admin)." />
          <Endpoint method="DELETE" path="/api/v1/manufacturers/:id" description="Delete a manufacturer (admin)." />
        </Section>
      </div>
    </div>
  );
}
