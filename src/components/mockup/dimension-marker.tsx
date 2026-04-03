"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMockupStore } from "@/stores/mockup-store";
import type { InstallationRect } from "@/types/mockup";

interface DimensionMarkerProps {
  photoUrl: string;
}

interface DragState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

/**
 * Canvas-based rectangle drawing tool overlaid on the uploaded photo.
 * The user clicks and drags to define the installation area where the sign
 * will be placed. The rectangle is stored via setInstallationRect().
 */
export function DimensionMarker({ photoUrl }: DimensionMarkerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const installationRect = useMockupStore((s) => s.installationRect);
  const setInstallationRect = useMockupStore((s) => s.setInstallationRect);
  const realWorldDimensions = useMockupStore((s) => s.realWorldDimensions);

  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageNaturalSize, setImageNaturalSize] = useState({
    width: 0,
    height: 0,
  });
  const [dragState, setDragState] = useState<DragState | null>(null);

  // Load the image and get its natural dimensions
  useEffect(() => {
    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      setImageLoaded(true);
    };
    img.src = photoUrl;
  }, [photoUrl]);

  // Get the display scale factor (displayed size vs natural image size)
  const getScaleFactor = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || imageNaturalSize.width === 0) return 1;
    return canvas.width / imageNaturalSize.width;
  }, [imageNaturalSize.width]);

  // Convert mouse event to canvas-relative coordinates (in natural image pixels)
  const getCanvasCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>): { x: number; y: number } => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    [],
  );

  // Draw the rectangle overlay
  const drawOverlay = useCallback(
    (rectToDraw: InstallationRect | null, isDragging: boolean) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      // Clear
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (!rectToDraw) return;

      const { x, y, width, height } = rectToDraw;

      // Semi-transparent blue fill
      ctx.fillStyle = "rgba(59, 130, 246, 0.15)";
      ctx.fillRect(x, y, width, height);

      // Dashed blue border
      ctx.strokeStyle = "rgba(59, 130, 246, 0.8)";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 4]);
      ctx.strokeRect(x, y, width, height);
      ctx.setLineDash([]);

      // Corner handles (small squares)
      if (!isDragging) {
        const handleSize = 8;
        ctx.fillStyle = "rgba(59, 130, 246, 1)";
        const corners = [
          { cx: x, cy: y },
          { cx: x + width, cy: y },
          { cx: x, cy: y + height },
          { cx: x + width, cy: y + height },
        ];
        for (const corner of corners) {
          ctx.fillRect(
            corner.cx - handleSize / 2,
            corner.cy - handleSize / 2,
            handleSize,
            handleSize,
          );
        }
      }

      // Dimension labels
      if (realWorldDimensions && Math.abs(width) > 40 && Math.abs(height) > 40) {
        const fontSize = Math.max(12, Math.min(16, Math.abs(width) / 10));
        ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const widthLabel = `${realWorldDimensions.widthFt.toFixed(1)} ft`;
        const heightLabel = `${realWorldDimensions.heightFt.toFixed(1)} ft`;

        // Width label (top edge)
        const labelX = x + width / 2;
        const labelYTop = y - fontSize - 4;

        // Draw label background
        const drawLabel = (text: string, lx: number, ly: number) => {
          const metrics = ctx.measureText(text);
          const padding = 4;
          ctx.fillStyle = "rgba(59, 130, 246, 0.9)";
          ctx.beginPath();
          const bx = lx - metrics.width / 2 - padding;
          const by = ly - fontSize / 2 - padding;
          const bw = metrics.width + padding * 2;
          const bh = fontSize + padding * 2;
          ctx.roundRect(bx, by, bw, bh, 3);
          ctx.fill();

          ctx.fillStyle = "white";
          ctx.fillText(text, lx, ly);
        };

        drawLabel(widthLabel, labelX, labelYTop > fontSize ? labelYTop : y + fontSize + 4);

        // Height label (right edge, rotated)
        const labelXRight = x + width + fontSize + 8;
        const labelYMid = y + height / 2;

        if (labelXRight < canvas.width - fontSize) {
          ctx.save();
          ctx.translate(labelXRight, labelYMid);
          ctx.rotate(-Math.PI / 2);
          drawLabel(heightLabel, 0, 0);
          ctx.restore();
        } else {
          // Put it inside on the left side
          ctx.save();
          ctx.translate(x - fontSize - 8, labelYMid);
          ctx.rotate(-Math.PI / 2);
          drawLabel(heightLabel, 0, 0);
          ctx.restore();
        }
      }
    },
    [realWorldDimensions],
  );

  // Sync canvas size with container and redraw when image loads or rect changes
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || !imageLoaded) return;

    const resizeObserver = new ResizeObserver(() => {
      const displayWidth = container.clientWidth;
      const aspectRatio = imageNaturalSize.height / imageNaturalSize.width;
      const displayHeight = displayWidth * aspectRatio;

      // Use device pixel ratio for sharp rendering
      const dpr = window.devicePixelRatio || 1;
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
      canvas.style.width = `${displayWidth}px`;
      canvas.style.height = `${displayHeight}px`;

      const ctx = canvas.getContext("2d");
      if (ctx) ctx.scale(dpr, dpr);

      // Redraw the current rect (scaled from natural to display coords)
      if (installationRect) {
        const scale = displayWidth / imageNaturalSize.width;
        drawOverlay(
          {
            x: installationRect.x * scale,
            y: installationRect.y * scale,
            width: installationRect.width * scale,
            height: installationRect.height * scale,
          },
          false,
        );
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [imageLoaded, imageNaturalSize, installationRect, drawOverlay]);

  // Redraw when realWorldDimensions changes
  useEffect(() => {
    if (!installationRect || !canvasRef.current || !containerRef.current) return;
    const container = containerRef.current;
    const displayWidth = container.clientWidth;
    const scale = displayWidth / imageNaturalSize.width;
    drawOverlay(
      {
        x: installationRect.x * scale,
        y: installationRect.y * scale,
        width: installationRect.width * scale,
        height: installationRect.height * scale,
      },
      false,
    );
  }, [realWorldDimensions, installationRect, imageNaturalSize.width, drawOverlay]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const displayX = e.clientX - rect.left;
      const displayY = e.clientY - rect.top;
      setDragState({
        startX: displayX,
        startY: displayY,
        currentX: displayX,
        currentY: displayY,
      });
      // Clear stored rect since we're starting a new one
      setInstallationRect(null);
    },
    [setInstallationRect],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!dragState) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const displayX = e.clientX - rect.left;
      const displayY = e.clientY - rect.top;

      setDragState((prev) =>
        prev ? { ...prev, currentX: displayX, currentY: displayY } : null,
      );

      // Draw preview rectangle in display coordinates
      const dpr = window.devicePixelRatio || 1;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }

      const drawRect: InstallationRect = {
        x: Math.min(dragState.startX, displayX),
        y: Math.min(dragState.startY, displayY),
        width: Math.abs(displayX - dragState.startX),
        height: Math.abs(displayY - dragState.startY),
      };

      drawOverlay(drawRect, true);
    },
    [dragState, drawOverlay],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!dragState) return;
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = canvas.getBoundingClientRect();
      const displayX = e.clientX - rect.left;
      const displayY = e.clientY - rect.top;

      const displayWidth = container.clientWidth;
      const scaleToNatural = imageNaturalSize.width / displayWidth;

      // Convert display coords to natural image coords
      const naturalRect: InstallationRect = {
        x: Math.min(dragState.startX, displayX) * scaleToNatural,
        y: Math.min(dragState.startY, displayY) * scaleToNatural,
        width: Math.abs(displayX - dragState.startX) * scaleToNatural,
        height: Math.abs(displayY - dragState.startY) * scaleToNatural,
      };

      // Only commit if the rect is large enough (at least 10px in display coords)
      if (
        Math.abs(displayX - dragState.startX) > 10 &&
        Math.abs(displayY - dragState.startY) > 10
      ) {
        setInstallationRect(naturalRect);
      }

      setDragState(null);
    },
    [dragState, imageNaturalSize.width, setInstallationRect],
  );

  if (!imageLoaded) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50">
        <p className="text-sm text-neutral-400">Loading photo...</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative overflow-hidden rounded-xl border border-neutral-200">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photoUrl}
        alt="Uploaded storefront"
        className="block w-full"
        draggable={false}
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 cursor-crosshair"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          if (dragState) {
            setDragState(null);
            // Redraw committed rect if any
            if (installationRect && containerRef.current) {
              const displayWidth = containerRef.current.clientWidth;
              const scale = displayWidth / imageNaturalSize.width;
              drawOverlay(
                {
                  x: installationRect.x * scale,
                  y: installationRect.y * scale,
                  width: installationRect.width * scale,
                  height: installationRect.height * scale,
                },
                false,
              );
            }
          }
        }}
      />
    </div>
  );
}
