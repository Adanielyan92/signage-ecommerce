# GatSoft Signs - 3D Signage Ecommerce Platform

## Project Overview

Ecommerce platform for custom channel letters and 3D signage with a real-time Three.js configurator, instant pricing, and Stripe checkout. Customers design their sign in 3D, see live pricing, and order directly.

Ported pricing logic from the sibling project `../signage-price-calculator/` (React CRA + MobX + Fabric.js). This project is a full rewrite using modern stack.

## Commands

```bash
nvm use 24             # Required — project needs Node 24+ (.nvmrc)
npm run dev            # Start dev server (Next.js 16, Turbopack)
npm run build          # Production build
npm run lint           # ESLint
npx jest               # Run pricing engine unit tests
npx prisma migrate dev # Run DB migrations (requires DATABASE_URL in .env)
npx prisma generate    # Regenerate Prisma client after schema changes
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| 3D Engine | React Three Fiber + @react-three/drei |
| Payments | Stripe (not yet wired) |
| Database | Prisma + PostgreSQL (schema exists, DB not yet connected) |
| State | Zustand (configurator-store, cart-store) |
| Styling | Tailwind CSS v4 + shadcn/ui components |
| Auth | NextAuth.js (not yet configured) |
| Font Parsing | opentype.js (server-side text measurement) |
| Testing | Jest + ts-jest |

## Architecture

### Directory Structure

```
src/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                  # Landing page (SSR)
│   ├── products/page.tsx         # Product catalog (SSR)
│   ├── configure/[productType]/  # 3D configurator (client-heavy)
│   ├── cart/page.tsx             # Shopping cart (client)
│   └── api/                     # API routes (TODO)
├── components/
│   ├── configurator/             # Options panel, price display, layout
│   ├── three/                    # React Three Fiber components (scene, letters, wall)
│   ├── products/                 # Product cards and grid
│   ├── layout/                   # Navbar, Footer
│   └── ui/                       # shadcn/ui primitives (DO NOT edit manually)
├── engine/                       # Isomorphic pricing engine (no DOM deps)
│   ├── pricing.ts                # Main entry: calculatePrice(), validatePrice()
│   ├── channel-letter-pricing.ts # Core formula with full breakdown
│   ├── multipliers.ts            # All multiplier definitions
│   ├── product-definitions.ts    # 6 product types with pricing params
│   ├── letter-measurement.ts     # opentype.js text width (server-side)
│   └── __tests__/                # 20 unit tests
├── stores/                       # Zustand stores
│   ├── configurator-store.ts     # Sign config state + auto-recalculate
│   └── cart-store.ts             # Cart with localStorage persistence
├── types/                        # Shared TypeScript types
│   ├── product.ts                # Product, PricingParams, option types
│   ├── configurator.ts           # SignConfiguration, Dimensions, PriceBreakdown
│   ├── order.ts                  # Order, OrderItem types
│   └── opentype.d.ts             # Type declarations for opentype.js
└── lib/
    └── utils.ts                  # cn(), formatPrice(), slugify()
```

### Key Patterns

- **Path aliases**: Use `@/` for all imports (maps to `src/`).
- **"use client"**: Required on any component using hooks, state, or browser APIs. The 3D scene is loaded via `next/dynamic` with `ssr: false`.
- **shadcn/ui**: Components in `src/components/ui/` are generated. Don't edit them directly — use `npx shadcn@latest add <component>` to add new ones.
- **Prisma output**: Client is generated to `src/generated/prisma/` (not the default location).

## Pricing Engine (Critical Business Logic)

The pricing engine is the most important module. It is **isomorphic** — runs on both client and server with zero DOM dependencies. This is intentional for server-side price validation at checkout.

### Pricing Formula

```
1. letterCount = text.replace(/\s+/g, '').length
2. pricePerInch = height > largeSizeThreshold ? largeSizePricePerInch : basePricePerInch
3. heightUsedForPrice = max(height, minHeightForPrice)
4. letterPrice = letterCount * heightUsedForPrice * pricePerInch
5. Apply multipliers (all multiply together):
   - Non-Lit: 0.75x
   - RGB LED: 1.1x
   - Curved font: 1.2x
   - 5" depth: 1.05x
   - Duo Lit: 1.2x
   - Background: 1.1x
   - Painted: 1.2x
