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
