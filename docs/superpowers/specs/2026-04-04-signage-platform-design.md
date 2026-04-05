# GatSoft Signs Platform - Design Specification

**Date:** 2026-04-04
**Status:** Approved
**Author:** Arman + Claude

## 1. Vision

Build a best-in-class signage design and ecommerce platform that serves two markets simultaneously:

1. **D2C Storefront** — GatSoft Signs sells custom signage directly to end customers
2. **B2B SaaS** — Sign shops embed the configurator on their own websites with full white-label branding

No existing competitor covers all sign types (channel letters, pylons, monuments, lightboxes, neon, printed signs, apparel) in a single platform with real 3D preview, admin-configurable products, flexible pricing formulas, and production-ready file export. This is the gap we fill.

## 2. Competitive Landscape

### Direct Competitors

| Competitor | Model | 3D | Pricing | Key Strength | Key Weakness |
|---|---|---|---|---|---|
| SignMonkey | D2C | 2D builder | Per-letter, instant | Patented plug-n-play install, 5-day production | D2C only, no SaaS/embed |
| Sign Customiser | B2B SaaS | 2D/3D with lighting | Merchant-configurable | Multi-platform embed, manufacturer directory, SVG export | No real 3D geometry generation |
| Dezigner.ai | B2B SaaS (Shopify) | 2D CSS effects + AR | Real-time, volumetric | AI logo-to-sign, AR building preview | Shopify-only, neon-focused, not real 3D |
| Signs Simulator | B2B SaaS | Real-time 3D + photo overlay | Admin-defined | Sign-on-building overlay, BOM + SVG output | Limited product types (6) |
| Signs Designer | B2B SaaS plugin | 2D material rendering | Material-based | Multi-font, WooCommerce/Shopify | No 3D, basic feature set |
| Zakeke | B2B SaaS (general) | 3D + AR + Virtual Try-On | Rule-based add-ons | 25K+ brands, deepest integrations | Generic — no signage-specific pricing or text-to-3D |
| ImprintNext | B2B SaaS | 3D + 360 + AR | Dynamic real-time | 10K+ product catalog, apparel focus | Not signage-specific |
| Beegraphy | B2B SaaS | Parametric 3D | Live + CAD/CAM output | True parametric design, production-ready CAD | Architecture/furniture focus, not signage |

### Market Gaps We Exploit

1. No platform does comprehensive real-time 3D for ALL sign types in one tool
2. No platform combines D2C + B2B SaaS elegantly
3. Pricing formula customization is weak everywhere — shops want full control
4. Template libraries are minimal across all competitors
5. AR "sign on your building" is not combined with high-quality 3D anywhere
6. Production-ready file export (SVG, CAD, BOM) is the #1 feature sign shops want but few deliver well

### Industry Pricing Benchmarks

| Sign Type | Price Range | Pricing Model |
|---|---|---|
| Channel Letters | $3K - $100K+ | ~$12-30/inch per letter |
| Monument Signs | $5K - $50K+ | $150-400/sqft |
| Pylon Signs | $10K - $200K | Per project |
| Lightbox Signs | $1.5K - $10K+ | Per sqft + components |
| Neon Signs | $300 - $5K+ | Per character/linear ft |
| Dimensional Letters | $2K - $6K | Per inch per letter |
| Printed Signs (ACM, Coroplast) | $100 - $2K | Per sqft |

## 3. Architecture

Four independent services communicating via REST API:

