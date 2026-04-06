import { requireAdmin } from "@/lib/admin-auth";
import { WebhookList } from "@/components/admin/webhook-list";

export const metadata = { title: "Webhooks - Admin" };

export default async function WebhooksPage() {
  await requireAdmin();
  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Webhooks</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Configure webhook endpoints to receive event notifications for orders, payments, and designs.
      </p>
      <div className="mt-8">
        <WebhookList />
      </div>
    </div>
  );
}
