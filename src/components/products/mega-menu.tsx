"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const PRODUCT_CATEGORIES = [
  {
    title: "Channel Letters",
    description: "LED illuminated custom lettering",
    items: [
      { name: "Front-Lit with Trim Cap", slug: "front-lit-trim-cap" },
      { name: "Trimless", slug: "trimless" },
      { name: "Marquee Letters", slug: "marquee-letters" },
      { name: "Back-Lit", slug: "back-lit" },
      { name: "Halo-Lit", slug: "halo-lit" },
      { name: "Non-Lit", slug: "non-lit" },
    ],
  },
  {
    title: "Lit Shape Signs",
    description: "Custom contoured LED shapes",
    items: [
      { name: "Cloud Sign", slug: "cloud-sign" },
      { name: "Logo Shape", slug: "logo-shape" },
    ],
  },
  {
    title: "Cabinet Signs",
    description: "Illuminated cabinet signage",
    items: [
      { name: "Single Face", slug: "single-face-squared" },
      { name: "Double Face", slug: "double-face-squared" },
      { name: "Shaped Single", slug: "single-face-shaped" },
      { name: "Shaped Double", slug: "double-face-shaped" },
    ],
  },
  {
    title: "Dimensional Letters",
    description: "Non-lit 3D lettering",
    items: [
      { name: "Acrylic", slug: "acrylic" },
      { name: "Painted Metal", slug: "painted-metal" },
      { name: "Brushed Metal", slug: "brushed-metal" },
      { name: "Flat-Cut Aluminum", slug: "flat-cut-aluminum" },
    ],
  },
  {
    title: "More",
    description: "Logos, prints, and posts",
    items: [
      { name: "Lit Logo", slug: "lit-logo" },
      { name: "Non-Lit Logo", slug: "non-lit-logo" },
      { name: "ACM Panel", slug: "acm-panel" },
      { name: "Coroplast Sign", slug: "coroplast" },
      { name: "Foam Board", slug: "foam-board" },
      { name: "Single Post Sign", slug: "single-post" },
      { name: "Double Post Sign", slug: "double-post" },
      { name: "Monument Sign", slug: "monument-base" },
    ],
  },
  {
    title: "Light Boxes",
    description: "Illuminated sign boxes",
    items: [
      { name: "Single Face Light Box", slug: "light-box-single" },
      { name: "Double Face Light Box", slug: "light-box-double" },
      { name: "Push-Through Light Box", slug: "light-box-push-through" },
    ],
  },
  {
    title: "Blade Signs",
    description: "Wall-projecting signs",
    items: [
      { name: "Rectangular Blade", slug: "blade-rectangular" },
      { name: "Round Blade", slug: "blade-round" },
    ],
  },
  {
    title: "Neon & Banners",
    description: "LED neon and vinyl banners",
    items: [
      { name: "LED Neon Sign", slug: "led-neon" },
      { name: "13oz Vinyl Banner", slug: "vinyl-banner-13oz" },
      { name: "15oz Heavy Duty Banner", slug: "vinyl-banner-15oz" },
      { name: "Mesh Banner", slug: "mesh-banner" },
    ],
  },
];

export { PRODUCT_CATEGORIES };

// ---------------------------------------------------------------------------
// Desktop Mega Menu (hover-triggered dropdown)
// ---------------------------------------------------------------------------

export function MegaMenuDesktop() {
  const [open, setOpen] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setOpen(true);
  };

  const handleLeave = () => {
    timeoutRef.current = setTimeout(() => setOpen(false), 150);
  };

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    if (open) document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {/* Trigger */}
      <button
        className="flex items-center gap-1 text-sm font-medium text-neutral-600 transition hover:text-neutral-900"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        Products
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-200",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Dropdown panel */}
      <div
        className={cn(
          "absolute -left-4 top-full z-50 pt-4 transition-all duration-200",
          open
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-2 opacity-0"
        )}
      >
        <div className="w-[1050px] rounded-xl border border-neutral-200 bg-white p-6 shadow-xl">
          <div className="grid grid-cols-8 gap-6">
            {PRODUCT_CATEGORIES.map((category) => (
              <div key={category.title}>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wider text-neutral-400">
                  {category.title}
                </h3>
                <p className="mb-3 text-[11px] text-neutral-400">
                  {category.description}
                </p>
                <ul className="space-y-1.5">
                  {category.items.map((item) => (
                    <li key={item.slug}>
                      <Link
                        href={`/configure/${item.slug}`}
                        className="group/item flex items-center gap-1 text-sm text-neutral-600 transition hover:text-blue-600"
                        onClick={() => setOpen(false)}
                      >
                        <ChevronRight className="h-3 w-3 text-neutral-300 transition group-hover/item:text-blue-500" />
                        {item.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div className="mt-5 flex items-center justify-between border-t border-neutral-100 pt-4">
            <Link
              href="/products"
              className="text-sm font-medium text-blue-600 transition hover:text-blue-700"
              onClick={() => setOpen(false)}
            >
              View All Products
            </Link>
            <span className="text-xs text-neutral-400">
              Design & price any sign in 3D
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mobile Mega Menu (accordion-style)
// ---------------------------------------------------------------------------

export function MegaMenuMobile({
  onNavigate,
}: {
  onNavigate: () => void;
}) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  return (
    <div className="space-y-1">
      <span className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
        Products
      </span>
      {PRODUCT_CATEGORIES.map((category) => {
        const isExpanded = expandedCategory === category.title;
        return (
          <div key={category.title}>
            <button
              className="flex w-full items-center justify-between rounded-md px-2 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
              onClick={() =>
                setExpandedCategory(isExpanded ? null : category.title)
              }
              aria-expanded={isExpanded}
            >
              {category.title}
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-neutral-400 transition-transform duration-200",
                  isExpanded && "rotate-180"
                )}
              />
            </button>

            {isExpanded && (
              <ul className="ml-4 space-y-1 pb-2">
                {category.items.map((item) => (
                  <li key={item.slug}>
                    <Link
                      href={`/configure/${item.slug}`}
                      className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm text-neutral-600 transition hover:bg-neutral-50 hover:text-blue-600"
                      onClick={onNavigate}
                    >
                      <ChevronRight className="h-3 w-3 text-neutral-300" />
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
      <Link
        href="/products"
        className="mt-1 block rounded-md px-2 py-2 text-sm font-medium text-blue-600 transition hover:bg-blue-50"
        onClick={onNavigate}
      >
        View All Products
      </Link>
    </div>
  );
}
