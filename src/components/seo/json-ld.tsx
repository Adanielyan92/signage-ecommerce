import type { ChannelLetterProduct } from "@/engine/product-definitions";

interface ProductJsonLdProps {
  product: ChannelLetterProduct;
}

export function ProductJsonLd({ product }: ProductJsonLdProps) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    brand: {
      "@type": "Brand",
      name: "GatSoft Signs",
    },
    url: `https://gatsoftsigns.com/configure/${product.slug}`,
    image: `https://gatsoftsigns.com/configure/${product.slug}/opengraph-image`,
    category: "Signage & Channel Letters",
    offers: {
      "@type": "Offer",
      priceCurrency: "USD",
      price: product.pricingParams.minOrderPrice,
      priceValidUntil: new Date(
        new Date().getFullYear() + 1,
        0,
        1
      ).toISOString().split("T")[0],
      availability: "https://schema.org/InStock",
      url: `https://gatsoftsigns.com/configure/${product.slug}`,
      seller: {
        "@type": "Organization",
        name: "GatSoft Signs",
      },
    },
    additionalProperty: [
      {
        "@type": "PropertyValue",
        name: "Base Price Per Inch",
        value: `$${product.pricingParams.basePricePerInch}`,
      },
      {
        "@type": "PropertyValue",
        name: "Large Size Price Per Inch",
        value: `$${product.pricingParams.largeSizePricePerInch}`,
      },
      {
        "@type": "PropertyValue",
        name: "Large Size Threshold",
        value: `${product.pricingParams.largeSizeThreshold}"`,
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}

export function OrganizationJsonLd() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "GatSoft Signs",
    url: "https://gatsoftsigns.com",
    logo: "https://gatsoftsigns.com/logo.png",
    description:
      "Premium custom channel letters and 3D signage for businesses. Design your sign with our real-time 3D configurator and get instant pricing.",
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer service",
      email: "orders@gatsoftsigns.com",
      availableLanguage: "English",
    },
    sameAs: [],
    address: {
      "@type": "PostalAddress",
      addressCountry: "US",
    },
    makesOffer: [
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "Custom Channel Letter Manufacturing",
          description:
            "Design and manufacture custom illuminated channel letters for business signage.",
        },
      },
      {
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: "3D Sign Design",
          description:
            "Interactive 3D sign configurator with real-time preview and instant pricing.",
        },
      },
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  );
}
