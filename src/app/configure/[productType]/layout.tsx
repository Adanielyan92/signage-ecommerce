import type { Metadata } from "next";
import {
  channelLetterProducts,
  litShapeProducts,
  cabinetProducts,
  dimensionalProducts,
  logoProducts,
  printProducts,
  signPostProducts,
  getAnyProductBySlug,
} from "@/engine/product-definitions";

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ productType: string }>;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ productType: string }>;
}): Promise<Metadata> {
  const { productType } = await params;
  const product = getAnyProductBySlug(productType);

  if (!product) {
    return {
      title: "Product Not Found | GatSoft Signs",
      description: "The requested product could not be found.",
    };
  }

  const startingPrice = `$${product.pricingParams.minOrderPrice.toLocaleString()}`;

  return {
    title: `Configure ${product.name} | GatSoft Signs`,
    description: product.description,
    openGraph: {
      title: `Configure ${product.name} | GatSoft Signs`,
      description: product.description,
      type: "website",
      siteName: "GatSoft Signs",
      url: `https://gatsoftsigns.com/configure/${product.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `Configure ${product.name} | GatSoft Signs`,
      description: `Design your custom ${product.name} starting at ${startingPrice}. Real-time 3D preview with instant pricing.`,
    },
    alternates: {
      canonical: `https://gatsoftsigns.com/configure/${product.slug}`,
    },
  };
}

export async function generateStaticParams() {
  const allProducts = [
    ...channelLetterProducts,
    ...litShapeProducts,
    ...cabinetProducts,
    ...dimensionalProducts,
    ...logoProducts,
    ...printProducts,
    ...signPostProducts,
  ];
  return allProducts.map((product) => ({
    productType: product.slug,
  }));
}

export default async function ConfigureLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
