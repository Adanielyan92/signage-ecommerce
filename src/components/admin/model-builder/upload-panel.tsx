"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, X, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface UploadPanelProps {
  modelUrl: string | null;
  onModelUploaded: (url: string) => void;
  onClearModel: () => void;
}

export function UploadPanel({ modelUrl, onModelUploaded, onClearModel }: UploadPanelProps) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = useCallback(
    async (file: File) => {
      const ext = file.name.split(".").pop()?.toLowerCase();
      if (ext !== "glb" && ext !== "gltf") {
        toast.error("Only .glb and .gltf files are supported");
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        toast.error("File must be under 50 MB");
        return;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/v1/models/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json();
          toast.error(data.error ?? "Upload failed");
          return;
        }

        const data = await res.json();
        onModelUploaded(data.url);
        toast.success("Model uploaded successfully");
      } catch {
        toast.error("Upload failed — check your connection");
      } finally {
        setUploading(false);
      }
    },
    [onModelUploaded]
  );

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleUpload(file);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
    // Reset input so re-uploading the same file triggers onChange
    e.target.value = "";
  }

  // If a model is already loaded, show compact status
  if (modelUrl) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-green-800">
            Model loaded
          </p>
          <p className="truncate text-xs text-green-600">{modelUrl}</p>
        </div>
        <button
          type="button"
          onClick={onClearModel}
          className="rounded p-1 text-green-600 transition hover:bg-green-100 hover:text-green-800"
          title="Remove model"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed px-6 py-8 transition ${
        dragOver
          ? "border-blue-400 bg-blue-50"
          : "border-neutral-300 bg-neutral-50 hover:border-neutral-400 hover:bg-neutral-100"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".glb,.gltf"
        className="hidden"
        onChange={handleFileInput}
      />

      {uploading ? (
        <>
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          <p className="text-sm font-medium text-neutral-600">Uploading...</p>
        </>
      ) : (
        <>
          <div className="rounded-full bg-neutral-200 p-3">
            <Upload className="h-5 w-5 text-neutral-500" />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-neutral-700">
              Drop a GLB file here or click to upload
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              .glb or .gltf, max 50 MB
            </p>
          </div>
        </>
      )}
    </div>
  );
}
