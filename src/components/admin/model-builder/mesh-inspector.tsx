"use client";

import { Box, Layers, Eye, Paintbrush, Lightbulb, MousePointerClick } from "lucide-react";
import type { MeshBinding } from "@/types/schema";
import type { MeshInfo } from "./model-viewer";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MESH_ROLES = [
  { value: "face", label: "Face", description: "Front-facing surface (receives face material)" },
  { value: "side", label: "Side / Returns", description: "Side surfaces (receives return material)" },
  { value: "back", label: "Back", description: "Rear surface" },
  { value: "mount", label: "Mount / Raceway", description: "Mounting hardware" },
  { value: "trim", label: "Trim Cap", description: "Edge trim around face" },
  { value: "led", label: "LED Module", description: "Internal LED (emissive)" },
  { value: "frame", label: "Frame / Structure", description: "Structural frame" },
  { value: "panel", label: "Panel", description: "Flat panel surface" },
  { value: "glass", label: "Glass / Lens", description: "Translucent cover" },
  { value: "other", label: "Other", description: "General purpose" },
] as const;

const MATERIAL_PRESETS = [
  { value: "aluminum-brushed", label: "Brushed Aluminum" },
  { value: "aluminum-painted", label: "Painted Aluminum" },
  { value: "acrylic-translucent", label: "Translucent Acrylic" },
  { value: "acrylic-opaque", label: "Opaque Acrylic" },
  { value: "stainless-steel", label: "Stainless Steel" },
  { value: "pvc", label: "PVC" },
  { value: "vinyl", label: "Vinyl" },
  { value: "painted-metal", label: "Painted Metal" },
  { value: "wood", label: "Wood" },
  { value: "neon-tube", label: "Neon Tube" },
] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MeshInspectorProps {
  selectedMesh: MeshInfo | null;
  allMeshes: MeshInfo[];
  bindings: Record<string, MeshBinding>;
  productOptions: { id: string; label: string }[];
  onBindingChange: (meshName: string, binding: MeshBinding) => void;
  onMeshSelect: (mesh: MeshInfo) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MeshInspector({
  selectedMesh,
  allMeshes,
  bindings,
  productOptions,
  onBindingChange,
  onMeshSelect,
}: MeshInspectorProps) {
  const currentBinding: MeshBinding | null = selectedMesh
    ? bindings[selectedMesh.name] ?? { meshName: selectedMesh.name }
    : null;

  function updateBinding(patch: Partial<MeshBinding>) {
    if (!selectedMesh || !currentBinding) return;
    onBindingChange(selectedMesh.name, { ...currentBinding, ...patch });
  }

  // Helper for conditional option selects
  const optionSelectOptions = [
    { value: "", label: "— None —" },
    ...productOptions.map((o) => ({ value: o.id, label: o.label })),
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Mesh List */}
      <div className="border-b border-neutral-200 px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Scene Meshes ({allMeshes.length})
        </h3>
      </div>

      <div className="max-h-48 overflow-y-auto border-b border-neutral-200">
        {allMeshes.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-neutral-400">
            No meshes discovered yet
          </p>
        ) : (
          <ul className="py-1">
            {allMeshes.map((mesh) => {
              const isSelected = selectedMesh?.name === mesh.name;
              const hasBinding = Boolean(bindings[mesh.name]);
              return (
                <li key={mesh.uuid}>
                  <button
                    type="button"
                    onClick={() => onMeshSelect(mesh)}
                    className={`flex w-full items-center gap-2 px-4 py-1.5 text-left text-xs transition ${
                      isSelected
                        ? "bg-blue-50 text-blue-700"
                        : "text-neutral-600 hover:bg-neutral-50"
                    }`}
                  >
                    <Box className="h-3 w-3 shrink-0" />
                    <span className="flex-1 truncate font-mono">{mesh.name}</span>
                    {hasBinding && (
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                        bound
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Inspector */}
      {selectedMesh && currentBinding ? (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Mesh info header */}
          <div className="mb-4 rounded-lg bg-neutral-50 px-3 py-2.5">
            <p className="font-mono text-sm font-semibold text-neutral-900">
              {selectedMesh.name}
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              {selectedMesh.vertexCount.toLocaleString()} vertices
              {" / "}
              Material: {selectedMesh.materialName}
            </p>
          </div>

          <div className="space-y-5">
            {/* Role (materialPreset) */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-neutral-700">
                <Layers className="h-3.5 w-3.5" />
                Role
              </label>
              <select
                value={currentBinding.materialPreset ?? ""}
                onChange={(e) =>
                  updateBinding({
                    materialPreset: e.target.value || undefined,
                  })
                }
                className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">— Unassigned —</option>
                {MESH_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              {currentBinding.materialPreset && (
                <p className="mt-1 text-[10px] text-neutral-400">
                  {MESH_ROLES.find((r) => r.value === currentBinding.materialPreset)?.description}
                </p>
              )}
            </div>

            {/* Material Preset */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-neutral-700">
                <Paintbrush className="h-3.5 w-3.5" />
                Material Preset
              </label>
              <select
                value={currentBinding.materialOption ?? ""}
                onChange={(e) =>
                  updateBinding({
                    materialOption: e.target.value || undefined,
                  })
                }
                className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">— Default (keep original) —</option>
                {MATERIAL_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Bound Color Option */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-neutral-700">
                <Paintbrush className="h-3.5 w-3.5" />
                Color Driven By Option
              </label>
              <select
                value={currentBinding.colorOption ?? ""}
                onChange={(e) =>
                  updateBinding({
                    colorOption: e.target.value || undefined,
                  })
                }
                className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {optionSelectOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-neutral-400">
                The customer-facing option whose value sets this mesh&apos;s color
              </p>
            </div>

            {/* Emissive Driven By Option */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-neutral-700">
                <Lightbulb className="h-3.5 w-3.5" />
                Emissive / LED Driven By Option
              </label>
              <select
                value={currentBinding.emissiveOption ?? ""}
                onChange={(e) =>
                  updateBinding({
                    emissiveOption: e.target.value || undefined,
                  })
                }
                className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {optionSelectOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-neutral-400">
                Option that controls emissive intensity / LED color on this mesh
              </p>
            </div>

            {/* Visibility Binding */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-neutral-700">
                <Eye className="h-3.5 w-3.5" />
                Visible When
              </label>
              <p className="text-[10px] text-neutral-400">
                Leave empty to always show. Select an option and values to conditionally show this mesh.
              </p>
              <VisibilityEditor
                visibleWhen={currentBinding.visibleWhen ?? {}}
                productOptions={productOptions}
                onChange={(visibleWhen) => updateBinding({ visibleWhen })}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="text-center">
            <MousePointerClick className="mx-auto mb-2 h-8 w-8 text-neutral-300" />
            <p className="text-sm font-medium text-neutral-400">
              Click a mesh in the viewport
            </p>
            <p className="mt-1 text-xs text-neutral-300">
              or select from the list above
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Visibility condition editor (simple key-values)
// ---------------------------------------------------------------------------

function VisibilityEditor({
  visibleWhen,
  productOptions,
  onChange,
}: {
  visibleWhen: Record<string, string[] | boolean>;
  productOptions: { id: string; label: string }[];
  onChange: (val: Record<string, string[] | boolean>) => void;
}) {
  const entries = Object.entries(visibleWhen);

  function addCondition() {
    if (productOptions.length === 0) return;
    const firstUnused = productOptions.find((o) => !(o.id in visibleWhen));
    const optionId = firstUnused?.id ?? productOptions[0].id;
    onChange({ ...visibleWhen, [optionId]: [] });
  }

  function removeCondition(key: string) {
    const next = { ...visibleWhen };
    delete next[key];
    onChange(next);
  }

  function updateConditionOption(oldKey: string, newKey: string) {
    const next = { ...visibleWhen };
    const val = next[oldKey];
    delete next[oldKey];
    next[newKey] = val;
    onChange(next);
  }

  function updateConditionValues(key: string, raw: string) {
    const values = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    onChange({ ...visibleWhen, [key]: values });
  }

  return (
    <div className="mt-2 space-y-2">
      {entries.map(([key, val]) => (
        <div key={key} className="flex items-center gap-2">
          <select
            value={key}
            onChange={(e) => updateConditionOption(key, e.target.value)}
            className="w-1/3 rounded-md border border-neutral-300 px-2 py-1 text-xs"
          >
            {productOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-neutral-400">=</span>
          <input
            type="text"
            value={Array.isArray(val) ? val.join(", ") : String(val)}
            onChange={(e) => updateConditionValues(key, e.target.value)}
            placeholder="value1, value2"
            className="flex-1 rounded-md border border-neutral-300 px-2 py-1 text-xs"
          />
          <button
            type="button"
            onClick={() => removeCondition(key)}
            className="text-xs text-red-400 hover:text-red-600"
          >
            x
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addCondition}
        className="text-xs font-medium text-blue-600 hover:text-blue-700"
      >
        + Add visibility condition
      </button>
    </div>
  );
}
