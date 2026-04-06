"use client";

import { useState, useEffect, useCallback } from "react";
import { SUPPORTED_CURRENCIES } from "@/lib/currency";
import { Save, Plus, Trash2 } from "lucide-react";

interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  updatedAt: string;
}

export function ExchangeRateForm() {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [newCurrency, setNewCurrency] = useState("");
  const [editRates, setEditRates] = useState<Record<string, string>>({});

  const fetchRates = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/admin/exchange-rates");
      if (res.ok) {
        const data = await res.json();
        setRates(data.rates);
        const edits: Record<string, string> = {};
        for (const rate of data.rates) {
          edits[rate.toCurrency] = String(rate.rate);
        }
        setEditRates(edits);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const handleSave = async (toCurrency: string) => {
    const rateValue = parseFloat(editRates[toCurrency]);
    if (isNaN(rateValue) || rateValue <= 0) return;

    setSaving(toCurrency);
    try {
      const res = await fetch("/api/v1/admin/exchange-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toCurrency, rate: rateValue }),
      });
      if (res.ok) {
        await fetchRates();
      }
    } finally {
      setSaving(null);
    }
  };

  const handleAddCurrency = () => {
    if (!newCurrency || editRates[newCurrency] !== undefined) return;
    setEditRates((prev) => ({ ...prev, [newCurrency]: "1.00" }));
    setNewCurrency("");
  };

  const handleRemoveRate = (toCurrency: string) => {
    setEditRates((prev) => {
      const next = { ...prev };
      delete next[toCurrency];
      return next;
    });
  };

  const usedCurrencies = new Set(Object.keys(editRates));
  const availableCurrencies = Object.keys(SUPPORTED_CURRENCIES).filter(
    (c) => c !== "USD" && !usedCurrencies.has(c),
  );

  if (loading) {
    return <div className="text-sm text-neutral-500">Loading exchange rates...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-left text-xs uppercase tracking-wider text-neutral-500">
              <th className="px-4 py-3">Currency</th>
              <th className="px-4 py-3">Rate (1 USD = ?)</th>
              <th className="px-4 py-3">Last Updated</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(editRates).map(([currency, rateStr]) => {
              const meta = SUPPORTED_CURRENCIES[currency];
              const existingRate = rates.find((r) => r.toCurrency === currency);
              return (
                <tr key={currency} className="border-b border-neutral-50">
                  <td className="px-4 py-3 font-medium text-neutral-900">
                    {meta?.symbol ?? currency} {meta?.name ?? currency}
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="number"
                      step="0.0001"
                      min="0"
                      value={rateStr}
                      onChange={(e) =>
                        setEditRates((prev) => ({ ...prev, [currency]: e.target.value }))
                      }
                      className="w-32 rounded-md border border-neutral-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-3 text-neutral-500">
                    {existingRate
                      ? new Date(existingRate.updatedAt).toLocaleDateString()
                      : "Not saved"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleSave(currency)}
                        disabled={saving === currency}
                        className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        <Save className="h-3 w-3" />
                        {saving === currency ? "Saving..." : "Save"}
                      </button>
                      <button
                        onClick={() => handleRemoveRate(currency)}
                        className="rounded-md p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {Object.keys(editRates).length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-neutral-400">
                  No exchange rates configured. Add a currency below.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add new currency */}
      {availableCurrencies.length > 0 && (
        <div className="flex items-center gap-2">
          <select
            value={newCurrency}
            onChange={(e) => setNewCurrency(e.target.value)}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Select currency...</option>
            {availableCurrencies.map((c) => (
              <option key={c} value={c}>
                {SUPPORTED_CURRENCIES[c]?.name ?? c} ({c})
              </option>
            ))}
          </select>
          <button
            onClick={handleAddCurrency}
            disabled={!newCurrency}
            className="inline-flex items-center gap-1 rounded-md border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add Currency
          </button>
        </div>
      )}
    </div>
  );
}
