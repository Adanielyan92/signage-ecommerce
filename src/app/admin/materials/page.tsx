// src/app/admin/materials/page.tsx
import { requireAdmin } from "@/lib/admin-auth";
import { MaterialsManager } from "@/components/admin/materials-manager";

export const metadata = {
  title: "Material Presets — Admin | GatSoft Signs",
};

export default async function MaterialsPage() {
  await requireAdmin();

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Material Presets</h1>
        <p className="text-muted-foreground mt-1">
          Define Three.js material properties for 3D sign rendering. Platform presets are available to all tenants.
        </p>
      </div>
      <MaterialsManager />
    </div>
  );
}
