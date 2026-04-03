import Link from "next/link";
import type { ChannelLetterProduct } from "@/engine/product-definitions";
import { formatPrice } from "@/lib/utils";

const PRODUCT_IMAGES: Record<string, string> = {
  "front-lit-trim-cap": "/images/front-lit.jpg",
  trimless: "/images/trimless.jpg",
  "marquee-letters": "/images/marquee.jpg",
  "back-lit": "/images/back-lit.jpg",
  "halo-lit": "/images/halo-lit.jpg",
  "non-lit": "/images/non-lit.jpg",
};

export function ProductCard({ product }: { product: ChannelLetterProduct }) {
  const startingPrice = product.pricingParams.basePricePerInch;

  return (
    <Link
      href={`/configure/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition hover:shadow-md"
    >
      {/* Image placeholder */}
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-neutral-100 to-neutral-200">
        <div className="flex h-full items-center justify-center">
          <span className="text-4xl font-bold text-neutral-300 transition group-hover:text-neutral-400">
            {product.name
              .split(" ")
              .map((w) => w[0])
              .join("")}
          </span>
        </div>
        <div className="absolute bottom-3 left-3 rounded-full bg-blue-600 px-3 py-1 text-xs font-medium text-white">
          From {formatPrice(startingPrice)}/inch
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-1 flex-col p-5">
        <h3 className="text-lg font-semibold text-neutral-900 group-hover:text-blue-600">
          {product.name}
        </h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-neutral-500">
          {product.description}
        </p>
        <div className="mt-4">
          <span className="inline-flex items-center rounded-lg bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 transition group-hover:bg-blue-100">
            Configure & Price
          </span>
        </div>
      </div>
    </Link>
  );
}
