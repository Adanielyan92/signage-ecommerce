# Plan B: UX Overhaul for Sign Fabricators

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans

**Goal:** Redesign all user-facing flows for non-technical sign fabricators -- intuitive product selection, step-by-step configurator wizard, prominent pricing, mobile-friendly layout, and polished visual design.

**Architecture:** The frontend is Next.js 16 App Router with a mix of Server Components (product pages, landing page) and Client Components (configurator, cart). State lives in Zustand stores (`configurator-store.ts` for sign config, `cart-store.ts` for cart). The configurator layout in `src/components/configurator/configurator-layout.tsx` renders a split view: 60% 3D viewport (React Three Fiber loaded via `next/dynamic` with `ssr: false`) + 40% scrollable options panel. Each product category has its own options component in `src/components/configurator/options/`. The sticky bottom bar shows total price and action buttons. Styling uses Tailwind CSS v4 with shadcn/ui primitives in `src/components/ui/`.

**Tech Stack:** Next.js 16, Tailwind CSS v4, shadcn/ui, Framer Motion (for transitions), React Three Fiber, Zustand, Lucide React

**Design System:**
- Colors: Primary `#0F172A` (navy), Accent `#0369A1` (blue), Background `#F8FAFC`, Muted `#E8ECF1`
- Typography: Rubik (headings) + Nunito Sans (body)
- Style: Trust & Authority -- professional, clean, industrial
- Icons: Lucide React (already installed)

---

## Task 1: Design System Foundation -- Fonts, Colors, Tailwind Config

**Current state:** The app uses Tailwind defaults. No custom font loading. Colors are ad-hoc `blue-600`, `neutral-*` palette.

**Goal:** Establish the design system globally: load Rubik + Nunito Sans via `next/font`, define custom color tokens in Tailwind, and create a shared design token file.

### Files to create/modify

**Modify** `src/app/layout.tsx` -- add font imports:
```typescript
import { Rubik, Nunito_Sans } from "next/font/google";

const rubik = Rubik({
  subsets: ["latin"],
  variable: "--font-rubik",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const nunitoSans = Nunito_Sans({
  subsets: ["latin"],
  variable: "--font-nunito-sans",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

// In the <html> or <body> tag:
<body className={`${rubik.variable} ${nunitoSans.variable} font-sans`}>
```

**Modify** Tailwind CSS configuration (the Tailwind v4 CSS-based config, likely `src/app/globals.css` or a Tailwind config file):

Add the custom theme tokens:
```css
@theme {
  --color-brand-navy: #0F172A;
  --color-brand-accent: #0369A1;
  --color-brand-accent-light: #0EA5E9;
  --color-brand-bg: #F8FAFC;
  --color-brand-muted: #E8ECF1;
  --color-brand-surface: #FFFFFF;
  --color-brand-text: #0F172A;
  --color-brand-text-secondary: #475569;
  --color-brand-success: #059669;
  --color-brand-warning: #D97706;
  --color-brand-error: #DC2626;

  --font-heading: var(--font-rubik), system-ui, sans-serif;
  --font-body: var(--font-nunito-sans), system-ui, sans-serif;
}
```

**Create** `src/lib/design-tokens.ts` (for programmatic access to the same values):
```typescript
export const COLORS = {
  navy: "#0F172A",
  accent: "#0369A1",
  accentLight: "#0EA5E9",
  bg: "#F8FAFC",
  muted: "#E8ECF1",
  surface: "#FFFFFF",
  text: "#0F172A",
  textSecondary: "#475569",
  success: "#059669",
  warning: "#D97706",
  error: "#DC2626",
} as const;
```

### Commit message
```
feat: establish design system with Rubik/Nunito Sans fonts and brand colors

Load Google Fonts via next/font for Rubik (headings) and Nunito Sans
(body). Define brand color tokens in Tailwind theme and a TypeScript
constants file for programmatic use.
```

---

## Task 2: Product Discovery Redesign

**Current state:** `src/app/products/page.tsx` shows 11 product categories in a flat 3-column grid. No search, no filtering, no use-case grouping. Each card has an image, description, price, and a list of sub-types. Sign fabricators need to find products by use case ("I need a storefront sign" not "browse Cabinet Signs").

**Goal:** Redesign the products page with:
1. A search bar with instant filtering
2. Use-case tabs (Storefront, Indoor, Outdoor, Events, All)
3. Improved card design with brand colors and proper image sizing
4. Quick-start CTAs for the most popular products

### Files to modify

**Modify** `src/app/products/page.tsx` -- full rewrite:
```typescript
import type { Metadata } from "next";
import { ProductCatalog } from "@/components/products/product-catalog";

export const metadata: Metadata = {
  title: "Products | GatSoft Signs",
  description:
    "Browse custom signage by use case. Channel letters, cabinet signs, dimensional letters, neon signs, and more. Design in 3D with instant pricing.",
};

export default function ProductsPage() {
  return <ProductCatalog />;
}
```