```
┌─────────────────────────────────────────────────────────────┐
│                      CONSUMERS                               │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  D2C Store    │  │ Shopify App  │  │  External Sites   │  │
│  │  (Next.js)    │  │  (wrapper)   │  │  (embed widget)   │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬──────────┘  │
└─────────┼─────────────────┼───────────────────┼──────────────┘
          │                 │                   │
          ▼                 ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    3D CONFIGURATOR WIDGET                     │
│         (Standalone React + R3F npm package)                 │
│                                                              │
│  - Embeddable <script> tag or React component                │
│  - Text-to-3D geometry engine (opentype.js + ExtrudeGeometry)│
│  - Part-based model assembly (GLB with configurable regions) │
│  - Real-time material/lighting preview                       │
│  - Schema-driven: reads product config from API              │
│  - Zero business logic — pricing comes from API              │
│  - Photo overlay & AR (phased)                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                       CORE API                               │
│              (Next.js API routes / standalone)                │
│                                                              │
│  - Multi-tenant (tenant per sign shop)                       │
│  - Product definitions & option schemas (JSON)               │
│  - Pricing engine (3 layers: presets → visual → scripts)     │
│  - Order management, cart, checkout (Stripe)                 │
│  - Template library (product + design templates)             │
│  - File export (SVG, DXF, BOM, production PDF, screenshots)  │
│  - Auth (tenant admin + end customers)                       │
│  - Webhook system for integrations                           │
│  - Server-side price validation (never trust client)         │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                   ADMIN DASHBOARD                            │
│                    (Next.js app)                              │
│                                                              │
│  - Product type builder (options, rules, defaults)           │
│  - 3D Model Builder (upload GLB, mark regions, bind options) │
│  - Visual pricing formula editor                             │
│  - Template manager (product + design templates)             │
│  - Order management & analytics                              │
│  - Tenant settings (branding, domain, white-label)           │
│  - AI tools (logo-to-sign, text-to-3D generation)            │
└─────────────────────────────────────────────────────────────┘
```

### Service Boundaries

- **3D Widget** — rendering only. Receives product schema, renders controls and 3D scene. Calls API for pricing. Embeddable anywhere. Authenticates via tenant API key passed as widget config parameter (public key, rate-limited, domain-restricted).
- **Core API** — all business logic. Pricing, validation, multi-tenancy, orders. Single source of truth. Two auth modes: API key (widget/public endpoints) and JWT (admin/customer sessions).
- **Admin Dashboard** — pure UI consuming the Core API. No direct DB access. Authenticated via JWT sessions.
- **D2C Storefront** — GatSoft Signs site. Consumes Core API + embeds 3D Widget. Reference implementation.

### Data Flow (Customer Configures a Sign)

1. Customer opens storefront → Widget loads product schema from Core API
2. Widget renders 3D preview + option controls from schema
3. Customer changes option → Widget evaluates rules locally (visibility, constraints, validation)
4. Widget updates 3D scene via renderConfig bindings
5. Widget sends config to Core API `POST /api/pricing/calculate`
6. API runs pricing formula → returns PriceBreakdown
7. Widget displays updated price
8. Customer adds to cart → API stores cart item with full config snapshot
9. Checkout → Stripe payment → API creates order
10. Async job generates production files (SVG, BOM, PDF, screenshot)
11. Webhook fires → notifies shop's production system

## 4. Multi-Tenancy & Data Model

### Tenant Model

Every sign shop is a tenant. GatSoft's own D2C store is the "default" tenant, dogfooding the same system.

