"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, ToggleLeft, ToggleRight, ChevronDown, ChevronUp } from "lucide-react";
import { WebhookForm } from "./webhook-form";
import { WebhookDeliveryLog } from "./webhook-delivery-log";

interface Webhook {
  id: string;
  url: string;
  secret: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
  _count: { deliveries: number };
}

const EVENT_LABELS: Record<string, string> = {
  "order.created": "Order Created",
  "order.paid": "Order Paid",
  "order.files_ready": "Files Ready",
  "design.saved": "Design Saved",
};

export function WebhookList() {
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchWebhooks = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/admin/webhooks");
      if (res.ok) {
        const data = await res.json();
        setWebhooks(data.webhooks);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  const handleToggle = async (id: string, isActive: boolean) => {
    await fetch(`/api/v1/admin/webhooks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    fetchWebhooks();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this webhook? This cannot be undone.")) return;
    await fetch(`/api/v1/admin/webhooks/${id}`, { method: "DELETE" });
    fetchWebhooks();
  };

  if (loading) {
    return <div className="text-sm text-neutral-500">Loading webhooks...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Create Webhook
        </button>
      </div>

      {showForm && (
        <WebhookForm
          onClose={() => setShowForm(false)}
          onCreated={() => {
            setShowForm(false);
            fetchWebhooks();
          }}
        />
      )}

      {webhooks.length === 0 ? (
        <div className="rounded-lg border border-neutral-200 bg-white p-12 text-center">
          <p className="text-neutral-500">No webhooks configured yet.</p>
          <p className="mt-1 text-sm text-neutral-400">
            Create a webhook to receive event notifications.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-left text-xs uppercase tracking-wider text-neutral-500">
                <th className="px-4 py-3">URL</th>
                <th className="px-4 py-3">Events</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Deliveries</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {webhooks.map((webhook) => (
                <>
                  <tr key={webhook.id} className="border-b border-neutral-50">
                    <td className="max-w-[200px] truncate px-4 py-3 font-mono text-xs text-neutral-700">
                      {webhook.url}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {webhook.events.map((event) => (
                          <span
                            key={event}
                            className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-medium text-blue-700"
                          >
                            {EVENT_LABELS[event] ?? event}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggle(webhook.id, webhook.isActive)}
                        className="flex items-center gap-1"
                      >
                        {webhook.isActive ? (
                          <>
                            <ToggleRight className="h-5 w-5 text-green-600" />
                            <span className="text-xs text-green-700">Active</span>
                          </>
                        ) : (
                          <>
                            <ToggleLeft className="h-5 w-5 text-neutral-400" />
                            <span className="text-xs text-neutral-500">Inactive</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-neutral-500">
                      <button
                        onClick={() => setExpandedId(expandedId === webhook.id ? null : webhook.id)}
                        className="inline-flex items-center gap-1 text-xs hover:text-neutral-700"
                      >
                        {webhook._count.deliveries}
                        {expandedId === webhook.id ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(webhook.id)}
                        className="rounded-md p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                  {expandedId === webhook.id && (
                    <tr key={`${webhook.id}-deliveries`}>
                      <td colSpan={5} className="bg-neutral-50 px-4 py-4">
                        <WebhookDeliveryLog webhookId={webhook.id} />
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
