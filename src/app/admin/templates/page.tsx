// src/app/admin/templates/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Copy,
  Pencil,
  Trash2,
  Loader2,
  LayoutTemplate,
  X,
} from "lucide-react";

interface TemplateData {
  id: string;
  name: string;
  description: string | null;
  category: string;
  slug: string;
  isPublic: boolean;
  createdAt: string;
}

export default function AdminTemplatesPage() {
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [cloning, setCloningId] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("CHANNEL_LETTERS");
  const [formDescription, setFormDescription] = useState("");
  const [formIsPublic, setFormIsPublic] = useState(false);

  const categories = [
    "CHANNEL_LETTERS",
    "LIT_SHAPES",
    "CABINET_SIGNS",
    "DIMENSIONAL_LETTERS",
    "LOGOS",
    "PRINT_SIGNS",
    "SIGN_POSTS",
    "LIGHT_BOX_SIGNS",
    "BLADE_SIGNS",
    "NEON_SIGNS",
    "VINYL_BANNERS",
  ];

  const fetchTemplates = () => {
    setLoading(true);
    fetch("/api/v1/templates")
      .then((res) => res.json())
      .then((data) => {
        setTemplates(data.templates ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleCreate = async () => {
    if (!formName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/v1/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          category: formCategory,
          description: formDescription || undefined,
          isPublic: formIsPublic,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setFormName("");
        setFormDescription("");
        fetchTemplates();
      }
    } finally {
      setCreating(false);
    }
  };

  const handleClone = async (templateId: string) => {
    setCloningId(templateId);
    try {
      const res = await fetch(`/api/v1/templates/${templateId}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Product "${data.product.name}" created from template.`);
      } else {
        alert(data.error || "Clone failed");
      }
    } finally {
      setCloningId(null);
    }
  };

  const handleDelete = async (templateId: string) => {
    if (!confirm("Delete this template?")) return;
    await fetch(`/api/v1/templates/${templateId}`, { method: "DELETE" });
    fetchTemplates();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Product Templates
        </h1>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New Template
        </button>
      </div>

      {/* Create dialog */}
      {showCreate && (
        <div className="mb-6 bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Create Template</h2>
            <button onClick={() => setShowCreate(false)}>
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Front-Lit Standard Template"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              rows={2}
            />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={formIsPublic}
                onChange={(e) => setFormIsPublic(e.target.checked)}
              />
              Public (visible to all tenants)
            </label>
            <button
              onClick={handleCreate}
              disabled={creating || !formName.trim()}
              className="ml-auto px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading templates...
        </div>
      )}

      {!loading && templates.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <LayoutTemplate className="h-12 w-12 mx-auto mb-4 text-gray-300" />
          <p>No templates yet. Create one to get started.</p>
        </div>
      )}

      {!loading && templates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-lg border border-gray-200 p-4"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-900">{t.name}</h3>
                  <p className="text-xs text-gray-500">
                    {t.category.replace(/_/g, " ")}
                  </p>
                </div>
                {t.isPublic && (
                  <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded">
                    Public
                  </span>
                )}
              </div>
              {t.description && (
                <p className="text-sm text-gray-600 mb-3">{t.description}</p>
              )}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <button
                  onClick={() => handleClone(t.id)}
                  disabled={cloning === t.id}
                  className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                  title="Clone into a new Product"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {cloning === t.id ? "Cloning..." : "Clone to Product"}
                </button>
                <button className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 ml-auto">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