```
Tenant
├── id, slug, name
├── plan (free, pro, enterprise)
├── branding (logo, colors, fonts, custom domain)
├── settings (currency, locale, tax config)
│
├── Products[]
│   ├── id, name, slug, category
│   ├── productSchema (JSON) — defines all configurable options
│   │   ├── options[] (text, select, color, number, image-upload, etc.)
│   │   ├── optionRules[] (visibility, constraints, validation, 3D bindings)
│   │   └── defaults{}
│   ├── pricingConfig — links to pricing formula
│   ├── renderConfig — links to 3D model/assembly definition
│   └── designTemplates[] — customer-facing starter configurations
│
├── PricingFormulas[]
│   ├── id, name, type (preset | visual | script)
│   ├── variables[] (height, width, letterCount, sqft, etc.)
│   ├── formula (JSON AST for visual builder, or script string)
│   └── multipliers[] (conditional modifiers)
│
├── 3DModels[]
│   ├── id, name, type (assembly | single-model | text-to-3d)
│   ├── parts[] (GLB files with configurable regions)
│   │   ├── partId, meshName, role (face, side, back, mount)
│   │   └── configurableProps (material, color, visibility, texture)
│   └── assemblyRules (how parts connect, spacing, constraints)
│
├── ProductTemplates[]
│   ├── id, name, category
│   ├── baseProductSchema (cloneable blueprint)
│   ├── basePricingConfig
│   └── baseRenderConfig
│
├── Orders[]
│   ├── orderNumber, status, customer
│   ├── items[] (full config snapshot + price breakdown)
│   └── productionFiles[] (SVG, BOM, nested cut files)
│
└── Customers[]
    ├── id, email, name
    ├── savedDesigns[]
    └── orderHistory[]
```

### Key Design Decisions

1. **Product schema is JSON** — not hardcoded types. Admins define options, rules, and constraints through the admin UI. The 3D widget interprets this schema to render controls.
2. **Pricing formula is separate from product** — a formula can be shared across products. A shop might use the same "per-inch channel letter" formula for 5 different letter types with different base prices.
3. **3D render config is separate from product** — same assembly template can power multiple products with different option mappings.
4. **Tenant isolation** — queries always scoped by `tenantId`. Shared resources (base templates, fonts, stock 3D parts) live in a system-level "platform" tenant.
5. **Config snapshots on orders** — when a customer orders, the full config + pricing breakdown is frozen into the order. Later price changes don't affect historical orders.

### Database

PostgreSQL with Prisma. Multi-tenancy via `tenantId` column on every table (row-level isolation). Prisma middleware auto-scopes all queries.

## 5. Pricing Engine

Three layers, each building on the previous.

### Layer 1: Preset Formula Templates

~12 ready-made formulas covering most signage pricing:

| Template | Formula | Use Case |
|---|---|---|
| Per-Inch Letter | `letterCount x max(height, minHeight) x pricePerInch` | Channel letters |
| Per-SqFt | `(width x height / 144) x pricePerSqft` | Cabinets, lightboxes, print signs |
| Per-SqInch | `width x height x pricePerSqInch` | Logos, small signs |
| Per-Unit + Size Tier | `unitPrice x qty` with size tier breaks | Dimensional letters |
| Base + Linear Foot | `basePrice + (width/12) x pricePerFt` | Raceways, mounting rails |
| Base + SqFt Sign | `basePrice + sqft x pricePerSqft` | Pylons, monuments |
| Flat Rate | `fixedPrice` | Accessories |
| Per-Character | `charCount x pricePerChar` | Neon, LED text |
| Tiered Volume | price breaks at quantity thresholds | Bulk orders |
| Weight-Based | `weight x pricePerLb + shippingBase` | Shipping |
| Time-Based Rush | `subtotal x rushMultiplier` | Rush surcharges |
| Composite | chain sub-formulas and sum (e.g., letter formula + raceway formula + vinyl formula — each evaluated independently, results summed into final total) | Multi-component signs |

Admins pick a template and fill in their numbers. Covers ~80% of sign shops.

### Layer 2: Visual Formula Builder

Drag-and-drop node editor for shops that need custom formulas:

- **Variables**: all product option values + computed values (sqft, linearFt, charCount, perimeter)
- **Operators**: +, -, x, /, min, max, round, ceil, floor
- **Logic**: if/then/else conditions
- **Multiplier chains**: conditional multipliers
- **Output**: compiles to JSON AST (same format presets use — presets are just pre-built ASTs)

### Layer 3: Script Escape Hatch

For edge cases the visual builder can't handle. Simple expression syntax executed in a sandboxed runtime (isolated VM / Web Worker). No DOM, network, or filesystem access. Input: option values + dimensions. Output: PriceBreakdown object.

