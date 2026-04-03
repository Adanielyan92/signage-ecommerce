"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useMockupStore } from "@/stores/mockup-store";
import { useConfiguratorStore } from "@/stores/configurator-store";
import { captureCanvasScreenshot } from "@/lib/capture-screenshot";
import type { InstallationRect } from "@/types/mockup";

interface PhotoOverlayProps {
  dayMode: boolean;
}

export interface PhotoOverlayHandle {
  getCanvas: () => HTMLCanvasElement | null;
}

/**
 * Canvas-based compositing component that renders the configured sign
 * on top of the uploaded photo at the correct scale.
 *
 * Night mode applies a dark tint to the photo and adds a glow effect
 * around the sign to simulate lit signage at night.
 *
 * Exposes a ref handle with getCanvas() for export functionality.
 */
export const PhotoOverlay = forwardRef<PhotoOverlayHandle, PhotoOverlayProps>(
  function PhotoOverlay({ dayMode }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const photoUrl = useMockupStore((s) => s.photoUrl);
    const installationRect = useMockupStore((s) => s.installationRect);
    const realWorldDimensions = useMockupStore((s) => s.realWorldDimensions);
    const dimensions = useConfiguratorStore((s) => s.dimensions);

    const [photoImage, setPhotoImage] = useState<HTMLImageElement | null>(null);
    const signImageRef = useRef<HTMLImageElement | null>(null);
    const [signImageVersion, setSignImageVersion] = useState(0);
    const prevPhotoUrl = useRef(photoUrl);

    // Reset photo image when URL changes (during render to avoid lint warning)
    if (prevPhotoUrl.current !== photoUrl) {
      prevPhotoUrl.current = photoUrl;
      if (!photoUrl) setPhotoImage(null);
    }

    // Expose canvas to parent via imperative handle
    useImperativeHandle(ref, () => ({
      getCanvas: () => canvasRef.current,
    }));

    // Load the background photo
    useEffect(() => {
      if (!photoUrl) return;
      const img = new Image();
      img.onload = () => setPhotoImage(img);
      img.src = photoUrl;
    }, [photoUrl]);

    // Capture the 3D canvas as the sign image
    const captureSign = useCallback(() => {
      // Small delay to ensure the Three.js canvas has rendered
      const timer = setTimeout(() => {
        const dataUrl = captureCanvasScreenshot();
        if (dataUrl) {
          const img = new Image();
          img.onload = () => {
            signImageRef.current = img;
            setSignImageVersion((v) => v + 1);
          };
          img.src = dataUrl;
        }
      }, 100);
      return () => clearTimeout(timer);
    }, []);

    // Re-capture the sign whenever key configurator state changes
    useEffect(() => {
      captureSign();
    }, [captureSign, dimensions.totalWidthInches, dimensions.heightInches]);

    // Composite rendering
    const composite = useCallback(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container || !photoImage || !installationRect || !realWorldDimensions) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const displayWidth = container.clientWidth;
      const aspectRatio = photoImage.naturalHeight / photoImage.naturalWidth;
      const displayHeight = displayWidth * aspectRatio;

      // Set canvas size with device pixel ratio for sharpness
      const dpr = window.devicePixelRatio || 1;
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Scale factor from natural image to display
      const scaleFromNatural = displayWidth / photoImage.naturalWidth;

      // 1. Draw the background photo
      ctx.drawImage(photoImage, 0, 0, displayWidth, displayHeight);

      // 2. Night mode: dark tint overlay
      if (!dayMode) {
        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, displayWidth, displayHeight);
      }

      // 3. Draw the installation rect outline (subtle)
      const rectDisplay = scaleRect(installationRect, scaleFromNatural);
      ctx.strokeStyle = "rgba(59, 130, 246, 0.3)";
      ctx.lineWidth = 1;
      ctx.setLineDash([6, 3]);
      ctx.strokeRect(rectDisplay.x, rectDisplay.y, rectDisplay.width, rectDisplay.height);
      ctx.setLineDash([]);

      // 4. Calculate sign size in display pixels
      const signImage = signImageRef.current;
      if (signImage && dimensions.totalWidthInches > 0 && dimensions.heightInches > 0) {
        const pixelsPerFoot = rectDisplay.width / realWorldDimensions.widthFt;
        const signWidthPixels = (dimensions.totalWidthInches / 12) * pixelsPerFoot;
        const signHeightPixels = (dimensions.heightInches / 12) * pixelsPerFoot;

        // Center the sign within the installation rect
        const signX = rectDisplay.x + (rectDisplay.width - signWidthPixels) / 2;
        const signY = rectDisplay.y + (rectDisplay.height - signHeightPixels) / 2;

        // Night mode glow effect
        if (!dayMode) {
          ctx.save();
          ctx.shadowColor = "rgba(255, 220, 150, 0.6)";
          ctx.shadowBlur = 40;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          // Draw a filled rect behind the sign to trigger the shadow
          ctx.fillStyle = "rgba(255, 220, 150, 0.1)";
          ctx.fillRect(signX, signY, signWidthPixels, signHeightPixels);
          ctx.restore();
        }

        // Draw the sign image
        ctx.drawImage(signImage, signX, signY, signWidthPixels, signHeightPixels);
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [photoImage, signImageVersion, installationRect, realWorldDimensions, dimensions, dayMode]);

    // Re-composite whenever inputs change
    useEffect(() => {
      composite();
    }, [composite]);

    // Resize handling
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const resizeObserver = new ResizeObserver(() => {
        composite();
      });

      resizeObserver.observe(container);
      return () => resizeObserver.disconnect();
    }, [composite]);

    return (
      <div ref={containerRef} className="relative overflow-hidden rounded-xl border border-neutral-200">
        <canvas ref={canvasRef} className="block w-full" />
        {!signImageRef.current && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="rounded-lg bg-black/60 px-3 py-1.5 text-xs text-white">
              Configure your sign in the configurator to see it here
            </p>
          </div>
        )}
      </div>
    );
  },
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function scaleRect(rect: InstallationRect, scale: number): InstallationRect {
  return {
    x: rect.x * scale,
    y: rect.y * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  };
}
