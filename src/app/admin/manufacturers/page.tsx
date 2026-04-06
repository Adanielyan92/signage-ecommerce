import { requireAdmin } from "@/lib/admin-auth";
import { ManufacturerAdminList } from "@/components/admin/manufacturer-admin-list";

export const metadata = { title: "Manufacturers - Admin" };

export default async function ManufacturersAdminPage() {
  await requireAdmin();
  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Manufacturers</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Manage manufacturer listings in the public directory.
      </p>
      <div className="mt-8">
        <ManufacturerAdminList />
      </div>
    </div>
  );
}