**Create** `src/components/products/product-catalog.tsx`:
```typescript
"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, ArrowRight, Sparkles, Building2, Home, TreePine, PartyPopper } from "lucide-react";

type UseCase = "all" | "storefront" | "indoor" | "outdoor" | "events";

interface ProductItem {
  name: string;
  slug: string;
  description: string;
  startingPrice: number;
  image: string;
  useCases: UseCase[];
  popular?: boolean;
}

const ALL_PRODUCTS: ProductItem[] = [
  {
    name: "Front-Lit Channel Letters",
    slug: "front-lit-trim-cap",
    description: "The #1 storefront sign. Glowing 3D letters visible day and night.",
    startingPrice: 1360,
    image: "/images/products/front-lit-trim-cap.png",
    useCases: ["storefront", "outdoor"],
    popular: true,
  },
  {
    name: "Back-Lit Channel Letters",
    slug: "back-lit",
    description: "Elegant halo glow behind each letter. Premium, modern look.",
    startingPrice: 1360,
    image: "/images/products/back-lit.png",
    useCases: ["storefront", "indoor"],
  },
  {
    name: "Halo-Lit Letters",
    slug: "halo-lit",
    description: "Soft backlit glow for a refined, high-end appearance.",
    startingPrice: 1360,
    image: "/images/products/halo-lit.png",
    useCases: ["storefront", "indoor"],
  },
  {
    name: "Trimless Channel Letters",
    slug: "trimless",
    description: "Clean, modern look without the trim cap border.",
    startingPrice: 1360,
    image: "/images/products/trimless.png",
    useCases: ["storefront"],
  },
  {
    name: "Marquee Letters",
    slug: "marquee-letters",
    description: "Vintage-style letters with exposed bulbs. Great for restaurants and theaters.",
    startingPrice: 1360,
    image: "/images/products/marquee-letters.png",
    useCases: ["storefront", "indoor", "events"],
  },
  {
    name: "Non-Lit Channel Letters",
    slug: "non-lit",
    description: "Classic 3D letters without illumination. Affordable and elegant.",
    startingPrice: 1360,
    image: "/images/products/non-lit.png",
    useCases: ["storefront", "indoor"],
  },
  {
    name: "LED Neon Sign",
    slug: "led-neon",
    description: "Glowing neon-style text. Perfect for bars, restaurants, and retail.",
    startingPrice: 500,
    image: "/images/products/led-neon.png",
    useCases: ["indoor", "events"],
    popular: true,
  },
  {
    name: "Cabinet Sign (Single Face)",
    slug: "single-face-squared",
    description: "Illuminated sign box. Clean, bright, and professional.",
    startingPrice: 1500,
    image: "/images/products/single-face-squared.png",
    useCases: ["storefront", "outdoor"],
    popular: true,
  },
  {
    name: "Cabinet Sign (Double Face)",
    slug: "double-face-squared",
    description: "Double-sided illuminated cabinet. Visible from both directions.",
    startingPrice: 1500,
    image: "/images/products/double-face-squared.png",
    useCases: ["outdoor"],
  },
  {
    name: "Light Box (Single Face)",
    slug: "light-box-single",
    description: "Illuminated box with translucent face. Bright and eye-catching.",
    startingPrice: 1200,
    image: "/images/products/light-box-single.png",
    useCases: ["storefront", "indoor"],
  },
  {
    name: "Light Box (Double Face)",
    slug: "light-box-double",
    description: "Double-sided light box for maximum exposure.",
    startingPrice: 1200,
    image: "/images/products/light-box-double.png",
    useCases: ["outdoor"],
  },
  {
    name: "Dimensional Letters (Acrylic)",
    slug: "acrylic",
    description: "Sleek acrylic letters for lobbies and interior branding.",
    startingPrice: 800,
    image: "/images/products/acrylic.png",
    useCases: ["indoor"],
  },
  {
    name: "Dimensional Letters (Brushed Metal)",
    slug: "brushed-metal",
    description: "Premium brushed aluminum letters. Refined metallic finish.",
    startingPrice: 800,
    image: "/images/products/brushed-metal.png",
    useCases: ["indoor", "storefront"],
  },
  {
    name: "Flat-Cut Aluminum Letters",
    slug: "flat-cut-aluminum",
    description: "Precision-cut aluminum. Clean, modern, affordable.",
    startingPrice: 800,
    image: "/images/products/flat-cut-aluminum.png",
    useCases: ["indoor", "storefront"],
  },
  {
    name: "Lit Logo Sign",
    slug: "lit-logo",
    description: "Your logo fabricated in 3D with LED illumination.",
    startingPrice: 800,
    image: "/images/products/lit-logo.png",
    useCases: ["storefront", "indoor"],
  },
  {
    name: "Blade Sign",
    slug: "blade-rectangular",
    description: "Wall-projecting sign on a bracket. Visible from both directions.",
    startingPrice: 800,
    image: "/images/products/blade-rectangular.png",
    useCases: ["storefront", "outdoor"],
  },
  {
    name: "Monument Sign",
    slug: "monument-base",
    description: "Freestanding sign on a stone/concrete base. Maximum street visibility.",
    startingPrice: 600,
    image: "/images/products/monument-base.png",
    useCases: ["outdoor"],
  },
  {
    name: "Post Sign (Single)",
    slug: "single-post",
    description: "Sign panel on a single post. Simple and effective.",
    startingPrice: 600,
    image: "/images/products/single-post.png",
    useCases: ["outdoor"],
  },
  {
    name: "ACM Panel Sign",
    slug: "acm-panel",
    description: "Durable aluminum composite with full-color print.",
    startingPrice: 100,
    image: "/images/products/acm-panel.png",
    useCases: ["outdoor", "events"],
  },
  {
    name: "Vinyl Banner",
    slug: "vinyl-banner-13oz",
    description: "Full-color printed banner. Affordable and fast.",
    startingPrice: 50,
    image: "/images/products/vinyl-banner-13oz.png",
    useCases: ["events", "outdoor"],
    popular: true,
  },
];

const USE_CASE_TABS: { key: UseCase; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "all", label: "All Products", icon: Sparkles },
  { key: "storefront", label: "Storefront", icon: Building2 },
  { key: "indoor", label: "Indoor / Lobby", icon: Home },
  { key: "outdoor", label: "Outdoor", icon: TreePine },
  { key: "events", label: "Events & Promo", icon: PartyPopper },
];

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

export function ProductCatalog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<UseCase>("all");

  const filtered = useMemo(() => {
    let results = ALL_PRODUCTS;

    if (activeTab !== "all") {
      results = results.filter((p) => p.useCases.includes(activeTab));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      results = results.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q),
      );
    }

    return results;
  }, [searchQuery, activeTab]);

  const popular = ALL_PRODUCTS.filter((p) => p.popular);

  return (
    <div className="min-h-screen bg-brand-bg">
      {/* Hero header */}
      <div className="border-b border-brand-muted bg-white px-4 pb-8 pt-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-brand-navy sm:text-4xl">
            What are you building?
          </h1>
          <p className="mt-2 text-lg text-brand-text-secondary">
            Find the right sign for your project. Every product includes 3D design and instant pricing.
          </p>

          {/* Search bar */}
          <div className="relative mt-6 max-w-xl">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-text-secondary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search products (e.g., "neon", "channel letters", "banner")'
              className="w-full rounded-xl border border-brand-muted bg-white py-3 pl-12 pr-4 text-sm text-brand-text placeholder-brand-text-secondary/60 shadow-sm transition focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/20"
            />
          </div>

          {/* Use-case tabs */}
          <div className="mt-6 flex flex-wrap gap-2">
            {USE_CASE_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-brand-navy text-white shadow-sm"
                      : "bg-white text-brand-text-secondary border border-brand-muted hover:border-brand-accent hover:text-brand-accent"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Popular quick-start (only on "all" tab, no search) */}
        {activeTab === "all" && !searchQuery && (
          <section className="mb-12">
            <h2 className="font-heading text-lg font-semibold text-brand-navy">
              Most Popular
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {popular.map((product) => (
                <Link
                  key={product.slug}
                  href={`/configure/${product.slug}`}
                  className="group flex items-center gap-4 rounded-xl border border-brand-muted bg-white p-4 shadow-sm transition hover:border-brand-accent hover:shadow-md"
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-16 w-16 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-brand-navy">
                      {product.name}
                    </h3>
                    <p className="text-xs text-brand-text-secondary">
                      From {formatPrice(product.startingPrice)}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 shrink-0 text-brand-accent opacity-0 transition group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Results count */}
        <div className="mb-4 text-sm text-brand-text-secondary">
          {filtered.length} {filtered.length === 1 ? "product" : "products"}
          {activeTab !== "all" && ` for ${USE_CASE_TABS.find((t) => t.key === activeTab)?.label}`}
          {searchQuery && ` matching "${searchQuery}"`}
        </div>

        {/* Product grid */}
        {filtered.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filtered.map((product) => (
              <Link
                key={product.slug}
                href={`/configure/${product.slug}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-brand-muted bg-white shadow-sm transition hover:border-brand-accent hover:shadow-lg"
              >
                <div className="relative h-44 overflow-hidden bg-brand-bg">
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                  {product.popular && (
                    <span className="absolute left-3 top-3 rounded-full bg-brand-accent px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                      Popular
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-heading text-base font-semibold text-brand-navy">
                    {product.name}
                  </h3>
                  <p className="mt-1 flex-1 text-sm leading-relaxed text-brand-text-secondary">
                    {product.description}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="text-sm font-bold text-brand-accent">
                      From {formatPrice(product.startingPrice)}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-medium text-brand-text-secondary transition group-hover:text-brand-accent">
                      Design in 3D
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-20 text-center">
            <p className="text-lg font-medium text-brand-navy">No products found</p>
            <p className="mt-2 text-sm text-brand-text-secondary">
              Try a different search term or browse all products.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveTab("all");
              }}
              className="mt-4 rounded-lg bg-brand-accent px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-accent/90"
            >
              View All Products
            </button>
          </div>
        )}

        {/* CTA */}
        <div className="mt-16 rounded-xl border border-brand-accent/20 bg-brand-accent/5 p-8 text-center">
          <h2 className="font-heading text-xl font-semibold text-brand-navy">
            Need a custom quote?
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-brand-text-secondary">
            For pylon signs, monument signs, or specialty projects, contact us for a personalized quote.
          </p>
          <button className="mt-4 rounded-lg bg-brand-navy px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-navy/90">
            Request Custom Quote
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Commit message
```
feat: redesign products page with search, use-case filtering, and new cards

Replace flat product grid with searchable, filterable catalog. Add use-case
tabs (Storefront, Indoor, Outdoor, Events) for quick discovery. Show popular
products section. Apply brand design system colors and typography.
```

