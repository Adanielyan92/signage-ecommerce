// src/app/admin/fonts/page.tsx
import { requireAdmin } from "@/lib/admin-auth";
import { FontManager } from "@/components/admin/font-manager";

export const metadata = {
  title: "Font Management — Admin | GatSoft Signs",
};

export default async function FontsPage() {
  await requireAdmin();

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Font Management</h1>
        <p className="text-muted-foreground mt-1">
          Manage available fonts for sign text. Platform fonts are shared; upload custom TTF files for your shop.
        </p>
      </div>
      <FontManager />
    </div>
  );
}
