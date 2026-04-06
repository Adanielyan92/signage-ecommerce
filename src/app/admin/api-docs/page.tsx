import { requireAdmin } from "@/lib/admin-auth";
import { ApiDocsContent } from "@/components/admin/api-docs-content";

export const metadata = { title: "API Documentation - Admin" };

export default async function ApiDocsPage() {
  await requireAdmin();
  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">API Documentation</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Reference for all v1 REST API endpoints. Use your API key for authentication from external integrations.
      </p>
      <div className="mt-8">
        <ApiDocsContent />
      </div>
    </div>
  );
}