```javascript
function calculate(opts, dims) {
  let base = opts.letterCount * Math.max(opts.height, 12) * params.pricePerInch;
  if (opts.height > 36) base = opts.letterCount * opts.height * params.largePricePerInch;
  let multiplier = 1;
  if (opts.lit === 'Non-Lit') multiplier *= 0.75;
  if (opts.led === 'RGB') multiplier *= 1.1;
  return Math.max(base * multiplier, params.minOrderPrice);
}
```

### Pricing Execution Flow

```
Customer changes option
  → Widget sends config to API: POST /api/pricing/calculate
  → API resolves tenant → product → pricingConfig
  → Routes by type: preset → run template | visual → evaluate AST | script → sandboxed exec
  → Returns PriceBreakdown { lineItems[], subtotal, tax, shipping, total, appliedMultipliers[] }
```

Server-side validation at checkout: re-runs formula with 1% tolerance. Client prices are NEVER trusted.

## 6. 3D Engine & Model Builder

### Two Rendering Pipelines (+ AI Future)

**Pipeline A: Text-to-3D Geometry** (letter-based products)

```
Text + Font (TTF) → opentype.js → glyph outlines → ShapePath → ExtrudeGeometry
  → Per-character mesh with distinct regions:
    Face (translucent/opaque/open), Side/Returns (aluminum/painted),
    Back (for back-lit glow), Trim Cap (optional edge)
  → Assembly: letters + raceway + mounting + wall/background
```

**Pipeline B: Part-Based Model Assembly** (non-letter products)

```
Admin uploads GLB parts → marks configurable regions in Model Builder
  → RenderConfig (JSON) maps option values → mesh properties
  → Widget loads GLB + applies bindings based on customer config
```

**Pipeline C: AI-Assisted Generation** (future)

```
Customer uploads logo/image → AI service generates 3D mesh
  → Feeds into Pipeline B (treated as uploaded model with regions)
```

### Admin 3D Model Builder

Visual interface where admins:
1. Select a product template or start from scratch
2. Upload GLB parts or pick from platform's stock library
3. Position parts in 3D viewport (snap-to, grid, alignment tools)
4. Click each mesh → assign role, bind to product options
5. Define assembly rules (e.g., "raceway below letters, width = sign width")
6. Preview with sample configurations
7. Save → product is live for customers

### Stock Parts Library

Platform ships with reusable 3D parts for all tenants:

| Category | Parts |
|---|---|
| Mounting | Raceway (linear), Raceway box, Wall standoffs, Stud mounts |
| Posts | Single pole, Double pole, Monument base, Pylon frame |
| Cabinets | Single-face box, Double-face box, Shaped cabinet shell |
| Lighting | LED module strip, Neon tube path, Bulb array |
| Accessories | Hanging chains, Brackets, Transformers |
| Backgrounds | Flat panel, Shaped backer, Brick wall (preview) |

### Materials System

| Material Preset | Three.js Implementation |
|---|---|
| Brushed Aluminum | MeshPhysicalMaterial (metalness 0.85, roughness 0.3, normal map) |
| Painted Metal | MeshStandardMaterial (metalness 0.5, configurable color) |
| Translucent Acrylic | MeshPhysicalMaterial (transmission 0.8, thickness, emissive for lit) |
| Opaque Acrylic | MeshStandardMaterial (roughness 0.1, color) |
| Neon Tube | MeshBasicMaterial (emissive, bloom post-processing) |
| Vinyl Print | MeshStandardMaterial (texture map from uploaded image) |
| Wood | MeshStandardMaterial (wood texture + normal map) |
| Concrete/Stone | MeshStandardMaterial (stone texture, high roughness) |

Admins can create custom material presets per tenant.

### Performance Strategy

- Geometry caching by `(font, glyph, depth, segments)` key
- LOD: lower poly at distance, full detail on zoom
- Instanced rendering for repeated letters
- 300ms debounce on text input before geometry regeneration
- Progressive loading: low-res preview first, full quality async
- Web Worker for heavy geometry generation off main thread

