import { ImageResponse } from "next/og";
import { getProductBySlug } from "@/engine/product-definitions";

export const runtime = "edge";

export const alt = "GatSoft Signs - Custom Channel Letters";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function OGImage({
  params,
}: {
  params: Promise<{ productType: string }>;
}) {
  const { productType } = await params;
  const product = getProductBySlug(productType);

  const productName = product?.name ?? "Custom Sign";
  const startingPrice = product
    ? `Starting at $${product.pricingParams.minOrderPrice.toLocaleString()}`
    : "";
  const description = product?.description ?? "";

  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #18181b 0%, #27272a 50%, #3f3f46 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "60px 80px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Top: Branding */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              color: "#ffffff",
              fontSize: 32,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            GatSoft Signs
          </div>
          <div
            style={{
              color: "#a1a1aa",
              fontSize: 20,
              border: "1px solid #52525b",
              borderRadius: 8,
              padding: "8px 20px",
            }}
          >
            3D Configurator
          </div>
        </div>

        {/* Center: Product Info */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div
            style={{
              color: "#a1a1aa",
              fontSize: 22,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              fontWeight: 600,
            }}
          >
            Configure Your
          </div>
          <div
            style={{
              color: "#ffffff",
              fontSize: 72,
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.03em",
              maxWidth: 900,
            }}
          >
            {productName}
          </div>
          <div
            style={{
              color: "#a1a1aa",
              fontSize: 24,
              lineHeight: 1.5,
              maxWidth: 700,
            }}
          >
            {description.length > 120
              ? description.substring(0, 120) + "..."
              : description}
          </div>
        </div>

        {/* Bottom: Price & CTA */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              color: "#22c55e",
              fontSize: 28,
              fontWeight: 700,
            }}
          >
            {startingPrice}
          </div>
          <div
            style={{
              background: "#ffffff",
              color: "#18181b",
              fontSize: 22,
              fontWeight: 700,
              padding: "16px 40px",
              borderRadius: 12,
            }}
          >
            Design Your Sign Now
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
