import { requireAdmin } from "@/lib/admin-auth";
import { ProductForm } from "@/components/admin/product-form";

export default async function NewProductPage() {
  await requireAdmin();
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-neutral-900">Create Product</h1>
      <ProductForm />
    </div>
  );
}
