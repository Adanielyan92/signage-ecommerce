"use client";

import { useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { PhotoOverlayHandle } from "@/components/mockup/photo-overlay";

interface MockupExportProps {
  /** Ref to the PhotoOverlay imperative handle */
  overlayRef: React.RefObject<PhotoOverlayHandle | null>;
  /** Whether export is possible (all requirements met) */
  disabled?: boolean;
}

/**
 * Button that captures the composited mockup canvas as a PNG
 * and triggers a browser download.
 */
export function MockupExport({ overlayRef, disabled }: MockupExportProps) {
  const handleExport = useCallback(() => {
    const handle = overlayRef.current;
    if (!handle) return;

    const canvas = handle.getCanvas();
    if (!canvas) return;

    try {
      const dataUrl = canvas.toDataURL("image/png");
      const timestamp = Date.now();
      const filename = `sign-mockup-${timestamp}.png`;

      const link = document.createElement("a");
      link.download = filename;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Failed to export mockup:", error);
    }
  }, [overlayRef]);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleExport}
      disabled={disabled}
    >
      <Download className="mr-2 h-3 w-3" />
      Download Mockup
    </Button>
  );
}
