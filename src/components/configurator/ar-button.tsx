"use client";

import { useState, useEffect, useCallback } from "react";
import { Smartphone } from "lucide-react";
import { detectArSupport, exportToGlb, exportToUsdz, openArQuickLook, startWebXrArSession } from "@/lib/ar-export";
import { toast } from "sonner";

interface ArButtonProps {
  /** Called to get the Three.js Object3D to export. */
  getSceneObject: () => import("three").Object3D | null;
  disabled?: boolean;
}

export function ArButton({ getSceneObject, disabled }: ArButtonProps) {
  const [arSupport, setArSupport] = useState<ReturnType<typeof detectArSupport> | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setArSupport(detectArSupport());
  }, []);

  const handleArClick = useCallback(async () => {
    if (!arSupport?.preferredFormat) {
      toast.error("AR is not supported on this device");
      return;
    }

    const object = getSceneObject();
    if (!object) {
      toast.error("No 3D model to export");
      return;
    }

    setExporting(true);
    try {
      if (arSupport.arQuickLook) {
        const usdz = await exportToUsdz(object);
        openArQuickLook(usdz);
      } else {
        const glb = await exportToGlb(object);
        await startWebXrArSession(glb);
      }
    } catch (err) {
      console.error("AR export error:", err);
      toast.error("Failed to open AR preview");
    } finally {
      setExporting(false);
    }
  }, [arSupport, getSceneObject]);

  // Hide if no AR support detected
  if (arSupport && !arSupport.preferredFormat) return null;

  // Show loading during SSR (arSupport is null on server)
  if (!arSupport) return null;

  return (
    <button
      onClick={handleArClick}
      disabled={disabled || exporting}
      className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-3 py-2.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
      title="View in AR"
    >
      <Smartphone className="h-4 w-4" />
      <span className="hidden sm:inline">{exporting ? "Preparing..." : "View in AR"}</span>
    </button>
  );
}