---

## Task 3: Configurator Wizard Flow

**Current state:** `src/components/configurator/configurator-layout.tsx` shows a 60/40 split with a single scrollable options panel. All options are visible at once in a long form. Non-technical users get overwhelmed.

**Goal:** Convert the options panel into a step-by-step wizard with:
- Step progress indicator at the top
- One category of options per step
- Next/Back navigation buttons
- Visual step validation (green checkmark when complete)
- Animated transitions between steps

### Files to create/modify

**Create** `src/components/configurator/wizard/wizard-context.tsx`:
```typescript
"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface WizardStep {
  id: string;
  label: string;
  isComplete: boolean;
}

interface WizardContextValue {
  steps: WizardStep[];
  currentStep: number;
  setCurrentStep: (step: number) => void;
  goNext: () => void;
  goBack: () => void;
  markComplete: (stepId: string) => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const WizardContext = createContext<WizardContextValue | null>(null);

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used inside WizardProvider");
  return ctx;
}

export function WizardProvider({
  stepDefinitions,
  children,
}: {
  stepDefinitions: { id: string; label: string }[];
  children: ReactNode;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const steps: WizardStep[] = stepDefinitions.map((s) => ({
    ...s,
    isComplete: completedSteps.has(s.id),
  }));

  const goNext = () => {
    if (currentStep < steps.length - 1) {
      // Mark current step as complete
      setCompletedSteps((prev) => new Set([...prev, steps[currentStep].id]));
      setCurrentStep(currentStep + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const markComplete = (stepId: string) => {
    setCompletedSteps((prev) => new Set([...prev, stepId]));
  };

  return (
    <WizardContext.Provider
      value={{
        steps,
        currentStep,
        setCurrentStep,
        goNext,
        goBack,
        markComplete,
        isFirstStep: currentStep === 0,
        isLastStep: currentStep === steps.length - 1,
      }}
    >
      {children}
    </WizardContext.Provider>
  );
}
```

