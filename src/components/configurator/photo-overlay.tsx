// src/components/configurator/photo-overlay.tsx
"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Upload, Download, X, Move, ZoomIn } from "lucide-react";
import {
  compositeSignOnPhoto,
  loadImageFromFile,
  captureSceneAsImage,
} from "@/lib/photo-compositor";

interface PhotoOverlayProps {
  /** The Three.js renderer canvas element */
  threeCanvas: HTMLCanvasElement | null;
}

export function PhotoOverlay({ threeCanvas }: PhotoOverlayProps) {
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [signX, setSignX] = useState(0.5);
  const [signY, setSignY] = useState(0.4);
  const [signScale, setSignScale] = useState(0.35);
  const [compositeUrl, setCompositeUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = useCallback(async (file: File) => {
    try {
      const img = await loadImageFromFile(file);
      setBackgroundImage(img);
      setBackgroundFile(file);
      setCompositeUrl(null);
    } catch {
      console.error("Failed to load image");
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        handleFileUpload(file);
      }
    },
    [handleFileUpload]
  );

  // Re-generate composite when position/scale changes
  const generateComposite = useCallback(async () => {
    if (!backgroundImage || !threeCanvas) return;

    setIsProcessing(true);
    try {
      const signImage = await captureSceneAsImage(threeCanvas);

      const result = await compositeSignOnPhoto({
        backgroundImage,
        signImage,
        signX,
        signY,
        signScale,
        outputWidth: backgroundImage.naturalWidth,
        outputHeight: backgroundImage.naturalHeight,
      });

      setCompositeUrl(result.dataUrl);
    } catch (err) {
      console.error("Compositing failed:", err);
    } finally {
      setIsProcessing(false);
    }
  }, [backgroundImage, threeCanvas, signX, signY, signScale]);

  useEffect(() => {
    if (backgroundImage && threeCanvas) {
      generateComposite();
    }
  }, [generateComposite, backgroundImage, threeCanvas]);

  const handlePreviewClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!previewRef.current) return;
      const rect = previewRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = (e.clientY - rect.top) / rect.height;
      setSignX(Math.max(0, Math.min(1, x)));
      setSignY(Math.max(0, Math.min(1, y)));
    },
    []
  );

  const handleDownload = useCallback(() => {
    if (!compositeUrl) return;
    const a = document.createElement("a");
    a.href = compositeUrl;
    a.download = "sign-preview.png";
    a.click();
  }, [compositeUrl]);

  const handleClear = useCallback(() => {
    setBackgroundImage(null);
    setBackgroundFile(null);
    setCompositeUrl(null);
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Photo Preview</span>
          {backgroundImage && (
            <Button variant="ghost" size="icon" onClick={handleClear}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!backgroundImage ? (
          /* Upload zone */
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${
              isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium">Upload a photo of your building</p>
            <p className="text-xs text-muted-foreground mt-1">
              Drag and drop or click to browse. JPG, PNG, or WebP.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
          </div>
        ) : (
          /* Composite preview + controls */
          <>
            <div
              ref={previewRef}
              className="relative rounded-lg overflow-hidden cursor-crosshair border"
              onClick={handlePreviewClick}
            >
              {compositeUrl ? (
                <img
                  src={compositeUrl}
                  alt="Sign on building preview"
                  className="w-full h-auto"
                />
              ) : (
                backgroundFile && (
                  <img
                    src={URL.createObjectURL(backgroundFile)}
                    alt="Building photo"
                    className="w-full h-auto"
                  />
                )
              )}
              {isProcessing && (
                <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
                  <p className="text-sm text-muted-foreground">Generating preview...</p>
                </div>
              )}
              {/* Position indicator */}
              <div
                className="absolute w-3 h-3 bg-primary rounded-full border-2 border-white shadow-md pointer-events-none"
                style={{
                  left: `${signX * 100}%`,
                  top: `${signY * 100}%`,
                  transform: "translate(-50%, -50%)",
                }}
              />
            </div>

            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Move className="h-3.5 w-3.5" />
              Click on the photo to position the sign
            </div>

            {/* Scale control */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ZoomIn className="h-4 w-4 text-muted-foreground" />
                <Label className="text-sm">Sign Size: {Math.round(signScale * 100)}%</Label>
              </div>
              <Slider
                value={[signScale]}
                onValueChange={([v]) => setSignScale(v)}
                min={0.05}
                max={0.8}
                step={0.01}
              />
            </div>

            {/* Download button */}
            <Button onClick={handleDownload} disabled={!compositeUrl} className="w-full">
              <Download className="mr-1.5 h-4 w-4" />
              Download Preview
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
