"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { X, Upload, Move } from "lucide-react";
import { captureCanvasScreenshot } from "@/lib/capture-screenshot";

interface PhotoOverlayFallbackProps {
  onClose: () => void;
}

export function PhotoOverlayFallback({ onClose }: PhotoOverlayFallbackProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [signImage, setSignImage] = useState<HTMLImageElement | null>(null);
  const [signPos, setSignPos] = useState({ x: 0, y: 0 });
  const [signScale, setSignScale] = useState(0.3);
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  // Capture sign screenshot on mount
  useEffect(() => {
    const dataUrl = captureCanvasScreenshot();
    if (dataUrl) {
      const img = new Image();
      img.onload = () => setSignImage(img);
      img.src = dataUrl;
    }
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        setBackgroundImage(img);
        // Center the sign
        setSignPos({ x: img.width / 2, y: img.height / 3 });
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Render composite on canvas
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !backgroundImage) return;

    canvas.width = backgroundImage.width;
    canvas.height = backgroundImage.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(backgroundImage, 0, 0);

    if (signImage) {
      const sw = signImage.width * signScale;
      const sh = signImage.height * signScale;
      ctx.drawImage(signImage, signPos.x - sw / 2, signPos.y - sh / 2, sw, sh);
    }
  }, [backgroundImage, signImage, signPos, signScale]);

  useEffect(() => {
    render();
  }, [render]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect || !backgroundImage) return;
    const scaleX = backgroundImage.width / rect.width;
    const scaleY = backgroundImage.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    dragOffset.current = { x: mx - signPos.x, y: my - signPos.y };
    setDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!dragging || !canvasRef.current || !backgroundImage) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = backgroundImage.width / rect.width;
    const scaleY = backgroundImage.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    setSignPos({ x: mx - dragOffset.current.x, y: my - dragOffset.current.y });
  };

  const handleMouseUp = () => setDragging(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
          <h3 className="text-lg font-semibold text-neutral-900">Photo Overlay Preview</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {!backgroundImage ? (
            <div className="flex flex-col items-center gap-4 rounded-lg border-2 border-dashed border-neutral-300 py-16">
              <Upload className="h-10 w-10 text-neutral-400" />
              <p className="text-sm text-neutral-500">Upload a photo of your building or storefront</p>
              <label className="cursor-pointer rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
                Choose Photo
                <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>
          ) : (
            <div>
              <div className="relative overflow-hidden rounded-lg border border-neutral-200">
                <canvas
                  ref={canvasRef}
                  className="w-full cursor-move"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                />
                <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-black/50 px-2 py-1 text-xs text-white">
                  <Move className="h-3 w-3" />
                  Drag to position sign
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <label className="text-xs font-medium text-neutral-600">Size</label>
                <input
                  type="range"
                  min="0.1"
                  max="1"
                  step="0.05"
                  value={signScale}
                  onChange={(e) => setSignScale(parseFloat(e.target.value))}
                  className="flex-1"
                />
                <label className="cursor-pointer rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50">
                  Change Photo
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="hidden" />
                </label>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