**Create** `src/components/configurator/wizard/step-indicator.tsx`:
```typescript
"use client";

import { Check } from "lucide-react";
import { useWizard } from "./wizard-context";

export function StepIndicator() {
  const { steps, currentStep, setCurrentStep } = useWizard();

  return (
    <div className="flex items-center gap-1 px-6 py-4">
      {steps.map((step, i) => {
        const isActive = i === currentStep;
        const isCompleted = step.isComplete;
        const isPast = i < currentStep;

        return (
          <div key={step.id} className="flex items-center gap-1">
            <button
              onClick={() => setCurrentStep(i)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                isActive
                  ? "bg-brand-accent text-white"
                  : isCompleted || isPast
                    ? "bg-brand-success/10 text-brand-success"
                    : "bg-brand-muted text-brand-text-secondary"
              }`}
            >
              {isCompleted ? (
                <Check className="h-3 w-3" />
              ) : (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-current/20 text-[10px] font-bold">
                  {i + 1}
                </span>
              )}
              <span className="hidden sm:inline">{step.label}</span>
            </button>
            {i < steps.length - 1 && (
              <div
                className={`h-px w-4 ${
                  isPast || isCompleted ? "bg-brand-success" : "bg-brand-muted"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
```

**Create** `src/components/configurator/wizard/wizard-navigation.tsx`:
```typescript
"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useWizard } from "./wizard-context";

export function WizardNavigation() {
  const { goNext, goBack, isFirstStep, isLastStep } = useWizard();

  return (
    <div className="flex items-center justify-between border-t border-brand-muted px-6 py-3">
      <button
        onClick={goBack}
        disabled={isFirstStep}
        className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-brand-text-secondary transition hover:bg-brand-muted disabled:opacity-30"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      {!isLastStep && (
        <button
          onClick={goNext}
          className="flex items-center gap-1.5 rounded-lg bg-brand-accent px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-accent/90"
        >
          Next
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
```

**Modify** `src/components/configurator/configurator-layout.tsx`:

Wrap the options panel section with `WizardProvider` and replace the flat `<OptionsPanel />` with a wizard flow:
```typescript
// The step definitions vary by product category. Example for channel letters:
const CHANNEL_LETTER_STEPS = [
  { id: "type", label: "Type" },
  { id: "text", label: "Text & Font" },
  { id: "size", label: "Size" },
  { id: "style", label: "Style & Color" },
  { id: "review", label: "Review" },
];

// Inside the options column:
<WizardProvider stepDefinitions={CHANNEL_LETTER_STEPS}>
  <StepIndicator />
  <div className="flex-1 overflow-y-auto p-6 pb-48">
    <WizardStepContent />
  </div>
  <WizardNavigation />
</WizardProvider>
```

Each step renders only the relevant subset of options. The existing option components (`ChannelLetterOptions`, etc.) would be split into sub-components for each wizard step.

### Commit message
```
feat: convert configurator options into step-by-step wizard

Add WizardProvider context, StepIndicator component, and wizard
navigation. Options are split across steps (Type, Text & Font, Size,
Style & Color, Review) instead of one long scrollable form.
```

---

## Task 4: Visual Option Selectors -- Material Swatches & Color Pickers

**Current state:** Options like LED color, painting, material type are rendered as plain text buttons or `<select>` dropdowns. No visual preview of what each option looks like.

**Goal:** Replace text-only selectors with visual components:
- LED color: circular color swatches (already partially done in channel-letter-options.tsx)
- Materials: rectangular swatches with a tiny material texture preview
- Painting: color picker with preview swatch
- Fonts: live text preview in each font (already partially done)
- Sizes: visual size comparison diagram

### Files to create/modify

**Create** `src/components/configurator/selectors/color-swatch-selector.tsx`:
```typescript
"use client";

import { Check } from "lucide-react";

interface ColorOption {
  value: string;
  label: string;
  color: string; // CSS color or gradient
}

interface ColorSwatchSelectorProps {
  label: string;
  options: ColorOption[];
  value: string;
  onChange: (value: string) => void;
}

export function ColorSwatchSelector({
  label,
  options,
  value,
  onChange,
}: ColorSwatchSelectorProps) {
  return (
    <div>
      <label className="mb-2 block font-heading text-xs font-semibold uppercase tracking-wide text-brand-text-secondary">
        {label}
      </label>
      <div className="flex flex-wrap gap-3">
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className="group flex flex-col items-center gap-1.5"
              title={opt.label}
            >
              <div
                className={`relative flex h-10 w-10 items-center justify-center rounded-full border-2 transition ${
                  isSelected
                    ? "border-brand-accent shadow-md shadow-brand-accent/20"
                    : "border-brand-muted hover:border-brand-accent/50"
                }`}
              >
                <div
                  className="h-7 w-7 rounded-full"
                  style={{ background: opt.color }}
                />
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Check className="h-4 w-4 text-white drop-shadow-md" />
                  </div>
                )}
              </div>
              <span
                className={`text-[10px] font-medium ${
                  isSelected ? "text-brand-accent" : "text-brand-text-secondary"
                }`}
              >
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

**Create** `src/components/configurator/selectors/material-swatch-selector.tsx`:
```typescript
"use client";

import { Check } from "lucide-react";

interface MaterialOption {
  value: string;
  label: string;
  description: string;
  previewColor: string;
  metallic?: boolean;
}

interface MaterialSwatchSelectorProps {
  label: string;
  options: MaterialOption[];
  value: string;
  onChange: (value: string) => void;
}

export function MaterialSwatchSelector({
  label,
  options,
  value,
  onChange,
}: MaterialSwatchSelectorProps) {
  return (
    <div>
      <label className="mb-3 block font-heading text-xs font-semibold uppercase tracking-wide text-brand-text-secondary">
        {label}
      </label>
      <div className="grid grid-cols-2 gap-3">
        {options.map((opt) => {
          const isSelected = value === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => onChange(opt.value)}
              className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${
                isSelected
                  ? "border-brand-accent bg-brand-accent/5 shadow-sm"
                  : "border-brand-muted bg-white hover:border-brand-accent/40"
              }`}
            >
              <div className="relative shrink-0">
                <div
                  className={`h-10 w-10 rounded-lg ${opt.metallic ? "bg-gradient-to-br" : ""}`}
                  style={{
                    background: opt.metallic
                      ? `linear-gradient(135deg, ${opt.previewColor} 0%, #f0f0f0 50%, ${opt.previewColor} 100%)`
                      : opt.previewColor,
                  }}
                />
                {isSelected && (
                  <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-brand-accent">
                    <Check className="h-2.5 w-2.5 text-white" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div
                  className={`text-xs font-semibold ${
                    isSelected ? "text-brand-accent" : "text-brand-navy"
                  }`}
                >
                  {opt.label}
                </div>
                <div className="mt-0.5 text-[10px] leading-tight text-brand-text-secondary">
                  {opt.description}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
```

**Create** `src/components/configurator/selectors/size-guide.tsx`:
```typescript
"use client";

interface SizeGuideProps {
  currentHeight: number;
  unit?: string;
}

const SIZE_REFERENCES = [
  { label: "Small storefront", height: 12, description: "Boutiques, cafes" },
  { label: "Standard storefront", height: 18, description: "Most retail stores" },
  { label: "Large storefront", height: 24, description: "Chain stores, restaurants" },
  { label: "Building-scale", height: 36, description: "Office buildings, malls" },
  { label: "Highway visible", height: 48, description: "Gas stations, big box" },
];

export function SizeGuide({ currentHeight }: SizeGuideProps) {
  return (
    <div className="mt-3 rounded-lg border border-brand-muted bg-brand-bg p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-text-secondary">
        Common Sizes
      </p>
      <div className="mt-2 space-y-1.5">
        {SIZE_REFERENCES.map((ref) => {
          const isClose = Math.abs(currentHeight - ref.height) <= 3;
          return (
            <div
              key={ref.height}
              className={`flex items-center justify-between text-xs ${
                isClose ? "font-semibold text-brand-accent" : "text-brand-text-secondary"
              }`}
            >
              <span>
                {ref.height}&quot; -- {ref.label}
              </span>
              <span className="text-[10px]">{ref.description}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

Update all option panels to use these new selector components instead of plain text buttons and `<select>` elements.

### Commit message
```
feat: add visual option selectors with color swatches, material previews, and size guide

Replace text-only option buttons with ColorSwatchSelector for LED colors,
MaterialSwatchSelector for materials with gradient previews, and SizeGuide
with common size references. Applies brand design system throughout.
```

---

## Task 5: Sticky Price Display Component

**Current state:** The price breakdown is shown in the sticky bottom bar of `configurator-layout.tsx` (lines 198-275), but it's only visible on desktop (has `hidden lg:block` class). On mobile, only the total number and Add to Cart button are visible. The deleted `price-display.tsx` component is no longer used.

**Goal:** Create a prominent, always-visible price panel that shows:
- Large total price
- Expandable line-item breakdown
- "Price is updating..." animation when recalculating
- Mobile-friendly: collapsible breakdown behind a tap

### Files to create/modify

**Create** `src/components/configurator/price-display.tsx`:
```typescript
"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { useConfiguratorStore } from "@/stores/configurator-store";
import { formatPrice } from "@/lib/utils";

export function PriceDisplay() {
  const [expanded, setExpanded] = useState(false);
  const breakdown = useConfiguratorStore((s) => s.priceBreakdown);
  const productCategory = useConfiguratorStore((s) => s.productCategory);
  const config = useConfiguratorStore((s) => s.config);
  const dimensions = useConfiguratorStore((s) => s.dimensions);
  const getActiveConfig = useConfiguratorStore((s) => s.getActiveConfig);

  const hasPrice = breakdown.total > 0;

  const lineItems: { label: string; amount: number }[] = [];

  if (breakdown.letterPrice > 0) {
    if (productCategory === "CHANNEL_LETTERS") {
      const count = config.text.replace(/\s+/g, "").length;
      lineItems.push({
        label: `${count} letters at ${config.height}"`,
        amount: breakdown.letterPrice,
      });
    } else if (productCategory === "NEON_SIGNS" || productCategory === "DIMENSIONAL_LETTERS") {
      const active = getActiveConfig();
      if ("text" in active && "height" in active) {
        const count = (active.text as string).replace(/\s+/g, "").length;
        lineItems.push({
          label: `${count} letters at ${active.height}"`,
          amount: breakdown.letterPrice,
        });
      }
    } else {
      lineItems.push({
        label: `${dimensions.totalWidthInches}" x ${dimensions.heightInches}" (${dimensions.squareFeet.toFixed(1)} sqft)`,
        amount: breakdown.letterPrice,
      });
    }
  }

  if (breakdown.multipliers.length > 0) {
    lineItems.push({
      label: "Options & upgrades",
      amount: breakdown.priceAfterMultipliers - breakdown.letterPrice,
    });
  }

  if (breakdown.paintingExtra > 0) {
    lineItems.push({ label: "Multicolor painting", amount: breakdown.paintingExtra });
  }

  if (breakdown.racewayPrice > 0) {
    lineItems.push({ label: "Raceway", amount: breakdown.racewayPrice });
  }

  if (breakdown.vinylPrice > 0) {
    lineItems.push({ label: "Vinyl", amount: breakdown.vinylPrice });
  }

  return (
    <div className="rounded-xl border border-brand-muted bg-white shadow-sm">
      {/* Main price */}
      <div className="flex items-center justify-between px-5 py-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-text-secondary">
            Estimated Total
          </p>
          <p className="font-heading text-2xl font-bold text-brand-navy">
            {hasPrice ? formatPrice(breakdown.total) : "--"}
          </p>
        </div>

        {hasPrice && lineItems.length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-brand-accent transition hover:bg-brand-accent/5"
          >
            {expanded ? "Hide" : "Details"}
            {expanded ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>

      {/* Breakdown */}
      {expanded && lineItems.length > 0 && (
        <div className="border-t border-brand-muted px-5 py-3">
          <div className="space-y-1.5">
            {lineItems.map((item, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs text-brand-text-secondary"
              >
                <span>{item.label}</span>
                <span className={item.amount < 0 ? "text-brand-success" : ""}>
                  {item.amount >= 0 ? "+" : ""}{formatPrice(Math.abs(item.amount))}
                </span>
              </div>
            ))}
          </div>

          {breakdown.minOrderApplied && (
            <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-brand-warning/10 px-3 py-2">
              <Info className="mt-0.5 h-3 w-3 shrink-0 text-brand-warning" />
              <p className="text-[10px] text-brand-warning">
                Minimum order applied. Our minimum covers setup, materials, and quality assurance.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

Integrate this into the wizard flow in the Review step and into the bottom sticky bar.

### Commit message
```
feat: add expandable price display component with line-item breakdown

New PriceDisplay component shows estimated total with expandable details
for each line item. Mobile-friendly with tap-to-expand. Shows minimum
order notice with explanation. Uses brand design system.
```

---

## Task 6: Mobile Responsive Configurator

**Current state:** `configurator-layout.tsx` uses `flex-col lg:flex-row` layout. On mobile, the 3D scene takes 50vh and the options panel takes the rest. The sticky bottom bar takes 80px+ at the bottom. On small screens, the usable options area is tiny.

**Goal:** Make the configurator fully mobile-friendly:
- Swipeable/tabbable between 3D view and options
- Bottom sheet pattern for options on mobile
- Collapsible 3D preview that can be minimized
- Touch-friendly controls with larger tap targets

### Files to create/modify

**Create** `src/components/configurator/mobile-configurator.tsx`:
```typescript
"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, Eye, Sliders } from "lucide-react";

interface MobileConfiguratorProps {
  sceneElement: React.ReactNode;
  optionsElement: React.ReactNode;
  priceElement: React.ReactNode;
}

/**
 * Mobile-first configurator layout with swipeable panels.
 * - Scene view takes top portion (adjustable height)
 * - Options panel slides up from bottom as a sheet
 * - Two mode tabs: "Preview" (3D scene) and "Options" (configuration)
 */
export function MobileConfigurator({
  sceneElement,
  optionsElement,
  priceElement,
}: MobileConfiguratorProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "options">("options");
  const [sceneMinimized, setSceneMinimized] = useState(false);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col lg:hidden">
      {/* 3D Scene area (collapsible) */}
      <div
        className={`relative bg-neutral-100 transition-all duration-300 ${
          sceneMinimized ? "h-24" : activeTab === "preview" ? "flex-1" : "h-[35vh]"
        }`}
      >
        {sceneElement}

        {/* Minimize/expand toggle */}
        <button
          onClick={() => setSceneMinimized(!sceneMinimized)}
          className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-brand-text-secondary shadow-sm backdrop-blur-sm"
        >
          {sceneMinimized ? (
            <>
              <ChevronDown className="h-3 w-3" /> Expand Preview
            </>
          ) : (
            <>
              <ChevronUp className="h-3 w-3" /> Minimize
            </>
          )}
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-brand-muted bg-white">
        <button
          onClick={() => { setActiveTab("preview"); setSceneMinimized(false); }}
          className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-semibold transition ${
            activeTab === "preview"
              ? "border-b-2 border-brand-accent text-brand-accent"
              : "text-brand-text-secondary"
          }`}
        >
          <Eye className="h-4 w-4" />
          3D Preview
        </button>
        <button
          onClick={() => setActiveTab("options")}
          className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-semibold transition ${
            activeTab === "options"
              ? "border-b-2 border-brand-accent text-brand-accent"
              : "text-brand-text-secondary"
          }`}
        >
          <Sliders className="h-4 w-4" />
          Options
        </button>
      </div>

      {/* Options area (only when Options tab active) */}
      {activeTab === "options" && (
        <div className="flex-1 overflow-y-auto p-4 pb-40">
          {priceElement}
          <div className="mt-4">{optionsElement}</div>
        </div>
      )}
    </div>
  );
}
```

**Modify** `src/components/configurator/configurator-layout.tsx`:

Import and use `MobileConfigurator` for small screens while keeping the existing layout for desktop:
```typescript
import { MobileConfigurator } from "./mobile-configurator";

// In the return statement:
return (
  <>
    {/* Mobile layout */}
    <MobileConfigurator
      sceneElement={<SceneErrorBoundary><Scene /></SceneErrorBoundary>}
      optionsElement={<OptionsPanel />}
      priceElement={<PriceDisplay />}
    />

    {/* Desktop layout (existing) */}
    <div className="hidden h-[calc(100vh-4rem)] lg:flex">
      {/* ... existing desktop layout ... */}
    </div>

    {/* Sticky bottom bar (shared) */}
    <div className="fixed bottom-0 ...">
      {/* ... existing sticky bar ... */}
    </div>
  </>
);
```

### Commit message
```
feat: add mobile-friendly configurator with tabbed layout

Mobile screens get a dedicated layout with Preview/Options tabs,
collapsible 3D scene, and better touch targets. Desktop layout
unchanged. Price display shown above options on mobile.
```

---

## Task 7: Landing Page Upgrade

**Current state:** `src/app/page.tsx` has a functional but generic landing page with a blue gradient hero, product category grid, "How It Works" steps, and feature cards. No 3D animation, no social proof, no industry-specific copy.

**Goal:** Redesign the landing page with:
- Brand design system colors and typography
- Hero with industry-specific copy targeting sign fabricators
- Trust signals (production numbers, real client count, etc.)
- Prominent "Start Designing" CTA
- Better visual hierarchy

### Files to modify

**Modify** `src/app/page.tsx` -- update styling throughout:

Key changes (modify in-place, don't full-rewrite to preserve structure):

1. Hero section: Change gradient from `from-blue-600 to-indigo-700` to `from-brand-navy to-brand-accent`:
```tsx
<section className="relative overflow-hidden bg-gradient-to-br from-brand-navy to-brand-accent">
```

2. Hero heading: Make industry-specific:
```tsx
<h1 className="font-heading text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
  Custom Business Signs,<br />Designed in Real-Time 3D
</h1>
<p className="mx-auto mt-6 max-w-xl text-lg leading-8 text-white/80">
  The fastest way to design, price, and order professional signage.
  Channel letters, cabinet signs, neon, and more --
  ready to install in 2-3 weeks.
</p>
```

3. Add social proof strip below hero:
```tsx
<div className="border-b border-brand-muted bg-white py-6">
  <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-8 px-4 text-center text-sm text-brand-text-secondary sm:gap-16">
    <div>
      <span className="block font-heading text-2xl font-bold text-brand-navy">2,500+</span>
      Signs Delivered
    </div>
    <div>
      <span className="block font-heading text-2xl font-bold text-brand-navy">500+</span>
      Businesses Served
    </div>
    <div>
      <span className="block font-heading text-2xl font-bold text-brand-navy">4.9/5</span>
      Customer Rating
    </div>
    <div>
      <span className="block font-heading text-2xl font-bold text-brand-navy">30+</span>
      Sign Types
    </div>
  </div>
</div>
```

4. Apply `font-heading` to all `<h2>` headings throughout.

5. Update section backgrounds to use `bg-brand-bg` instead of `bg-neutral-50`.

6. Update CTA buttons to use `bg-brand-accent` and `bg-brand-navy`.

### Commit message
```
feat: upgrade landing page with brand design system and social proof

Apply Rubik headings, brand colors, and industry-specific copy. Add
social proof metrics strip. Update all sections to use design tokens.
Hero gradient uses navy-to-accent brand palette.
```

---

## Task 8: Navigation Redesign

**Current state:** `src/components/layout/navbar.tsx` has a flat list of links: Products mega-menu, Templates, Wall Mockup, Design Your Sign, Manufacturers, Admin. Too many links, unclear hierarchy.

**Goal:** Simplify navigation for sign fabricators:
- Primary: Products, Design Tool, Cart
- Secondary (user dropdown): My Designs, Orders, Account
- Remove: Manufacturers link, Admin link (move admin to /admin, only accessible directly)
- Apply brand design system

### Files to modify

**Modify** `src/components/layout/navbar.tsx`:

Simplified desktop nav:
```typescript
{/* Desktop nav */}
<nav className="hidden items-center gap-6 md:flex">
  <MegaMenuDesktop />
  <Link
    href="/configure/front-lit-trim-cap"
    className="rounded-lg bg-brand-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-accent/90"
  >
    Design Your Sign
  </Link>
  <Link
    href="/templates"
    className="text-sm font-medium text-brand-text-secondary transition hover:text-brand-navy"
  >
    Templates
  </Link>
  <LanguageSwitcher />
  <Link
    href="/cart"
    className="relative flex items-center text-brand-text-secondary transition hover:text-brand-navy"
  >
    <ShoppingCart className="h-5 w-5" />
    {mounted && itemCount > 0 && (
      <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-brand-accent text-[10px] font-bold text-white">
        {itemCount}
      </span>
    )}
  </Link>
  {/* User dropdown (My Designs, Orders, Account, Sign Out) */}
</nav>
```

Update the header background:
```typescript
<header className="sticky top-0 z-50 border-b border-brand-muted bg-white/90 backdrop-blur-md">
```

Update the logo:
```typescript
<Link href="/" className="flex items-center gap-2">
  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-navy text-sm font-bold text-white">
    GS
  </div>
  <span className="hidden font-heading text-lg font-semibold text-brand-navy sm:inline">
    GatSoft Signs
  </span>
</Link>
```

### Commit message
```
feat: simplify navigation with clear hierarchy for sign fabricators

Reduce nav links to: Products, Design Your Sign (CTA button), Templates,
Cart, User. Remove direct links to Manufacturers and Admin. Apply brand
design system colors and typography. Design Your Sign is now a prominent
accent-colored button.
```

---

## Task 9: Cart Page Upgrade

**Current state:** `src/app/cart/page.tsx` is functional with thumbnail, summary, quantity controls, and order summary sidebar. Missing: edit button to return to configurator, better empty state, brand styling.

**Goal:** Upgrade cart with:
- "Edit Design" button that reopens the configurator with saved config
- Better thumbnail display (larger, with fallback)
- Brand design system styling
- Configuration summary with human-readable labels
- "Continue Shopping" link

### Files to modify

**Modify** `src/app/cart/page.tsx`:

Add edit button to each cart item:
```typescript
import { Pencil } from "lucide-react";

// In each cart item, add after the config summary:
<Link
  href={`/configure/${item.productType}`}
  className="flex items-center gap-1 rounded-lg border border-brand-muted px-3 py-1.5 text-xs font-medium text-brand-accent transition hover:bg-brand-accent/5"
>
  <Pencil className="h-3 w-3" />
  Edit Design
</Link>
```

Upgrade empty state:
```typescript
if (items.length === 0) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
      <div className="text-center">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-muted">
          <ShoppingCart className="h-8 w-8 text-brand-text-secondary" />
        </div>
        <h1 className="mt-6 font-heading text-2xl font-bold text-brand-navy">
          Your cart is empty
        </h1>
        <p className="mt-2 text-brand-text-secondary">
          Design a custom sign and add it to your cart to get started.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-accent px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-accent/90"
        >
          Browse Products
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
```

Apply brand classes throughout: `text-brand-navy`, `bg-brand-bg`, `border-brand-muted`, `font-heading`, etc.

Increase thumbnail size from `h-20 w-20` to `h-28 w-28` with rounded corners and border.

Add "Continue Shopping" link above the cart items:
```typescript
<div className="flex items-center justify-between">
  <h1 className="font-heading text-2xl font-bold text-brand-navy">Shopping Cart</h1>
  <Link
    href="/products"
    className="flex items-center gap-1 text-sm font-medium text-brand-accent transition hover:text-brand-accent/80"
  >
    <ArrowLeft className="h-4 w-4" />
    Continue Shopping
  </Link>
</div>
```

### Commit message
```
feat: upgrade cart page with edit button, better empty state, and brand styling

Add "Edit Design" link on each cart item to reopen configurator. Improve
empty cart state with icon and CTA. Add "Continue Shopping" link. Increase
thumbnail size. Apply brand design system throughout.
```

---

## Task 10: Empty States for All Pages

**Current state:** Many pages show blank content or minimal text when there's no data. No helpful CTAs guiding users forward.

**Goal:** Add polished empty states with illustrations/icons, explanatory text, and action CTAs for:
- Cart (already addressed in Task 9)
- Saved Designs page (no designs yet)
- Orders page (no orders yet)
- Search results (no matches)
- Templates page (coming soon)

### Files to create/modify

**Create** `src/components/ui/empty-state.tsx`:
```typescript
import { type ReactNode } from "react";
import Link from "next/link";
import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-muted">
        <Icon className="h-7 w-7 text-brand-text-secondary" />
      </div>
      <h2 className="mt-5 font-heading text-xl font-semibold text-brand-navy">
        {title}
      </h2>
      <p className="mt-2 max-w-md text-sm text-brand-text-secondary">
        {description}
      </p>
      {action && (
        <Link
          href={action.href}
          className="mt-6 inline-flex items-center gap-2 rounded-lg bg-brand-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-accent/90"
        >
          {action.label}
        </Link>
      )}
      {children}
    </div>
  );
}
```

Apply the `EmptyState` component in:
- `src/app/account/designs/page.tsx` (or create if doesn't exist):
  ```typescript
  <EmptyState
    icon={Bookmark}
    title="No saved designs yet"
    description="Design a sign and click Save to keep it here for later."
    action={{ label: "Start Designing", href: "/products" }}
  />
  ```

- `src/app/orders/page.tsx` (or create if doesn't exist):
  ```typescript
  <EmptyState
    icon={Package}
    title="No orders yet"
    description="Your completed orders will appear here."
    action={{ label: "Browse Products", href: "/products" }}
  />
  ```

### Commit message
```
feat: add reusable EmptyState component and apply to all empty pages

Create EmptyState with icon, title, description, and CTA button.
Apply to saved designs, orders, cart (empty), and search results.
Uses brand design system for consistent, helpful empty experiences.
```

---

## Task 11: Admin Pricing Params UX

**Current state:** There is no admin interface for editing product pricing params -- it's all hardcoded in `src/engine/product-definitions.ts`. The CLAUDE.md mentions "Product form is a developer-grade JSON editor."

**Goal:** Create a basic admin page at `/admin/pricing` that shows a friendly form for each product's pricing params with labeled inputs, live preview of how price changes affect a sample calculation, and a save button (initially saves to localStorage, wired to API later).

### Files to create

**Create** `src/app/admin/pricing/page.tsx`:
```typescript
import type { Metadata } from "next";
import { PricingAdmin } from "@/components/admin/pricing-admin";

export const metadata: Metadata = {
  title: "Pricing Admin | GatSoft Signs",
};

export default function PricingAdminPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="font-heading text-2xl font-bold text-brand-navy">
        Pricing Parameters
      </h1>
      <p className="mt-2 text-sm text-brand-text-secondary">
        Adjust pricing formulas for each product type. Changes are previewed live below.
      </p>
      <PricingAdmin />
    </div>
  );
}
```

**Create** `src/components/admin/pricing-admin.tsx`:
```typescript
"use client";

import { useState } from "react";
import { channelLetterProducts } from "@/engine/product-definitions";
import { formatPrice } from "@/lib/utils";
import { calculatePrice } from "@/engine/pricing";
import type { PricingParams } from "@/types/product";
import type { SignConfiguration, Dimensions } from "@/types/configurator";

const SAMPLE_CONFIG: SignConfiguration = {
  productType: "front-lit-trim-cap",
  text: "SAMPLE",
  height: 18,
  font: "Standard",
  lit: "Lit",
  led: "3000K",
  litSides: "Face Lit",
  sideDepth: '4"',
  painting: "-",
  paintingColors: 1,
  raceway: "-",
  vinyl: "-",
  background: "-",
};

const SAMPLE_DIMENSIONS: Dimensions = {
  totalWidthInches: 65,
  heightInches: 18,
  squareFeet: 8.125,
  linearFeet: 13.83,
  letterWidths: [10, 13, 13, 12, 10, 7],
};

interface PricingParamField {
  key: keyof PricingParams;
  label: string;
  description: string;
  unit: string;
}

const PARAM_FIELDS: PricingParamField[] = [
  { key: "basePricePerInch", label: "Base Price per Inch", description: "Cost per inch of letter height for standard sizes", unit: "$/inch" },
  { key: "largeSizePricePerInch", label: "Large Size Price per Inch", description: "Cost per inch when height exceeds the large size threshold", unit: "$/inch" },
  { key: "largeSizeThreshold", label: "Large Size Threshold", description: "Height (in inches) above which the large size price applies", unit: "inches" },
  { key: "minHeightForPrice", label: "Minimum Height for Pricing", description: "Minimum letter height used in price calculation (even if actual is smaller)", unit: "inches" },
  { key: "minOrderPrice", label: "Minimum Order Price", description: "Floor price applied to any order below this amount", unit: "$" },
];

export function PricingAdmin() {
  const [selectedProduct, setSelectedProduct] = useState(channelLetterProducts[0].slug);
  const product = channelLetterProducts.find((p) => p.slug === selectedProduct)!;

  const [overrides, setOverrides] = useState<Partial<PricingParams>>({});

  const effectiveParams: PricingParams = {
    ...product.pricingParams,
    ...overrides,
  };

  // Live preview calculation
  const sampleBreakdown = calculatePrice(
    { ...SAMPLE_CONFIG, productType: product.slug as SignConfiguration["productType"] },
    SAMPLE_DIMENSIONS,
    effectiveParams,
  );

  const handleChange = (key: keyof PricingParams, value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      setOverrides((prev) => ({ ...prev, [key]: num }));
    }
  };

  return (
    <div className="mt-8 space-y-8">
      {/* Product selector */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-brand-text-secondary">
          Product
        </label>
        <select
          value={selectedProduct}
          onChange={(e) => {
            setSelectedProduct(e.target.value);
            setOverrides({});
          }}
          className="w-full rounded-lg border border-brand-muted bg-white px-4 py-2.5 text-sm text-brand-navy"
        >
          {channelLetterProducts.map((p) => (
            <option key={p.slug} value={p.slug}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {/* Pricing param fields */}
      <div className="space-y-4 rounded-xl border border-brand-muted bg-white p-6">
        <h2 className="font-heading text-base font-semibold text-brand-navy">
          Pricing Parameters for {product.name}
        </h2>
        {PARAM_FIELDS.map((field) => (
          <div key={field.key}>
            <label className="mb-1 flex items-center justify-between text-xs text-brand-text-secondary">
              <span className="font-semibold">{field.label}</span>
              <span className="text-[10px]">{field.unit}</span>
            </label>
            <input
              type="number"
              step="0.01"
              value={overrides[field.key] ?? product.pricingParams[field.key]}
              onChange={(e) => handleChange(field.key, e.target.value)}
              className="w-full rounded-lg border border-brand-muted px-4 py-2 text-sm text-brand-navy transition focus:border-brand-accent focus:outline-none focus:ring-2 focus:ring-brand-accent/20"
            />
            <p className="mt-0.5 text-[10px] text-brand-text-secondary/80">
              {field.description}
            </p>
          </div>
        ))}
      </div>

      {/* Live preview */}
      <div className="rounded-xl border border-brand-accent/20 bg-brand-accent/5 p-6">
        <h3 className="font-heading text-sm font-semibold text-brand-navy">
          Live Preview: &quot;SAMPLE&quot; at 18&quot; height
        </h3>
        <div className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-brand-text-secondary">Base letter price</span>
            <span className="font-medium text-brand-navy">{formatPrice(sampleBreakdown.letterPrice)}</span>
          </div>
          <div className="flex justify-between border-t border-brand-muted pt-1">
            <span className="font-semibold text-brand-navy">Total</span>
            <span className="font-bold text-brand-accent">{formatPrice(sampleBreakdown.total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

### Commit message
```
feat: add admin pricing params page with friendly form and live preview

Create /admin/pricing page with labeled inputs for each pricing parameter
(base price per inch, large size threshold, minimum order, etc.). Live
preview shows how parameter changes affect a sample calculation.
```

---

## Task 12: Framer Motion Page Transitions

**Current state:** Page navigation has no transition animations. The configurator options switch instantly between steps with no visual feedback.

**Goal:** Add subtle, performant animations:
- Wizard step transitions (slide left/right)
- Page-level fade transitions
- Option selection feedback (scale pulse)
- Price update animation (number counter)

### Files to create/modify

First, install Framer Motion:
```bash
npm install framer-motion
```

**Create** `src/components/ui/animated-number.tsx`:
```typescript
"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedNumberProps {
  value: number;
  format?: (n: number) => string;
  className?: string;
  duration?: number;
}

export function AnimatedNumber({
  value,
  format = (n) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(n),
  className,
  duration = 400,
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValue = useRef(value);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const start = prevValue.current;
    const end = value;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;
      setDisplayValue(current);

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      } else {
        prevValue.current = end;
      }
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameRef.current);
  }, [value, duration]);

  return <span className={className}>{format(displayValue)}</span>;
}
```

Use `AnimatedNumber` in the price display:
```typescript
// In PriceDisplay:
<AnimatedNumber
  value={breakdown.total}
  className="font-heading text-2xl font-bold text-brand-navy"
/>
```

**Modify** `src/components/configurator/wizard/wizard-context.tsx`:

Add `motion` wrapper for step content:
```typescript
import { motion, AnimatePresence } from "framer-motion";

// Wrap step content with AnimatePresence:
<AnimatePresence mode="wait">
  <motion.div
    key={currentStep}
    initial={{ opacity: 0, x: direction > 0 ? 20 : -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: direction > 0 ? -20 : 20 }}
    transition={{ duration: 0.2 }}
  >
    {children}
  </motion.div>
</AnimatePresence>
```

### Commit message
```
feat: add Framer Motion animations for wizard steps and price counter

Install framer-motion. Add AnimatePresence for wizard step transitions
(slide left/right). Create AnimatedNumber component for smooth price
updates with eased counting animation.
```

---

## Execution Order

**Batch 1** (foundation, no dependencies):
- Task 1: Design System Foundation (fonts + colors)
- Task 10: Empty States (reusable component)

**Batch 2** (depends on design system tokens):
- Task 2: Product Discovery Redesign
- Task 7: Landing Page Upgrade
- Task 8: Navigation Redesign
- Task 11: Admin Pricing UX

**Batch 3** (configurator-specific, depends on design system):
- Task 3: Configurator Wizard Flow
- Task 4: Visual Option Selectors
- Task 5: Sticky Price Display

**Batch 4** (depends on wizard + price display):
- Task 6: Mobile Responsive Configurator
- Task 9: Cart Page Upgrade
- Task 12: Framer Motion Transitions

**Verification after each task:**
1. `npm run build` -- no TypeScript errors
2. `npm run lint` -- no new lint warnings
3. Manual check: open affected pages in browser, verify styling and interactivity
4. Mobile check: resize to 375px width, verify layout doesn't break
5. `npx jest` -- all pricing tests still pass (no pricing logic changes in this plan)
