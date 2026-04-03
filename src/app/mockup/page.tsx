"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { useMockupStore } from "@/stores/mockup-store";
import { PhotoOverlay } from "@/components/mockup/photo-overlay";
import type { PhotoOverlayHandle } from "@/components/mockup/photo-overlay";
import { MockupExport } from "@/components/mockup/mockup-export";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Upload,
  ImageIcon,
  Layers,
  Sun,
  Moon,
  RotateCcw,
  User,
  DoorOpen,
} from "lucide-react";
import type { WallTexture } from "@/types/mockup";
import { DimensionMarker } from "@/components/mockup/dimension-marker";

const SceneBuilder = dynamic(
  () => import("@/components/mockup/scene-builder"),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-video items-center justify-center rounded-xl border-2 border-dashed border-neutral-200 bg-neutral-50">
        <div className="text-center">
          <Layers className="mx-auto h-12 w-12 animate-pulse text-neutral-300" />
          <p className="mt-2 text-sm font-medium text-neutral-500">
            Loading 3D scene...
          </p>
        </div>
      </div>
    ),
  }
);

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WALL_TEXTURES: { value: WallTexture; label: string; color: string }[] = [
  { value: "red-brick", label: "Red Brick", color: "bg-red-800" },
  { value: "white-brick", label: "White Brick", color: "bg-neutral-200" },
  { value: "brown-brick", label: "Brown Brick", color: "bg-amber-900" },
  { value: "cream-stucco", label: "Cream Stucco", color: "bg-amber-100" },
  { value: "gray-stucco", label: "Gray Stucco", color: "bg-neutral-400" },
  { value: "white-stucco", label: "White Stucco", color: "bg-neutral-100" },
  {
    value: "glass-storefront",
    label: "Glass Storefront",
    color: "bg-sky-200",
  },
  { value: "concrete", label: "Concrete", color: "bg-neutral-500" },
  { value: "wood-siding", label: "Wood Siding", color: "bg-yellow-800" },
  { value: "stone", label: "Stone", color: "bg-stone-500" },
];

// ---------------------------------------------------------------------------
// Photo Upload Tab
// ---------------------------------------------------------------------------

