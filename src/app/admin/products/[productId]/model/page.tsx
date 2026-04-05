import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ModelBuilder } from "@/components/admin/model-builder/model-builder";
import type { RenderConfig } from "@/types/schema";

export default async function ModelBuilderPage({
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

  // Extract render config
  const rawRenderConfig = product.renderConfig as Record<string, unknown> | null;
  const renderConfig: RenderConfig & { modelUrl?: string } = {
    pipeline: (rawRenderConfig?.pipeline as RenderConfig["pipeline"]) ?? "part-assembly",
    meshBindings: (rawRenderConfig?.meshBindings as RenderConfig["meshBindings"]) ?? {},
    ...(rawRenderConfig?.modelUrl ? { modelUrl: rawRenderConfig.modelUrl as string } : {}),
  };

  // Extract product options for binding dropdowns
  const productSchema = product.productSchema as { options?: unknown[] } | null;
  const rawOptions: unknown[] = productSchema?.options ?? [];
  const productOptions = rawOptions.map((raw) => {
    const o = raw as { id?: string; label?: string };
    return {
      id: typeof o.id === "string" ? o.id : "unknown",
      label: typeof o.label === "string" ? o.label : "Unknown Option",
    };
  });

  return (
    <ModelBuilder
      productId={product.id}
      productName={product.name}
      productOptions={productOptions}
      initialRenderConfig={renderConfig}
    />
  );
}
