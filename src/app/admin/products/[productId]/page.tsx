import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import type { OptionDef } from "@/components/admin/option-editor";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const admin = await requireAdmin();
  const { productId } = await params;

  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId: admin.tenantId },
  });

  if (!product) {
    notFound();
  }

  // Extract options from productSchema JSON
  const productSchema = product.productSchema as
    | { options?: unknown[] }
    | null;
  const rawOptions: unknown[] = productSchema?.options ?? [];

  const options: OptionDef[] = rawOptions.map((raw) => {
    const o = raw as Record<string, unknown>;
    return {
      id: typeof o.id === "string" ? o.id : crypto.randomUUID(),
      type: (["text", "number", "select", "color", "toggle", "font-picker"].includes(
        o.type as string
      )
        ? o.type
        : "text") as OptionDef["type"],
      label: typeof o.label === "string" ? o.label : "",
      required: typeof o.required === "boolean" ? o.required : false,
      defaultValue: typeof o.defaultValue === "string" ? o.defaultValue : "",
      values: Array.isArray(o.values)
        ? (o.values as { value: string; label?: string }[])
        : [],
      dependsOn:
        o.dependsOn && typeof o.dependsOn === "object" && !Array.isArray(o.dependsOn)
          ? (o.dependsOn as Record<string, string[]>)
          : {},
    };
  });

  // Extract renderPipeline from renderConfig JSON
  const renderConfig = product.renderConfig as { pipeline?: string } | null;
  const renderPipeline = renderConfig?.pipeline ?? "text-to-3d";

  // Extract pricingParams
  const pricingParams =
    product.pricingParams &&
    typeof product.pricingParams === "object" &&
    !Array.isArray(product.pricingParams)
      ? (product.pricingParams as Record<string, number>)
      : {};

  const initialData = {
    name: product.name,
    slug: product.slug,
    description: product.description ?? "",
    category: product.category,
    isActive: product.isActive,
    options,
    pricingFormulaId: product.pricingFormulaId ?? null,
    pricingParams,
    renderPipeline,
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-neutral-900">Edit Product</h1>
      <ProductForm productId={product.id} initialData={initialData} />
    </div>
  );
}
