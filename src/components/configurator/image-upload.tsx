"use client";

import { useCallback, useRef, useState } from "react";
import { useConfiguratorStore } from "@/stores/configurator-store";

const ACCEPTED_TYPES = ["image/svg+xml", "image/png", "image/jpeg", "image/jpg"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function ImageUpload() {
  const uploadedImageUrl = useConfiguratorStore((s) => s.uploadedImageUrl);
  const setUploadedImageUrl = useConfiguratorStore(
    (s) => s.setUploadedImageUrl
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);

      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError("Please upload an SVG, PNG, or JPG file.");
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setError("File size must be under 5MB.");
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setUploadedImageUrl(reader.result as string);
      };
      reader.onerror = () => {
        setError("Failed to read file.");
      };
      reader.readAsDataURL(file);
    },
    [setUploadedImageUrl]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    setUploadedImageUrl(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }, [setUploadedImageUrl]);

  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Logo Image
      </label>

      {uploadedImageUrl ? (
        <div className="relative rounded-lg border border-neutral-200 bg-white p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border border-neutral-100 bg-neutral-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={uploadedImageUrl}
                alt="Uploaded logo"
                className="h-full w-full object-contain"
              />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-neutral-700">
                Image uploaded
              </p>
              <p className="text-xs text-neutral-500">
                This image will appear on the 3D sign face
              </p>
            </div>
            <button
              onClick={handleRemove}
              className="rounded-md px-2 py-1 text-xs font-medium text-red-600 transition hover:bg-red-50"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 transition ${
            isDragging
              ? "border-blue-500 bg-blue-50"
              : "border-neutral-300 bg-neutral-50 hover:border-neutral-400 hover:bg-neutral-100"
          }`}
        >
          <svg
            className="mb-2 h-8 w-8 text-neutral-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 16v-8m0 0l-3 3m3-3l3 3M3 16v2a2 2 0 002 2h14a2 2 0 002-2v-2"
            />
          </svg>
          <p className="text-sm font-medium text-neutral-600">
            Drop your logo here or click to browse
          </p>
          <p className="mt-1 text-xs text-neutral-400">
            SVG, PNG, or JPG (max 5MB)
          </p>
          <input
            ref={inputRef}
            type="file"
            accept=".svg,.png,.jpg,.jpeg"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      )}

      {error && (
        <p className="mt-1.5 text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