function PhotoUploadTab() {
  const photoUrl = useMockupStore((s) => s.photoUrl);
  const setPhotoUrl = useMockupStore((s) => s.setPhotoUrl);
  const realWorldDimensions = useMockupStore((s) => s.realWorldDimensions);
  const setRealWorldDimensions = useMockupStore(
    (s) => s.setRealWorldDimensions
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback(
    (file: File) => {
      if (!file.type.startsWith("image/")) return;
      const url = URL.createObjectURL(file);
      setPhotoUrl(url);
    },
    [setPhotoUrl]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  return (
    <div className="space-y-6">
      {/* Drop zone / photo preview */}
      {!photoUrl ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => fileInputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 p-12 transition hover:border-blue-400 hover:bg-blue-50/50"
        >
          <Upload className="h-10 w-10 text-neutral-400" />
          <div className="text-center">
            <p className="text-sm font-medium text-neutral-700">
              Drag and drop a photo of your storefront
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              or click to browse (JPG, PNG, WebP)
            </p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      ) : (
        <div className="space-y-4">
          <DimensionMarker photoUrl={photoUrl} />
          <p className="text-xs text-neutral-500">
            Click and drag on the photo to mark where the sign will be installed
          </p>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setPhotoUrl(null);
              setRealWorldDimensions(null);
            }}
          >
            <RotateCcw className="mr-2 h-3 w-3" />
            Upload Different Photo
          </Button>
        </div>
      )}

      {/* Real-world dimensions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Real-World Dimensions</CardTitle>
          <CardDescription>
            Specify the actual wall area dimensions to scale the sign correctly.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="photo-width">Width (ft)</Label>
              <Input
                id="photo-width"
                type="number"
                min={1}
                max={200}
                value={realWorldDimensions?.widthFt ?? ""}
                placeholder="e.g. 20"
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setRealWorldDimensions({
                    widthFt: isNaN(val) ? 0 : val,
                    heightFt: realWorldDimensions?.heightFt ?? 0,
                  });
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="photo-height">Height (ft)</Label>
              <Input
                id="photo-height"
                type="number"
                min={1}
                max={200}
                value={realWorldDimensions?.heightFt ?? ""}
                placeholder="e.g. 12"
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setRealWorldDimensions({
                    widthFt: realWorldDimensions?.widthFt ?? 0,
                    heightFt: isNaN(val) ? 0 : val,
                  });
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scene Builder Tab
// ---------------------------------------------------------------------------

function SceneBuilderTab() {
  const wallTexture = useMockupStore((s) => s.wallTexture);
  const setWallTexture = useMockupStore((s) => s.setWallTexture);
  const wallWidthFt = useMockupStore((s) => s.wallWidthFt);
  const wallHeightFt = useMockupStore((s) => s.wallHeightFt);
  const setWallDimensions = useMockupStore((s) => s.setWallDimensions);
  const signPositionX = useMockupStore((s) => s.signPositionX);
  const signPositionY = useMockupStore((s) => s.signPositionY);
  const setSignPosition = useMockupStore((s) => s.setSignPosition);
  const showHumanRef = useMockupStore((s) => s.showHumanRef);
  const setShowHumanRef = useMockupStore((s) => s.setShowHumanRef);
  const showDoorRef = useMockupStore((s) => s.showDoorRef);
  const setShowDoorRef = useMockupStore((s) => s.setShowDoorRef);

  return (
    <div className="space-y-6">
      {/* Wall texture */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Wall Texture</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2">
            {WALL_TEXTURES.map((tex) => (
              <button
                key={tex.value}
                onClick={() => setWallTexture(tex.value)}
                className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-2 transition ${
                  wallTexture === tex.value
                    ? "border-blue-500 bg-blue-50"
                    : "border-transparent hover:border-neutral-300"
                }`}
              >
                <div
                  className={`h-8 w-8 rounded ${tex.color} border border-neutral-200`}
                />
                <span className="text-[10px] leading-tight text-neutral-600">
                  {tex.label}
                </span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Wall dimensions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Wall Dimensions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="wall-width">Width (ft)</Label>
              <Input
                id="wall-width"
                type="number"
                min={5}
                max={100}
                value={wallWidthFt}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) setWallDimensions(val, wallHeightFt);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wall-height">Height (ft)</Label>
              <Input
                id="wall-height"
                type="number"
                min={5}
                max={50}
                value={wallHeightFt}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) setWallDimensions(wallWidthFt, val);
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sign position */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Sign Position</CardTitle>
          <CardDescription>
            Adjust where the sign sits on the wall (0 = left/bottom, 1 =
            right/top).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Horizontal: {Math.round(signPositionX * 100)}%</Label>
              <Slider
                min={0}
                max={100}
                step={1}
                value={[Math.round(signPositionX * 100)]}
                onValueChange={([val]) =>
                  setSignPosition(val / 100, signPositionY)
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Vertical: {Math.round(signPositionY * 100)}%</Label>
              <Slider
                min={0}
                max={100}
                step={1}
                value={[Math.round(signPositionY * 100)]}
                onValueChange={([val]) =>
                  setSignPosition(signPositionX, val / 100)
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scale references */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Scale References</CardTitle>
          <CardDescription>
            Show reference objects to visualize the sign at real-world scale.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-neutral-500" />
                <Label htmlFor="human-ref">Human silhouette (5&apos;8&quot;)</Label>
              </div>
              <Switch
                id="human-ref"
                checked={showHumanRef}
                onCheckedChange={setShowHumanRef}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DoorOpen className="h-4 w-4 text-neutral-500" />
                <Label htmlFor="door-ref">Standard door (7&apos;)</Label>
              </div>
              <Switch
                id="door-ref"
                checked={showDoorRef}
                onCheckedChange={setShowDoorRef}
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preview Panel
// ---------------------------------------------------------------------------

function PreviewPanel({
  dayMode,
  onToggleDayMode,
  overlayRef,
}: {
  dayMode: boolean;
  onToggleDayMode: () => void;
  overlayRef: React.RefObject<PhotoOverlayHandle | null>;
}) {
  const mode = useMockupStore((s) => s.mode);
  const photoUrl = useMockupStore((s) => s.photoUrl);
  const installationRect = useMockupStore((s) => s.installationRect);
  const realWorldDimensions = useMockupStore((s) => s.realWorldDimensions);

  const showSceneBuilder = mode === "scene";
  const isPhotoMode = mode === "photo";

  // Photo overlay is ready when all three requirements are met
  const photoOverlayReady =
    isPhotoMode &&
    !!photoUrl &&
    !!installationRect &&
    !!realWorldDimensions &&
    realWorldDimensions.widthFt > 0 &&
    realWorldDimensions.heightFt > 0;

  return (
    <div className="flex flex-col gap-4">
      {/* Day/Night toggle + Download */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={dayMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (!dayMode) onToggleDayMode();
            }}
          >
            <Sun className="mr-1 h-3 w-3" />
            Day
          </Button>
          <Button
            variant={!dayMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (dayMode) onToggleDayMode();
            }}
          >
            <Moon className="mr-1 h-3 w-3" />
            Night
          </Button>
        </div>

        <MockupExport
          overlayRef={overlayRef}
          disabled={!photoOverlayReady}
        />
      </div>

      {/* Scene Builder 3D view */}
      {showSceneBuilder && (
        <div className="aspect-video overflow-hidden rounded-xl border border-neutral-200">
          <SceneBuilder dayMode={dayMode} />
        </div>
      )}

      {/* Photo mode: composite overlay when ready, placeholder otherwise */}
      {isPhotoMode && photoOverlayReady && (
        <PhotoOverlay ref={overlayRef} dayMode={dayMode} />
      )}

      {isPhotoMode && !photoOverlayReady && (
        <div
          className={`flex aspect-video items-center justify-center rounded-xl border-2 border-dashed transition ${
            !dayMode
              ? "border-neutral-600 bg-neutral-900"
              : "border-neutral-200 bg-neutral-50"
          }`}
        >
          <div className="text-center">
            <ImageIcon
              className={`mx-auto h-12 w-12 ${!dayMode ? "text-neutral-600" : "text-neutral-300"}`}
            />
            <p
              className={`mt-2 text-sm font-medium ${!dayMode ? "text-neutral-400" : "text-neutral-500"}`}
            >
              {!photoUrl
                ? "Upload a photo to preview your sign"
                : !installationRect
                  ? "Draw an installation area on the photo"
                  : "Enter real-world dimensions to scale the sign"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function MockupPage() {
  const mode = useMockupStore((s) => s.mode);
  const setMode = useMockupStore((s) => s.setMode);
  const resetMockup = useMockupStore((s) => s.resetMockup);

  const [dayMode, setDayMode] = useState(true);
  const overlayRef = useRef<PhotoOverlayHandle>(null);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">
            Wall Mockup
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Visualize your sign on a wall with a photo or virtual scene.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={resetMockup}>
          <RotateCcw className="mr-2 h-3 w-3" />
          Reset
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[400px_1fr]">
        {/* Left: controls */}
        <div>
          <Tabs
            value={mode}
            onValueChange={(val) => setMode(val as "photo" | "scene")}
          >
            <TabsList className="w-full">
              <TabsTrigger value="photo" className="flex-1">
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Photo Upload
              </TabsTrigger>
              <TabsTrigger value="scene" className="flex-1">
                <Layers className="mr-1.5 h-3.5 w-3.5" />
                Scene Builder
              </TabsTrigger>
            </TabsList>

            <TabsContent value="photo" className="mt-4">
              <PhotoUploadTab />
            </TabsContent>

            <TabsContent value="scene" className="mt-4">
              <SceneBuilderTab />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right: preview */}
        <div>
          <PreviewPanel
            dayMode={dayMode}
            onToggleDayMode={() => setDayMode((prev) => !prev)}
            overlayRef={overlayRef}
          />
        </div>
      </div>
    </div>
  );
}
