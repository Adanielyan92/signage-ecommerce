"use client";

import { useState } from "react";
import { X, Copy, Check } from "lucide-react";

const WEBHOOK_EVENTS = [
  { id: "order.created", label: "Order Created" },
  { id: "order.paid", label: "Order Paid" },
  { id: "order.files_ready", label: "Files Ready" },
  { id: "design.saved", label: "Design Saved" },
] as const;

interface WebhookFormProps {
  onClose: () => void;
  onCreated: () => void;
}

export function WebhookForm({ onClose, onCreated }: WebhookFormProps) {
  const [url, setUrl] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSecret, setCreatedSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const toggleEvent = (eventId: string) => {
    setEvents((prev) =>
      prev.includes(eventId) ? prev.filter((e) => e !== eventId) : [...prev, eventId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url || events.length === 0) return;

    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/admin/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, events }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }

      const data = await res.json();
      setCreatedSecret(data.webhook.secret);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create webhook");
    } finally {
      setSaving(false);
    }
  };

  const handleCopySecret = async () => {
    if (!createdSecret) return;
    await navigator.clipboard.writeText(createdSecret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Show secret after creation
  if (createdSecret) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6">
        <h3 className="text-sm font-semibold text-green-900">Webhook Created</h3>
        <p className="mt-1 text-xs text-green-700">
          Copy your signing secret now. It will not be shown again.
        </p>
        <div className="mt-3 flex items-center gap-2">
          <code className="flex-1 rounded-md bg-white px-3 py-2 font-mono text-xs text-neutral-800">
            {createdSecret}
          </code>
          <button
            onClick={handleCopySecret}
            className="rounded-md bg-white p-2 text-neutral-500 hover:text-neutral-700"
          >
            {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
        <button
          onClick={onCreated}
          className="mt-4 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Done
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">Create Webhook</h3>
        <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="block text-xs font-medium text-neutral-600">Endpoint URL</label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-server.com/webhooks"
            required
            className="mt-1 w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-neutral-600">Events</label>
          <div className="mt-2 space-y-2">
            {WEBHOOK_EVENTS.map((event) => (
              <label key={event.id} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={events.includes(event.id)}
                  onChange={() => toggleEvent(event.id)}
                  className="rounded border-neutral-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-neutral-700">{event.label}</span>
                <span className="text-xs text-neutral-400">({event.id})</span>
              </label>
            ))}
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !url || events.length === 0}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Webhook"}
          </button>
        </div>
      </form>
    </div>
  );
}
