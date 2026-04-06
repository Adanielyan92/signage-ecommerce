"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Award, ShieldOff } from "lucide-react";

interface Manufacturer {
  id: string;
  name: string;
  slug: string;
  city: string | null;
  state: string | null;
  capabilities: string[];
  isVerified: boolean;
  isActive: boolean;
  featuredOrder: number | null;
}

export function ManufacturerAdminList() {
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", slug: "", city: "", state: "", capabilities: "" });

  const fetchManufacturers = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/manufacturers");
      if (res.ok) {
        const data = await res.json();
        setManufacturers(data.manufacturers);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchManufacturers(); }, [fetchManufacturers]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/v1/manufacturers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.name,
        slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, "-"),
        city: formData.city || undefined,
        state: formData.state || undefined,
        capabilities: formData.capabilities.split(",").map((s) => s.trim()).filter(Boolean),
      }),
    });
    setShowForm(false);
    setFormData({ name: "", slug: "", city: "", state: "", capabilities: "" });
    fetchManufacturers();
  };

  const handleToggleVerified = async (id: string, isVerified: boolean) => {
    await fetch(`/api/v1/manufacturers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isVerified: !isVerified }),
    });
    fetchManufacturers();
  };

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await fetch(`/api/v1/manufacturers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    fetchManufacturers();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this manufacturer?")) return;
    await fetch(`/api/v1/manufacturers/${id}`, { method: "DELETE" });
    fetchManufacturers();
  };

  if (loading) return <div className="text-sm text-neutral-500">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          Add Manufacturer
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="rounded-lg border border-neutral-200 bg-white p-4 space-y-3">
          <input placeholder="Name" value={formData.name} onChange={(e) => setFormData((d) => ({ ...d, name: e.target.value }))} required className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          <input placeholder="Slug (auto-generated)" value={formData.slug} onChange={(e) => setFormData((d) => ({ ...d, slug: e.target.value }))} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <input placeholder="City" value={formData.city} onChange={(e) => setFormData((d) => ({ ...d, city: e.target.value }))} className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm" />
            <input placeholder="State" value={formData.state} onChange={(e) => setFormData((d) => ({ ...d, state: e.target.value }))} className="w-20 rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          </div>
          <input placeholder="Capabilities (comma-separated)" value={formData.capabilities} onChange={(e) => setFormData((d) => ({ ...d, capabilities: e.target.value }))} className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm" />
          <div className="flex gap-2">
            <button type="submit" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Create</button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50">Cancel</button>
          </div>
        </form>
      )}

      <div className="rounded-lg border border-neutral-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-100 text-left text-xs uppercase tracking-wider text-neutral-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Verified</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {manufacturers.map((m) => (
              <tr key={m.id} className="border-b border-neutral-50">
                <td className="px-4 py-3 font-medium text-neutral-900">{m.name}</td>
                <td className="px-4 py-3 text-neutral-500">{[m.city, m.state].filter(Boolean).join(", ") || "—"}</td>
                <td className="px-4 py-3">
                  <button onClick={() => handleToggleVerified(m.id, m.isVerified)} title={m.isVerified ? "Remove verification" : "Verify"}>
                    {m.isVerified ? <Award className="h-4 w-4 text-green-600" /> : <ShieldOff className="h-4 w-4 text-neutral-300" />}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <button onClick={() => handleToggleActive(m.id, m.isActive)} className={`rounded-full px-2 py-0.5 text-xs font-medium ${m.isActive ? "bg-green-50 text-green-700" : "bg-neutral-100 text-neutral-500"}`}>
                    {m.isActive ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => handleDelete(m.id)} className="rounded-md p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
            {manufacturers.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-neutral-400">No manufacturers yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