6. Add multicolor painting: letterCount * 300 * (colorCount - 1)
7. Add raceway: width * $50/12 (linear) or sqft * $50 (box)
8. Add vinyl: sqft * $5 (regular) or sqft * $10 (perforated)
9. total = max(subtotal, minOrderPrice)
```

### Product Pricing Params

| Product | Base $/in | Large $/in | Threshold | Min Height | Min Order |
|---------|-----------|-----------|-----------|------------|-----------|
| Front-Lit with Trim Cap | 16 | 18 | 36" | 12" | $1,360 |
| Trimless | 22 | 24 | 36" | 12" | $1,360 |
| Marquee Letters | 25 | 28 | 36" | 12" | $1,360 |
| Back-Lit | 18 | 20 | 36" | 12" | $1,360 |
| Halo-Lit | 30 | 34 | 36" | 12" | $1,360 |
| Non-Lit | 13 | 15 | 36" | 12" | $1,360 |

### Rules When Modifying Pricing

- NEVER change the pricing formula without updating the tests in `__tests__/channel-letter-pricing.test.ts`.
- The engine must remain DOM-free. No `document`, no `window`, no `canvas.measureText()`. Use opentype.js for server-side text measurement.
- Client prices are NEVER trusted at checkout. `validatePrice()` in `pricing.ts` recalculates server-side with 1% tolerance.
- All monetary values are in USD dollars (not cents). The `formatPrice()` utility handles display formatting.

## 3D Rendering

### Current State (Phase 1)

Uses `@react-three/drei`'s `Text3D` with the bundled Helvetiker font (`public/fonts/helvetiker_regular.typeface.json`). This is a temporary solution.

### Materials by Letter Type

| Type | Face | Returns | Lighting |
|------|------|---------|----------|
| front-lit-trim-cap | MeshPhysicalMaterial (translucent, emissive) | Aluminum (metalness 0.85) | Emissive face glow |
| back-lit, halo-lit | Opaque aluminum | Aluminum | RectAreaLight behind letters |
| marquee-letters | Transparent (open face) | Painted/aluminum | Bulb spheres (TODO) |
| non-lit | Opaque aluminum/painted | Aluminum | Scene lighting only |

### LED Color Map

- 3000K → `#FFB46B` (warm white)
- 3500K → `#FFC98E` (neutral)
- 6000K → `#E3EEFF` (cool white)
- RGB → Animated hue cycling via `useFrame`

### Planned Phase 2 Upgrade

Replace `Text3D` with opentype.js → `THREE.ShapePath` → `ExtrudeGeometry` for:
- Per-character geometry (different materials on face vs. returns)
- Custom font support (drop TTF in `public/fonts/`)
- Geometry caching by `(font, glyphIndex, depth, curveSegments)`
- Bloom post-processing (`@react-three/postprocessing`) for LED glow
- Performance: debounce text input 300ms, `curveSegments` quality toggle

## Zustand Stores

### configurator-store

- Holds all sign configuration state (text, height, font, lit, led, etc.)
- Auto-recalculates `priceBreakdown` on any setter call
- Reads product definitions from `engine/product-definitions.ts`
- `setDimensions()` is called by the 3D renderer to feed accurate measurements back

### cart-store

- Persisted to localStorage via Zustand `persist` middleware
- Each item stores the full `SignConfiguration` + `Dimensions` + `unitPrice`
- Quantities are per-item (each cart item is a unique sign config)

## Database

Prisma schema is defined but DB is not yet connected. Key models:

- **Product**: slug, name, category, pricingParams, options
- **Order**: orderNumber (format: `GS-20260001`), status enum, Stripe payment ID
- **CartItem**: userId, configuration (JSON), unitPrice
- **SavedDesign**: userId, configuration (JSON), thumbnail

To connect: set `DATABASE_URL` in `.env`, then `npx prisma migrate dev`.

## Implementation Status

### Done (Phase 1)
- Next.js project with Tailwind + shadcn/ui
- Full pricing engine ported with 20 passing tests
- 3D configurator with Text3D + materials for all 6 types
- Options panel with conditional visibility (dependsOn)
- Real-time price breakdown display
- Cart with localStorage persistence
- Product catalog page
- Landing page
- Prisma schema (not connected)

### TODO (Phase 2-5)
- [ ] Per-character 3D with opentype.js + ExtrudeGeometry
- [ ] Bloom post-processing for LED glow
- [ ] Custom font files (10-15 Google Fonts TTFs)
- [ ] Stripe checkout integration
- [ ] API routes: /api/pricing/calculate, /api/stripe/*
- [ ] NextAuth.js setup
- [ ] User accounts, order history, saved designs
- [ ] Screenshot capture for cart thumbnails
- [ ] Email notifications (React Email + Resend)
- [ ] SEO metadata and OG images
- [ ] Playwright E2E tests

## Related Codebase

The original pricing calculator lives at `../signage-price-calculator/`. Key files that were ported:

| Original File | Ported To |
|---------------|-----------|
| `src/pages/calc/utils/useCalculate.ts` | `src/engine/channel-letter-pricing.ts` |
| `src/pages/canvas-calc/utils/priceCalculator.ts` | `src/engine/pricing.ts` |
| `src/pages/canvas-calc/data/products.ts` | `src/engine/product-definitions.ts` |
| `src/pages/calc/constants/index.ts` | `src/types/product.ts` (enums → union types) |

The original uses `document.createElement('canvas')` + `measureText()` for text width. This project uses opentype.js for server compatibility.
