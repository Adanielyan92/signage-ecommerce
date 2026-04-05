// src/app/admin/stock-parts/page.tsx
import { requireAdmin } from "@/lib/admin-auth";
import { StockPartsGrid } from "@/components/admin/stock-parts-grid";

export const metadata = {
  title: "Stock Parts Library — Admin | GatSoft Signs",
};

export default async function StockPartsPage() {
  await requireAdmin();

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Stock 3D Parts Library</h1>
          <p className="text-muted-foreground mt-1">
            Browse and manage reusable 3D parts for sign assemblies.
          </p>
        </div>
      </div>
      <StockPartsGrid />
    </div>
  );
}
