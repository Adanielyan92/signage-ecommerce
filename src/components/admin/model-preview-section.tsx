"use client";

import { useState } from "react";
import { ExternalLink, Box, Upload as UploadIcon, Trash2 } from "lucide-react";
import { UploadPanel } from "./model-builder/upload-panel";

interface ModelPreviewSectionProps {
  productId?: string;
  slug: string;
  renderPipeline: string;
  modelUrl: string | null;
  onModelUrlChange: (url: string | null) => void;
}

type Tab = "preview" | "upload";

export function ModelPreviewSection({
  productId,
  slug,
  renderPipeline,
  modelUrl,
  onModelUrlChange,
}: ModelPreviewSectionProps) {
  const [activeTab, setActiveTab] = useState<Tab>(modelUrl ? "upload" : "preview");
  const isEditing = Boolean(productId);

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-6">
      <h2 className="mb-5 text-base font-semibold text-neutral-900">
        3D Model & Preview
      </h2>

      {/* Tab switcher */}
      <div className="mb-5 flex gap-1 rounded-lg bg-neutral-100 p-1">
        <button
          type="button"
          onClick={() => setActiveTab("preview")}
          className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${
            activeTab === "preview"
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          <Box className="h-3.5 w-3.5" />
          Preview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("upload")}
          className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition ${
            activeTab === "upload"
              ? "bg-white text-neutral-900 shadow-sm"
              : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          <UploadIcon className="h-3.5 w-3.5" />
          Upload Model
        </button>
      </div>

      {/* Tab: Preview */}
      {activeTab === "preview" && (
        <div className="space-y-4">
          {renderPipeline === "text-to-3d" && (
            <p className="text-sm text-neutral-500">
              This product uses the text-to-3D pipeline. Open the configurator to
              see a live 3D preview with the product&apos;s materials and settings.
            </p>
          )}
          {renderPipeline === "part-assembly" && (
            <p className="text-sm text-neutral-500">
              This product uses a part-assembly pipeline. Upload a GLB model in
              the &quot;Upload Model&quot; tab, or use the full Model Builder for
              advanced mesh binding.
            </p>
          )}
          {renderPipeline === "flat-2d" && (
            <p className="text-sm text-neutral-500">
              This product uses a flat 2D pipeline. You can optionally upload a
              3D model for marketing or preview purposes.
            </p>
          )}

          {/* Preview in configurator link */}
          {slug && (
            <a
              href={`/configure/${slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
            >
              <ExternalLink className="h-4 w-4" />
              Preview in Configurator
            </a>
          )}

          {/* Model status */}
          {modelUrl && (
            <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
              <Box className="h-4 w-4 shrink-0 text-green-600" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-green-800">
                  Custom model attached
                </p>
                <p className="truncate text-xs text-green-600">{modelUrl}</p>
              </div>
              <button
                type="button"
                onClick={() => onModelUrlChange(null)}
                className="rounded p-1 text-green-600 transition hover:bg-green-100 hover:text-green-800"
                title="Remove model"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tab: Upload Model */}
      {activeTab === "upload" && (
        <div className="space-y-4">
          <p className="text-sm text-neutral-500">
            Upload a designer&apos;s GLB/GLTF model. This model will be used as
            the 3D representation of the product.
          </p>

          <UploadPanel
            modelUrl={modelUrl}
            onModelUploaded={(url) => onModelUrlChange(url)}
            onClearModel={() => onModelUrlChange(null)}
          />
        </div>
      )}

      {/* Model Builder link — for all pipelines on existing products */}
      {isEditing && (
        <div className="mt-5 border-t border-neutral-100 pt-4">
          <a
            href={`/admin/products/${productId}/model`}
            className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            Open Full Model Builder
            <span className="text-xs text-neutral-400">
              (advanced mesh binding & materials)
            </span>
          </a>
        </div>
      )}
    </section>
  );
}
