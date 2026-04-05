"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Loader2, ArrowLeft, RotateCcw } from "lucide-react";
import dynamic from "next/dynamic";
import type { MeshBinding, RenderConfig, RenderPipeline } from "@/types/schema";
import type { MeshInfo } from "./model-viewer";
import { UploadPanel } from "./upload-panel";
import { MeshInspector } from "./mesh-inspector";

// Load R3F Canvas with SSR disabled
const ModelViewerCanvas = dynamic(
  () => import("./model-viewer").then((m) => m.ModelViewerCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-neutral-100">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-3 text-sm text-neutral-500">Loading 3D Viewer...</p>
        </div>
      </div>
    ),
  }
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ModelBuilderProps {
  productId: string;
  productName: string;
  productOptions: { id: string; label: string }[];
  initialRenderConfig: RenderConfig & { modelUrl?: string };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ModelBuilder({
  productId,
  productName,
  productOptions,
  initialRenderConfig,
}: ModelBuilderProps) {
  const router = useRouter();

  // Model URL from renderConfig or upload
  const [modelUrl, setModelUrl] = useState<string | null>(
    initialRenderConfig.modelUrl ?? null
  );
  const [pipeline] = useState<RenderPipeline>(
    initialRenderConfig.pipeline ?? "part-assembly"
  );

  // Mesh bindings state
  const [bindings, setBindings] = useState<Record<string, MeshBinding>>(
    initialRenderConfig.meshBindings ?? {}
  );

  // Mesh discovery and selection
  const [allMeshes, setAllMeshes] = useState<MeshInfo[]>([]);
  const [selectedMesh, setSelectedMesh] = useState<MeshInfo | null>(null);

  // Save state
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // -- Handlers --

  const handleModelUploaded = useCallback((url: string) => {
    setModelUrl(url);
    setAllMeshes([]);
    setSelectedMesh(null);
    setBindings({});
    setDirty(true);
  }, []);

  const handleClearModel = useCallback(() => {
    setModelUrl(null);
    setAllMeshes([]);
    setSelectedMesh(null);
    setBindings({});
    setDirty(true);
  }, []);

  const handleMeshesDiscovered = useCallback((meshes: MeshInfo[]) => {
    setAllMeshes(meshes);
  }, []);

  const handleMeshSelect = useCallback((info: MeshInfo | null) => {
    setSelectedMesh(info);
  }, []);

  const handleMeshSelectFromList = useCallback((info: MeshInfo) => {
    setSelectedMesh(info);
  }, []);

  const handleBindingChange = useCallback(
    (meshName: string, binding: MeshBinding) => {
      setBindings((prev) => ({ ...prev, [meshName]: binding }));
      setDirty(true);
    },
    []
  );

  const handleResetBindings = useCallback(() => {
    setBindings({});
    setSelectedMesh(null);
    setDirty(true);
  }, []);

  // -- Save --

  async function handleSave() {
    // Clean bindings: remove entries with no meaningful data
    const cleanedBindings: Record<string, MeshBinding> = {};
    for (const [key, b] of Object.entries(bindings)) {
      const hasData =
        b.materialPreset ||
        b.colorOption ||
        b.materialOption ||
        b.emissiveOption ||
        (b.visibleWhen && Object.keys(b.visibleWhen).length > 0);
      if (hasData) {
        cleanedBindings[key] = b;
      }
    }

    const renderConfig: RenderConfig & { modelUrl?: string } = {
      pipeline,
      meshBindings: cleanedBindings,
      modelUrl: modelUrl ?? undefined,
    };

    setSaving(true);
    try {
      const res = await fetch(`/api/v1/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ renderConfig }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to save render config");
        return;
      }

      toast.success("Render config saved");
      setDirty(false);
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  }

  // -- Render --

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`/admin/products/${productId}`)}
            className="rounded-md p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600"
            title="Back to product"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-sm font-semibold text-neutral-900">
              3D Model Builder
            </h1>
            <p className="text-xs text-neutral-400">{productName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {dirty && (
            <span className="text-xs text-amber-600">Unsaved changes</span>
          )}
          <button
            type="button"
            onClick={handleResetBindings}
            disabled={Object.keys(bindings).length === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-40"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
            Save Config
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: 3D Viewport */}
        <div className="flex flex-1 flex-col">
          {/* Upload panel (compact when model loaded) */}
          <div className="border-b border-neutral-200 bg-white px-4 py-3">
            <UploadPanel
              modelUrl={modelUrl}
              onModelUploaded={handleModelUploaded}
              onClearModel={handleClearModel}
            />
          </div>

          {/* 3D Canvas */}
          <div className="flex-1 bg-neutral-100">
            {modelUrl ? (
              <ModelViewerCanvas
                modelUrl={modelUrl}
                selectedMeshName={selectedMesh?.name ?? null}
                onMeshSelect={handleMeshSelect}
                onMeshesDiscovered={handleMeshesDiscovered}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-neutral-400">
                  Upload a GLB model to get started
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Inspector panel */}
        <div className="w-80 shrink-0 border-l border-neutral-200 bg-white">
          <MeshInspector
            selectedMesh={selectedMesh}
            allMeshes={allMeshes}
            bindings={bindings}
            productOptions={productOptions}
            onBindingChange={handleBindingChange}
            onMeshSelect={handleMeshSelectFromList}
          />
        </div>
      </div>
    </div>
  );
}
