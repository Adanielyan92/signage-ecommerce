import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Products - GatSoft Signs",
  description:
    "Browse our full catalog of channel letters, lit shapes, cabinet signs, dimensional letters, logos, print signs, and sign posts. Design and price any sign in 3D.",
};

interface ProductItem {
  name: string;
  slug: string;
}

interface ProductCategoryData {
  title: string;
  description: string;
  startingPrice: number;
  color: string;
  hoverColor: string;
  iconLetter: string;
  items: ProductItem[];
}

const CATALOG: ProductCategoryData[] = [
  {
    title: "Channel Letters",
    description:
      "LED illuminated custom lettering for storefronts. Choose front-lit, back-lit, halo-lit, marquee, trimless, or non-lit styles.",
    startingPrice: 1360,
    color: "bg-blue-50 border-blue-200",
    hoverColor: "group-hover:bg-blue-100",
    iconLetter: "CL",
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
    description:
      "Single-piece LED lit shape signs contoured to your design or logo. Great for clouds, custom shapes, and brand icons.",
    startingPrice: 1500,
    color: "bg-purple-50 border-purple-200",
    hoverColor: "group-hover:bg-purple-100",
    iconLetter: "LS",
    items: [
      { name: "Cloud Sign", slug: "cloud-sign" },
      { name: "Logo Shape", slug: "logo-shape" },
    ],
  },
  {
    title: "Cabinet Signs",
    description:
      "Illuminated cabinet signage in single or double face, rectangular or custom-shaped configurations.",
    startingPrice: 1500,
    color: "bg-amber-50 border-amber-200",
    hoverColor: "group-hover:bg-amber-100",
    iconLetter: "CS",
    items: [
      { name: "Single Face", slug: "single-face-squared" },
      { name: "Double Face", slug: "double-face-squared" },
      { name: "Shaped Single", slug: "single-face-shaped" },
      { name: "Shaped Double", slug: "double-face-shaped" },
    ],
  },
  {
    title: "Dimensional Letters",
    description:
      "Non-illuminated 3D lettering in acrylic, painted metal, brushed metal, or flat-cut aluminum finishes.",
    startingPrice: 800,
    color: "bg-emerald-50 border-emerald-200",
    hoverColor: "group-hover:bg-emerald-100",
    iconLetter: "DL",
    items: [
      { name: "Acrylic", slug: "acrylic" },
      { name: "Painted Metal", slug: "painted-metal" },
      { name: "Brushed Metal", slug: "brushed-metal" },
      { name: "Flat-Cut Aluminum", slug: "flat-cut-aluminum" },
    ],
  },
  {
    title: "Logo Signs",
    description:
      "Custom logo signage, available in LED illuminated or non-lit dimensional finishes built to your exact artwork.",
    startingPrice: 800,
    color: "bg-rose-50 border-rose-200",
    hoverColor: "group-hover:bg-rose-100",
    iconLetter: "LG",
    items: [
      { name: "Lit Logo", slug: "lit-logo" },
      { name: "Non-Lit Logo", slug: "non-lit-logo" },
    ],
  },
  {
    title: "Print Signs",
    description:
      "Printed signage on durable materials, from ACM panels for outdoor use to lightweight coroplast and foam board for displays.",
    startingPrice: 100,
    color: "bg-sky-50 border-sky-200",
    hoverColor: "group-hover:bg-sky-100",
    iconLetter: "PS",
    items: [
      { name: "ACM Panel", slug: "acm-panel" },
      { name: "Coroplast Sign", slug: "coroplast" },
      { name: "Foam Board", slug: "foam-board" },
    ],
  },
  {
    title: "Sign Posts",
    description:
      "Freestanding sign structures including single post, double post, and ground-level monument base signs.",
    startingPrice: 600,
    color: "bg-orange-50 border-orange-200",
    hoverColor: "group-hover:bg-orange-100",
    iconLetter: "SP",
    items: [
      { name: "Single Post Sign", slug: "single-post" },
      { name: "Double Post Sign", slug: "double-post" },
      { name: "Monument Sign", slug: "monument-base" },
    ],
  },
];

function CategoryCard({ category }: { category: ProductCategoryData }) {
  return (
    <div className="group rounded-xl border border-neutral-200 bg-white shadow-sm transition-all duration-200 hover:shadow-lg hover:border-neutral-300">
      {/* Header */}
      <div className={`flex items-start gap-4 rounded-t-xl border-b p-6 transition-colors ${category.color} ${category.hoverColor}`}>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-white/70 text-lg font-bold text-neutral-700 shadow-sm">
          {category.iconLetter}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-xl font-semibold text-neutral-900">
            {category.title}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-neutral-600">
            {category.description}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-white/80 px-3 py-1 text-sm font-medium text-neutral-700 shadow-sm">
              From {formatPrice(category.startingPrice)}
            </span>
            <span className="text-xs text-neutral-500">
              {category.items.length} {category.items.length === 1 ? "type" : "types"}
            </span>
          </div>
        </div>
      </div>

      {/* Product list */}
      <div className="p-4">
        <ul className="space-y-1">
          {category.items.map((item) => (
            <li key={item.slug}>
              <Link
                href={`/configure/${item.slug}`}
                className="group/item flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-neutral-50"
              >
                <span className="font-medium text-neutral-700 transition group-hover/item:text-neutral-900">
                  {item.name}
                </span>
                <span className="flex items-center gap-1 text-xs font-medium text-blue-600 opacity-0 transition group-hover/item:opacity-100">
                  Design & Price
                  <ArrowRight className="h-3 w-3" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Page header */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
          All Products
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-600">
          Browse our full catalog of custom signage. Every product can be designed
          in 3D with instant pricing. Pick a category below to get started.
        </p>
      </div>

      {/* Category grid */}
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
        {CATALOG.map((category) => (
          <CategoryCard key={category.title} category={category} />
        ))}
      </div>

      {/* CTA */}
      <div className="mt-16 rounded-xl border border-blue-100 bg-blue-50 p-8 text-center">
        <h2 className="text-xl font-semibold text-blue-900">
          Need a custom quote?
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-blue-700">
          For pylon signs, monument signs, lightboxes, or other custom signage
          projects, contact us for a personalized quote.
        </p>
        <button className="mt-4 rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700">
          Request Custom Quote
        </button>
      </div>
    </div>
  );
}
