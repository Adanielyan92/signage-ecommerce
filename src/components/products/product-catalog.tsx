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
  {
    name: "A-Frame Sign",
    slug: "a-frame-standard",
    description: "Portable sidewalk sign. Double-sided for maximum visibility. Easy to move.",
    startingPrice: 150,
    image: "/images/products/a-frame.png",
    useCases: ["outdoor", "events"],
  },
  {
    name: "Yard Sign",
    slug: "yard-sign-coroplast",
    description: "Lightweight coroplast yard sign with H-stake. Great for campaigns and real estate.",
    startingPrice: 50,
    image: "/images/products/yard-sign.png",
    useCases: ["outdoor", "events"],
  },
  {
    name: "Aluminum Plaque",
    slug: "plaque-aluminum",
    description: "Professional aluminum plaque with custom engraving. Perfect for offices and awards.",
    startingPrice: 100,
    image: "/images/products/plaque.png",
    useCases: ["indoor"],
  },
  {
    name: "Wall Graphic",
    slug: "vinyl-wall-graphic",
    description: "Custom vinyl wall graphic for interior branding and murals.",
    startingPrice: 75,
    image: "/images/products/vinyl-graphic.png",
    useCases: ["indoor", "storefront"],
  },
  {
    name: "ADA Compliant Sign",
    slug: "wayfinding-ada",
    description: "ADA-compliant sign with tactile text and Grade 2 Braille.",
    startingPrice: 100,
    image: "/images/products/wayfinding.png",
    useCases: ["indoor"],
  },
  {
    name: "Push-Through Sign",
    slug: "push-through-single",
    description: "Illuminated sign with letters pushed through the face panel for a premium 3D look.",
    startingPrice: 1200,
    image: "/images/products/push-through.png",
    useCases: ["storefront", "outdoor"],
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