## 7. Product Schema & Option System

### Option Types

| Type | UI Control | Example |
|---|---|---|
| `text` | Text input | Sign text, business name |
| `number` | Number input + slider | Height, width, depth |
| `select` | Dropdown / radio buttons | Font, material, LED color |
| `color` | Color picker | Face color, paint color |
| `multi-select` | Checkboxes | Add-ons, accessories |
| `image-upload` | File uploader + crop | Logo, custom artwork |
| `toggle` | Switch | Lit/Non-lit, with/without raceway |
| `range` | Dual slider | Min-max size range |
| `font-picker` | Font preview grid | Google Fonts + custom TTF |
| `preset-gallery` | Visual thumbnail grid | Design template starters |

### Option Rules (Conditional Logic)

Rule types admins configure through UI (no code):

- **Visibility** — show/hide options based on other selections
- **Constraint** — lock/restrict values based on product or other options
- **Validation** — min/max, required, regex, custom error messages
- **Pricing trigger** — activate pricing variables or multipliers
- **3D binding** — control mesh visibility, material, or properties

Example rules (stored as JSON):

```json
[
  {
    "type": "visibility",
    "when": { "option": "lit", "equals": "Non-Lit" },
    "then": { "hide": ["led_color", "lit_sides", "vinyl"] }
  },
  {
    "type": "constraint",
    "when": { "option": "product", "equals": "marquee-letters" },
    "then": { "lock": { "side_depth": "4\"" } }
  },
  {
    "type": "3d_binding",
    "when": { "option": "raceway", "notEquals": "-" },
    "then": { "show_mesh": "raceway_assembly", "set_width": "computed.signWidth" }
  }
]
```

### Schema-Driven Widget

The widget is fully schema-driven — it does not know about "channel letters" or "lightboxes." It reads the product schema and dynamically renders the appropriate option controls and 3D bindings. This is what makes the platform extensible without code changes.

## 8. File Export & Production Pipeline

### Export Formats

| Format | Use Case | Generated From |
|---|---|---|
| SVG (cut paths) | CNC routers, laser cutters | opentype.js glyph outlines |
| Nested SVG | Optimized material layout for cutting | Nesting algorithm |
| DXF | CAD software, industrial CNC | SVG → DXF conversion |
| PDF (production sheet) | Fabrication floor reference | Auto-generated spec sheet |
| BOM | Procurement, costing | Computed from product config |
| 3D Screenshot (PNG) | Cart, email, order confirmation | Three.js canvas capture |
| Print-Ready PDF/PNG | Printed signs, banners | Customer upload + template |

### BOM Auto-Generation

Computed from product config: material quantities (sqft of aluminum, linear ft of trim cap, LED module count, power supply specs, mounting hardware count).

### Webhook Events

| Event | Payload | Use Case |
|---|---|---|
| `order.created` | Full order + config + file URLs | Trigger production workflow |
| `order.paid` | Payment confirmation | Release to manufacturing |
| `order.files_ready` | Download URLs for all files | Auto-download to CNC software |
| `design.saved` | Saved design config | Follow-up marketing |
| `quote.requested` | Config for manual quote | Complex orders |

## 9. Template System

### Two Levels

**Product Templates (Admin-Level):** Blueprints defining a product type's structure — which 3D parts, which options, which pricing formula. Sign shops clone and modify these to create their product catalog. Platform ships with templates for all major sign types.

**Design Templates (Customer-Level):** Pre-made sign configurations (e.g., "Coffee Shop Front-Lit" with specific text, font, size, colors pre-filled) that customers start from and customize. Shops can create their own design templates for their audience.

### Shipped Product Templates

