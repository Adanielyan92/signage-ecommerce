"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { FormulaPicker } from "./formula-picker";
import { PricingParamsEditor } from "./pricing-params-editor";
import { OptionBuilder } from "./option-builder";
import type { OptionDef } from "./option-editor";
import type { ProductCategory } from "@/types/product";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TenantFormula {
  id: string;
  name: string;
  type: string;
  presetId: string | null;
}

interface FormulaVariable {
  name: string;
  label: string;
  source: string;
  description: string;
}

interface Preset {
  id: string;
  name: string;
  description: string;
  variables: FormulaVariable[];
}

interface ProductFormProps {
  productId?: string;
  initialData?: {
    name: string;
    slug: string;
    description: string;
    category: string;
    isActive: boolean;
    options: OptionDef[];
    pricingFormulaId: string | null;
    pricingParams: Record<string, number>;
    renderPipeline: string;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: { value: ProductCategory; label: string }[] = [
  { value: "CHANNEL_LETTERS", label: "Channel Letters" },
  { value: "LIT_SHAPES", label: "Lit Shapes" },
  { value: "CABINET_SIGNS", label: "Cabinet Signs" },
  { value: "DIMENSIONAL_LETTERS", label: "Dimensional Letters" },
  { value: "LOGOS", label: "Logos" },
  { value: "PRINT_SIGNS", label: "Print Signs" },
  { value: "SIGN_POSTS", label: "Sign Posts" },
  { value: "LIGHT_BOX_SIGNS", label: "Light Box Signs" },
  { value: "BLADE_SIGNS", label: "Blade Signs" },
  { value: "NEON_SIGNS", label: "Neon Signs" },
  { value: "VINYL_BANNERS", label: "Vinyl Banners" },
  { value: "ACCESSORIES", label: "Accessories" },
];

const RENDER_PIPELINES = [
  { value: "text-to-3d", label: "Text to 3D" },
  { value: "part-assembly", label: "Part Assembly" },
  { value: "flat-2d", label: "Flat 2D" },
];

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ProductForm({ productId, initialData }: ProductFormProps) {
  const router = useRouter();
  const isEditing = Boolean(productId);

  // Form state
  const [name, setName] = useState(initialData?.name ?? "");
  const [slug, setSlug] = useState(initialData?.slug ?? "");
  const [description, setDescription] = useState(initialData?.description ?? "");
  const [category, setCategory] = useState<string>(
    initialData?.category ?? "CHANNEL_LETTERS"
  );
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true);
  const [renderPipeline, setRenderPipeline] = useState(
    initialData?.renderPipeline ?? "text-to-3d"
  );
  const [pricingFormulaId, setPricingFormulaId] = useState<string | null>(
    initialData?.pricingFormulaId ?? null
  );
  const [pricingParams, setPricingParams] = useState<Record<string, number>>(
    initialData?.pricingParams ?? {}
  );
  const [options, setOptions] = useState<OptionDef[]>(
    initialData?.options ?? []
  );

  // Formula data
  const [tenantFormulas, setTenantFormulas] = useState<TenantFormula[]>([]);
  const [presets, setPresets] = useState<Preset[]>([]);

  // UI state
  const [saving, setSaving] = useState(false);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(isEditing);

  // Auto-generate slug from name when creating
  useEffect(() => {
    if (!slugManuallyEdited && !isEditing) {
      setSlug(slugify(name));
    }
  }, [name, slugManuallyEdited, isEditing]);

  // Load formulas on mount
  const loadFormulas = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/formulas");
      if (!res.ok) return;
      const data = await res.json();
      setTenantFormulas(data.formulas ?? []);
      setPresets(data.presets ?? []);
    } catch {
      // Non-critical — form still usable without formula data
    }
  }, []);

  useEffect(() => {
    loadFormulas();
  }, [loadFormulas]);

  // Create a formula from a preset and assign it
  async function handleCreateFromPreset(presetId: string, presetName: string) {
    try {
      const res = await fetch("/api/v1/formulas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: presetName,
          type: presetId,
          presetId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to create formula");
        return;
      }

      const data = await res.json();
      const newFormula: TenantFormula = {
        id: data.formula.id,
        name: data.formula.name,
        type: data.formula.type,
        presetId: data.formula.presetId,
      };
      setTenantFormulas((prev) => [...prev, newFormula]);
      setPricingFormulaId(newFormula.id);
      toast.success(`Formula "${presetName}" created and assigned`);
    } catch {
      toast.error("Failed to create formula from preset");
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();

    // Build productSchema from options
    const productSchema = {
      options: options.map((opt) => ({
        id: opt.id,
        type: opt.type,
        label: opt.label,
        required: opt.required,
        defaultValue: opt.defaultValue,
        values: opt.values,
        dependsOn: opt.dependsOn,
      })),
    };

    const payload = {
      name,
      slug,
      description,
      category,
      isActive,
      pricingFormulaId: pricingFormulaId ?? undefined,
      pricingParams,
      productSchema,
      renderConfig: { pipeline: renderPipeline },
    };

    setSaving(true);
    try {
      const url = isEditing
        ? `/api/v1/products/${productId}`
        : "/api/v1/products";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to save product");
        return;
      }

      toast.success(isEditing ? "Product updated" : "Product created");
      router.push("/admin/products");
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-8">
      {/* ── Section 1: Basic Info ──────────────────────────────────────── */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-5 text-base font-semibold text-neutral-900">
          Basic Info
        </h2>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Name */}
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Product Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Front-Lit Channel Letters"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Slug <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={slug}
              onChange={(e) => {
                setSlugManuallyEdited(true);
                setSlug(e.target.value);
              }}
              placeholder="front-lit-channel-letters"
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 font-mono text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Category */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short product description shown to customers"
              className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Render Pipeline */}
          <div>
            <label className="mb-1.5 block text-sm font-medium text-neutral-700">
              Render Pipeline
            </label>
            <select
              value={renderPipeline}
              onChange={(e) => setRenderPipeline(e.target.value)}
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {RENDER_PIPELINES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* 3D Model Builder link (only for part-assembly pipeline on existing products) */}
          {isEditing && renderPipeline === "part-assembly" && (
            <div className="sm:col-span-2">
              <a
                href={`/admin/products/${productId}/model`}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
                Configure 3D Model
              </a>
            </div>
          )}

          {/* Active toggle */}
          <div className="flex items-center gap-3 sm:justify-end">
            <label
              htmlFor="isActive"
              className="text-sm font-medium text-neutral-700"
            >
              Active (visible in store)
            </label>
            <input
              id="isActive"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-neutral-300 accent-blue-600"
            />
          </div>
        </div>
      </section>

      {/* ── Section 2: Pricing ────────────────────────────────────────── */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-5 text-base font-semibold text-neutral-900">
          Pricing
        </h2>

        <div className="space-y-5">
          <FormulaPicker
            value={pricingFormulaId}
            onChange={setPricingFormulaId}
            tenantFormulas={tenantFormulas}
            presets={presets}
            onCreateFromPreset={handleCreateFromPreset}
          />

          {/* Pricing Params — dynamic inputs based on formula variables */}
          {(() => {
            const activeFormula = tenantFormulas.find(
              (f) => f.id === pricingFormulaId
            );
            const activePreset = activeFormula?.presetId
              ? presets.find((p) => p.id === activeFormula.presetId)
              : null;
            const variables = activePreset?.variables ?? [];

            if (!pricingFormulaId) {
              return (
                <p className="text-sm text-neutral-400 italic">
                  Select a pricing formula above to configure its parameters.
                </p>
              );
            }

            if (variables.length === 0) {
              return (
                <p className="text-sm text-neutral-400 italic">
                  This formula has no configurable parameters.
                </p>
              );
            }

            return (
              <div>
                <label className="mb-3 block text-sm font-medium text-neutral-700">
                  Pricing Parameters
                </label>
                <PricingParamsEditor
                  params={pricingParams}
                  onChange={setPricingParams}
                  variables={variables}
                />
              </div>
            );
          })()}
        </div>
      </section>

      {/* ── Section 3: Configurator Options ───────────────────────────── */}
      <section className="rounded-xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-5 text-base font-semibold text-neutral-900">
          Configurator Options
        </h2>
        <OptionBuilder options={options} onChange={setOptions} />
      </section>

      {/* Spacer so sticky bar doesn't overlap last section */}
      <div className="h-20" />

      {/* ── Sticky Save / Cancel Bar ─────────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-end gap-3 px-6 py-3">
          <button
            type="button"
            onClick={() => router.push("/admin/products")}
            className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? "Save Changes" : "Create Product"}
          </button>
        </div>
      </div>
    </form>
  );
}
