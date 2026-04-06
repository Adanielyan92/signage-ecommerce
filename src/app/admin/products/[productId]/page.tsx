import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ProductForm } from "@/components/admin/product-form";
import type { OptionDef } from "@/components/admin/option-editor";
import type { OptionPricingRule } from "@/types/product";

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
      id: typeof o.id === "string" ? o.id : typeof o.optionKey === "string" ? o.optionKey : crypto.randomUUID(),
      type: (["text", "number", "select", "color", "toggle", "font-picker"].includes(
        (o.type ?? o.inputType) as string
      )
        ? (o.type ?? o.inputType)
        : "text") as OptionDef["type"],
      label: typeof o.label === "string" ? o.label : "",
      required: typeof o.required === "boolean" ? o.required : false,
      defaultValue: typeof o.defaultValue === "string" ? o.defaultValue : "",
      values: Array.isArray(o.values)
        ? (o.values as { value: string; label?: string }[])
        : Array.isArray(o.possibleValues)
          ? (o.possibleValues as { value: string; label?: string }[])
          : [],
      dependsOn:
        o.dependsOn && typeof o.dependsOn === "object" && !Array.isArray(o.dependsOn)
          ? (o.dependsOn as Record<string, string[]>)
          : {},
    };
  });

  // Extract renderPipeline, modelUrl, and extra fields from renderConfig JSON
  const renderConfig = product.renderConfig as Record<string, unknown> | null;
  const renderPipeline = (renderConfig?.pipeline as string) ?? "text-to-3d";
  const modelUrl = (renderConfig?.modelUrl as string) ?? null;

  // Preserve extra renderConfig fields (meshBindings, assemblyBindings, etc.)
  const { pipeline: _p, modelUrl: _m, ...renderConfigExtra } = renderConfig ?? {};

  // Extract pricingParams and pricingRules
  const rawPricingParams =
    product.pricingParams &&
    typeof product.pricingParams === "object" &&
    !Array.isArray(product.pricingParams)
      ? (product.pricingParams as Record<string, unknown>)
      : {};

  // Separate rules from numeric params
  const pricingRules: OptionPricingRule[] = Array.isArray(rawPricingParams.rules)
    ? (rawPricingParams.rules as OptionPricingRule[])
    : [];

  const pricingParams: Record<string, number> = {};
  for (const [key, val] of Object.entries(rawPricingParams)) {
    if (key !== "rules" && typeof val === "number") {
      pricingParams[key] = val;
    }
  }

  const initialData = {
    name: product.name,
    slug: product.slug,
    description: product.description ?? "",
    category: product.category,
    isActive: product.isActive,
    options,
    pricingFormulaId: product.pricingFormulaId ?? null,
    pricingParams,
    pricingRules,
    renderPipeline,
    modelUrl,
    renderConfigExtra,
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-neutral-900">Edit Product</h1>
      <ProductForm productId={product.id} initialData={initialData} />
    </div>
  );
}