| Category | Templates |
|---|---|
| Channel Letters | Front-Lit Trim Cap, Trimless, Marquee, Back-Lit, Halo-Lit, Non-Lit |
| Dimensional Letters | Acrylic, Painted Metal, Brushed Metal, Flat-Cut Aluminum |
| Cabinet Signs | Single/Double Face Squared, Single/Double Face Shaped |
| Lit Shapes | Cloud Sign, Lit Logo Shape |
| Logos | Lit Logo, Non-Lit Logo |
| Print Signs | ACM Panel, Coroplast, Foam Board |
| Post/Monument | Single Post, Double Post, Monument Base |
| Neon | LED Neon Text, LED Neon Shape |
| Lightbox | Slim Lightbox, Standard Lightbox, Double-Sided |
| Pylon | Single-Face Pylon, Multi-Tenant Pylon |

## 10. Visualization Roadmap

| Phase | Feature | Technology |
|---|---|---|
| Phase 1 | 3D configurator | React Three Fiber + Three.js WebGL |
| Phase 4 | Photo overlay ("sign on your building") | Canvas compositing — customer uploads photo, sign rendered on top |
| Phase 5 | Full AR | WebXR / ARKit — point phone camera, see sign in real-time |

## 11. Phased Delivery

### Phase 1: Core Platform Foundation

- Core API with multi-tenancy, auth, product schemas
- Migrate existing 7 product categories into schema-driven format
- 3D Widget extracted as standalone package (text-to-3D pipeline)
- Pricing engine Layer 1 (preset formula templates)
- D2C storefront consuming API + widget (GatSoft site)
- Basic order flow + cart + Stripe checkout

**Outcome:** Existing site works, now powered by platform API.

### Phase 2: Admin Dashboard & Product Builder

- Admin dashboard (Next.js app)
- Product type builder UI (options, rules, defaults)
- Visual pricing formula editor (Layer 2)
- 3D Model Builder (upload GLB, mark regions, bind to options)
- Stock parts library
- Materials system with presets
- Tenant onboarding + white-label branding

**Outcome:** Sign shops can define products, configure pricing, and have a working configurator.

### Phase 3: Production Pipeline & Templates

- SVG/DXF cut file generation
- Nested SVG material optimization
- BOM auto-generation
- Production PDF spec sheets
- Product templates + design templates
- Order management dashboard
- Webhook system

**Outcome:** End-to-end flow: customer design → production-ready files.

### Phase 4: Advanced Pricing & AI

- Pricing engine Layer 3 (scripting + sandboxed VM)
- AI logo-to-sign generation
- AI-assisted 3D model generation
- Photo overlay visualization
- Font management (custom TTF, Google Fonts)
- Analytics dashboard

**Outcome:** AI capabilities no competitor offers + full pricing flexibility.

### Phase 5: Integrations & AR

- Embeddable `<script>` widget for any website
- Shopify app
- WooCommerce plugin
- REST API docs + developer portal
- WebXR AR
- Multi-language / multi-currency
- Manufacturer marketplace directory

**Outcome:** Full platform with integrations, AR, and marketplace.

## 12. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js (App Router) for API, Admin, Storefront |
| 3D Engine | React Three Fiber + @react-three/drei (standalone widget package) |
| Database | PostgreSQL + Prisma (multi-tenant row-level isolation) |
| Auth | NextAuth.js (tenant admin) + API keys (widget auth) |
| Payments | Stripe (per-tenant connected accounts for SaaS) |
| State | Zustand (widget + storefront) |
| Styling | Tailwind CSS + shadcn/ui |
| File Storage | Vercel Blob / S3 (3D models, production files, screenshots) |
| Job Queue | Vercel Functions / background jobs for file generation |
| Font Parsing | opentype.js (server-side text measurement + SVG generation) |
| Sandboxed Pricing | Isolated VM (vm2 / quickjs-emscripten) for script formulas |
| AI | External API integration (logo-to-3D, text-to-3D) |
| Testing | Jest (pricing engine), Playwright (E2E) |
