"use client";

import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface Delivery {
  id: string;
  event: string;
  payload: unknown;
  responseStatus: number | null;
  responseBody: string | null;
  error: string | null;
  attempt: number;
  maxAttempts: number;
  deliveredAt: string | null;
  createdAt: string;
}

export function WebhookDeliveryLog({ webhookId }: { webhookId: string }) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/v1/admin/webhooks/${webhookId}/deliveries`);
        if (res.ok) {
          const data = await res.json();
          setDeliveries(data.deliveries);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [webhookId]);

  if (loading) {
    return <div className="text-xs text-neutral-500">Loading deliveries...</div>;
  }

  if (deliveries.length === 0) {
    return <div className="text-xs text-neutral-400">No deliveries yet.</div>;
  }

  return (
    <div className="max-h-80 overflow-y-auto rounded-md border border-neutral-200 bg-white">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-neutral-100 text-left uppercase tracking-wider text-neutral-500">
            <th className="px-3 py-2">Event</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Response</th>
            <th className="px-3 py-2">Attempt</th>
            <th className="px-3 py-2">Time</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody>
          {deliveries.map((d) => (
            <>
              <tr key={d.id} className="border-b border-neutral-50 hover:bg-neutral-50">
                <td className="px-3 py-2 font-medium">{d.event}</td>
                <td className="px-3 py-2">
                  {d.deliveredAt ? (
                    <span className="inline-flex items-center rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-700">
                      Delivered
                    </span>
                  ) : d.error ? (
                    <span className="inline-flex items-center rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                      Failed
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-yellow-50 px-1.5 py-0.5 text-[10px] font-medium text-yellow-700">
                      Pending
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-neutral-500">
                  {d.responseStatus ?? "—"}
                </td>
                <td className="px-3 py-2 text-neutral-500">
                  {d.attempt}/{d.maxAttempts}
                </td>
                <td className="px-3 py-2 text-neutral-400">
                  {new Date(d.createdAt).toLocaleString()}
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => setExpandedId(expandedId === d.id ? null : d.id)}
                    className="text-neutral-400 hover:text-neutral-600"
                  >
                    {expandedId === d.id ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </button>
                </td>
              </tr>
              {expandedId === d.id && (
                <tr key={`${d.id}-detail`}>
                  <td colSpan={6} className="bg-neutral-50 px-3 py-3">
                    <div className="space-y-2">
                      {d.error && (
                        <div>
                          <span className="font-medium text-red-600">Error:</span>{" "}
                          <span className="text-neutral-600">{d.error}</span>
                        </div>
                      )}
                      <div>
                        <span className="font-medium text-neutral-600">Payload:</span>
                        <pre className="mt-1 max-h-32 overflow-auto rounded bg-neutral-900 p-2 text-[10px] text-green-400">
                          {JSON.stringify(d.payload, null, 2)}
                        </pre>
                      </div>
                      {d.responseBody && (
                        <div>
                          <span className="font-medium text-neutral-600">Response:</span>
                          <pre className="mt-1 max-h-32 overflow-auto rounded bg-neutral-900 p-2 text-[10px] text-neutral-300">
                            {d.responseBody}
                          </pre>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
