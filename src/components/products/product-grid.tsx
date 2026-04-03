import { channelLetterProducts } from "@/engine/product-definitions";
import { ProductCard } from "./product-card";

export function ProductGrid() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {channelLetterProducts.map((product) => (
        <ProductCard key={product.slug} product={product} />
      ))}
    </div>
  );
}
