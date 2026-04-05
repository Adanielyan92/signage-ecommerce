import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const metadata = {
  title: "Products — Admin | GatSoft Signs",
};

export default async function AdminProductsPage() {
  const admin = await requireAdmin();

  const products = await prisma.product.findMany({
    where: { tenantId: admin.tenantId },
    include: { pricingFormula: true },
    orderBy: [{ category: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
  });

  // Group by category
  const grouped = products.reduce<Record<string, typeof products>>(
    (acc, product) => {
      const key = product.category;
      if (!acc[key]) acc[key] = [];
      acc[key].push(product);
      return acc;
    },
    {}
  );

  const categories = Object.keys(grouped).sort();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">Products</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {products.length} product{products.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
        >
          <Plus className="h-4 w-4" />
          New Product
        </Link>
      </div>

      {/* Empty state */}
      {categories.length === 0 && (
        <div className="rounded-xl border border-dashed border-neutral-300 bg-white py-16 text-center">
          <p className="text-sm text-neutral-500">No products yet.</p>
          <Link
            href="/admin/products/new"
            className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            <Plus className="h-4 w-4" />
            Add your first product
          </Link>
        </div>
      )}

      {/* Category tables */}
      {categories.map((category) => (
        <section key={category}>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
            {category.replace(/_/g, " ")}
          </h2>
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50">
                  <th className="px-4 py-3 text-left font-medium text-neutral-600">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-neutral-600">
                    Slug
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-neutral-600">
                    Formula
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-neutral-600">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-neutral-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {grouped[category].map((product) => (
                  <tr
                    key={product.id}
                    className="transition-colors hover:bg-neutral-50"
                  >
                    <td className="px-4 py-3 font-medium text-neutral-900">
                      {product.name}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-neutral-500">
                      {product.slug}
                    </td>
                    <td className="px-4 py-3 text-neutral-600">
                      {product.pricingFormula?.name ?? (
                        <span className="text-neutral-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {product.isActive ? (
                        <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/products/${product.id}`}
                        className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-blue-600 transition-colors hover:bg-blue-50 hover:text-blue-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
