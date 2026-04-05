# Phase 2C: 3D Model Builder — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 3D model builder where admins upload GLB files, view them in an interactive 3D viewport, click meshes to select them, assign roles (face, side, back, mount, etc.), bind mesh properties to product options, and save the resulting `RenderConfig` to the product.

**Architecture:** New admin page at `/admin/products/[productId]/model` that loads the product from DB, shows a split-panel layout (3D viewer on the left, mesh inspector on the right). The 3D viewer uses React Three Fiber with `useGLTF` to load uploaded GLB files. Mesh selection uses `onClick` events on mesh objects with outline highlighting. The inspector panel lets admins assign roles and option bindings per mesh. File uploads go through a new API route that writes to `public/uploads/models/` locally. The final render config is saved via the existing PATCH `/api/v1/products/[productId]` endpoint.

**Tech Stack:** Next.js 16 App Router, React Three Fiber 9, @react-three/drei 10, Tailwind CSS v4, shadcn/ui, lucide-react, Zustand (local component state via `useRef`/`useState`), zod for upload validation

**Key Types (from `@/types/schema`):**
```ts
interface MeshBinding {
  meshName: string;
  materialPreset?: string;
  colorOption?: string;
  materialOption?: string;
  visibleWhen?: Record<string, string[] | boolean>;
  emissiveOption?: string;
}

interface RenderConfig {
  pipeline: RenderPipeline;  // "text-to-3d" | "part-assembly" | "flat-2d"
  meshBindings: Record<string, MeshBinding>;
  assemblyBindings?: Record<string, {
    visibleWhen?: Record<string, string[] | boolean>;
    typeOption?: string;
  }>;
}
```

---

## Scope

This plan covers:
1. GLB file upload API route
2. Model builder page (server component + client wrapper)
3. 3D model viewer with mesh selection and highlighting
4. Mesh inspector panel with role assignment and option bindings
5. Upload panel with drag-and-drop
6. Render config serialization and save to product

NOT in this plan:
- Vercel Blob storage (uses local `public/uploads/` for now; migration is a separate task)
- Assembly bindings editor (deferred — meshBindings is the priority)
- Custom material presets library
- GLB optimization / mesh merging tools

---

## File Structure

### New files to create

```
src/app/api/v1/models/
  └── upload/
      └── route.ts                              # POST — upload GLB, return URL

src/app/admin/products/[productId]/
  └── model/
      └── page.tsx                              # Model builder page (server component)

src/components/admin/model-builder/
  ├── model-builder.tsx                         # Main layout: viewer + inspector + upload
  ├── model-viewer.tsx                          # R3F Canvas with GLB model + mesh selection
  ├── mesh-inspector.tsx                        # Panel: selected mesh properties + bindings
  ├── mesh-highlighter.tsx                      # Visual highlight for hovered/selected meshes
  └── upload-panel.tsx                          # Drag-and-drop GLB upload zone
```

### Files to modify

```
src/components/admin/product-form.tsx           # Add "Configure 3D Model" link button
```

---

## Task 1: GLB Upload API Route

Create the upload endpoint that accepts a GLB file via `multipart/form-data`, validates it, saves to disk, and returns the public URL.

### Files

- [ ] Create `src/app/api/v1/models/upload/route.ts`

### Code

```ts
// src/app/api/v1/models/upload/route.ts
import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import { getAdminSession } from "@/lib/admin-auth";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "models");
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_EXTENSIONS = [".glb", ".gltf"];

export async function POST(request: NextRequest) {
  try {
    const admin = await getAdminSession();
    if (!admin) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate extension
    const ext = path.extname(file.name).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { error: `Invalid file type "${ext}". Allowed: ${ALLOWED_EXTENSIONS.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024} MB` },
        { status: 400 }
      );
    }

    // Ensure upload directory exists
    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    // Generate unique filename: tenantId-timestamp-originalName
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filename = `${admin.tenantId}-${Date.now()}-${sanitizedName}`;
    const filepath = path.join(UPLOAD_DIR, filename);

    // Write file to disk
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    const url = `/uploads/models/${filename}`;

    return NextResponse.json({ url, filename, size: file.size });
  } catch (error) {
    console.error("Error uploading model:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
```

### Commit

```
git add src/app/api/v1/models/upload/route.ts
git commit -m "feat: add GLB model upload API route

POST /api/v1/models/upload accepts multipart/form-data with a GLB file,
validates extension and size, saves to public/uploads/models/, and returns
the public URL. Admin auth required."
```

---

## Task 2: Upload Panel Component

A drag-and-drop zone for uploading GLB files, with progress indication and the current model URL display.

### Files

- [ ] Create `src/components/admin/model-builder/upload-panel.tsx`

### Code

```tsx
// src/components/admin/model-builder/upload-panel.tsx
"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, FileBox, X, Loader2, CheckCircle2 } from "lucide-react";
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
```

### Commit

```
git add src/components/admin/model-builder/upload-panel.tsx
git commit -m "feat: add GLB upload panel with drag-and-drop

UploadPanel component handles drag-and-drop and file input for GLB/glTF
files. Shows upload progress, success state with filename, and a clear
button. Calls onModelUploaded callback with the returned URL."
```

---

## Task 3: Model Viewer with Mesh Selection and Highlighting

The core 3D viewport. Loads a GLB model, renders all meshes, handles click-to-select and hover highlighting. This is the most complex component.

### Files

- [ ] Create `src/components/admin/model-builder/mesh-highlighter.tsx`
- [ ] Create `src/components/admin/model-builder/model-viewer.tsx`

### Code

```tsx
// src/components/admin/model-builder/mesh-highlighter.tsx
"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface MeshHighlighterProps {
  mesh: THREE.Mesh;
  type: "hover" | "selected";
}

/**
 * Renders a wireframe overlay on the given mesh to indicate hover or selection.
 * Uses a slightly scaled-up clone with a wireframe material so the original
 * mesh materials are unaffected.
 */
export function MeshHighlighter({ mesh, type }: MeshHighlighterProps) {
  const ref = useRef<THREE.Mesh>(null);

  const material = useMemo(() => {
    const color = type === "selected" ? "#3b82f6" : "#94a3b8";
    const mat = new THREE.MeshBasicMaterial({
      color,
      wireframe: true,
      transparent: true,
      opacity: type === "selected" ? 0.6 : 0.35,
      depthTest: true,
      depthWrite: false,
    });
    return mat;
  }, [type]);

  // Pulse opacity for selected meshes
  useFrame((_, delta) => {
    if (type === "selected" && ref.current) {
      const mat = ref.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.4 + Math.sin(Date.now() * 0.004) * 0.2;
    }
  });

  return (
    <mesh
      ref={ref}
      geometry={mesh.geometry}
      material={material}
      position={mesh.getWorldPosition(new THREE.Vector3())}
      rotation={mesh.getWorldQuaternion(new THREE.Quaternion()).toArray().slice(0, 3) as unknown as THREE.Euler}
      scale={mesh.getWorldScale(new THREE.Vector3())}
      matrixWorld={mesh.matrixWorld}
      renderOrder={999}
    />
  );
}

/**
 * Simpler approach: attach highlight as a sibling by cloning the world matrix.
 * This version copies the full matrixWorld to avoid decomposition issues.
 */
export function MeshHighlightOverlay({
  mesh,
  type,
}: MeshHighlighterProps) {
  const ref = useRef<THREE.Mesh>(null);

  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: type === "selected" ? "#3b82f6" : "#94a3b8",
      wireframe: true,
      transparent: true,
      opacity: type === "selected" ? 0.5 : 0.3,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
  }, [type]);

  useFrame(() => {
    if (ref.current && mesh) {
      // Copy the mesh's world matrix so the overlay sits exactly on top
      ref.current.matrixAutoUpdate = false;
      ref.current.matrix.copy(mesh.matrixWorld);
      ref.current.matrixWorldNeedsUpdate = true;

      if (type === "selected") {
        (ref.current.material as THREE.MeshBasicMaterial).opacity =
          0.35 + Math.sin(Date.now() * 0.004) * 0.15;
      }
    }
  });

  return (
    <mesh ref={ref} geometry={mesh.geometry} material={material} renderOrder={999} />
  );
}
```

```tsx
// src/components/admin/model-builder/model-viewer.tsx
"use client";

import { Suspense, useCallback, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useThree, ThreeEvent } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  useGLTF,
  Html,
  useProgress,
  ContactShadows,
  Bounds,
  useBounds,
  Center,
  Grid,
} from "@react-three/drei";
import { MeshHighlightOverlay } from "./mesh-highlighter";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MeshInfo {
  name: string;
  uuid: string;
  vertexCount: number;
  materialName: string;
  mesh: THREE.Mesh;
}

interface ModelViewerProps {
  modelUrl: string;
  selectedMeshName: string | null;
  onMeshSelect: (info: MeshInfo | null) => void;
  onMeshesDiscovered: (meshes: MeshInfo[]) => void;
}

// ---------------------------------------------------------------------------
// Loader fallback
// ---------------------------------------------------------------------------

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <div className="h-1 w-32 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-gray-400">{progress.toFixed(0)}%</span>
      </div>
    </Html>
  );
}

// ---------------------------------------------------------------------------
// Auto-fit camera to model
// ---------------------------------------------------------------------------

function AutoFit() {
  const bounds = useBounds();
  const fitted = useRef(false);

  useEffect(() => {
    if (!fitted.current) {
      fitted.current = true;
      const timer = setTimeout(() => {
        bounds.refresh().fit();
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [bounds]);

  return null;
}

// ---------------------------------------------------------------------------
// GLB Scene with interactive meshes
// ---------------------------------------------------------------------------

interface GLBSceneProps {
  url: string;
  selectedMeshName: string | null;
  onMeshClick: (info: MeshInfo) => void;
  onMeshesDiscovered: (meshes: MeshInfo[]) => void;
}

function GLBScene({ url, selectedMeshName, onMeshClick, onMeshesDiscovered }: GLBSceneProps) {
  const { scene } = useGLTF(url);
  const [hoveredMesh, setHoveredMesh] = useState<THREE.Mesh | null>(null);
  const selectedMeshRef = useRef<THREE.Mesh | null>(null);
  const discoveredRef = useRef(false);

  // Discover all meshes in the loaded scene
  useEffect(() => {
    if (discoveredRef.current) return;
    discoveredRef.current = true;

    const meshes: MeshInfo[] = [];
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const mat = Array.isArray(child.material) ? child.material[0] : child.material;
        meshes.push({
          name: child.name || `mesh_${meshes.length}`,
          uuid: child.uuid,
          vertexCount: child.geometry?.attributes?.position?.count ?? 0,
          materialName: mat?.name || "unnamed",
          mesh: child,
        });
      }
    });
    onMeshesDiscovered(meshes);
  }, [scene, onMeshesDiscovered]);

  // Track the selected mesh ref for highlighting
  useEffect(() => {
    if (!selectedMeshName) {
      selectedMeshRef.current = null;
      return;
    }
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.name === selectedMeshName) {
        selectedMeshRef.current = child;
      }
    });
  }, [selectedMeshName, scene]);

  const handlePointerOver = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const mesh = e.object as THREE.Mesh;
    if (mesh instanceof THREE.Mesh) {
      setHoveredMesh(mesh);
      document.body.style.cursor = "pointer";
    }
  }, []);

  const handlePointerOut = useCallback(() => {
    setHoveredMesh(null);
    document.body.style.cursor = "default";
  }, []);

  const handleClick = useCallback(
    (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      const mesh = e.object as THREE.Mesh;
      if (mesh instanceof THREE.Mesh) {
        const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        onMeshClick({
          name: mesh.name || "unnamed",
          uuid: mesh.uuid,
          vertexCount: mesh.geometry?.attributes?.position?.count ?? 0,
          materialName: mat?.name || "unnamed",
          mesh,
        });
      }
    },
    [onMeshClick]
  );

  // Make all meshes interactive by attaching event handlers
  useEffect(() => {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        // Ensure names are set for unnamed meshes
        if (!child.name) {
          child.name = `mesh_${child.uuid.slice(0, 8)}`;
        }
      }
    });
  }, [scene]);

  return (
    <>
      <primitive
        object={scene}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      />

      {/* Hover highlight (skip if it's the selected mesh) */}
      {hoveredMesh && hoveredMesh.name !== selectedMeshName && (
        <MeshHighlightOverlay mesh={hoveredMesh} type="hover" />
      )}

      {/* Selection highlight */}
      {selectedMeshRef.current && (
        <MeshHighlightOverlay mesh={selectedMeshRef.current} type="selected" />
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Scene wrapper with lighting and controls
// ---------------------------------------------------------------------------

function SceneContent({
  url,
  selectedMeshName,
  onMeshClick,
  onMeshesDiscovered,
  onBackgroundClick,
}: GLBSceneProps & { onBackgroundClick: () => void }) {
  return (
    <>
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={0.5}
        maxDistance={100}
      />

      {/* Studio lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 14, 12]} intensity={1.2} castShadow />
      <directionalLight position={[-8, 6, 8]} intensity={0.4} />
      <Environment preset="studio" />

      {/* Ground grid for spatial reference */}
      <Grid
        args={[20, 20]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#e5e5e5"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#a3a3a3"
        fadeDistance={30}
        fadeStrength={1}
        position={[0, -0.01, 0]}
        infiniteGrid
      />

      <ContactShadows
        position={[0, -0.01, 0]}
        opacity={0.3}
        scale={20}
        blur={2}
        far={10}
        resolution={256}
      />

      {/* Click on background to deselect */}
      <mesh
        visible={false}
        position={[0, 0, -20]}
        onClick={onBackgroundClick}
      >
        <planeGeometry args={[200, 200]} />
      </mesh>

      {/* Model with auto-fit */}
      <Bounds fit observe margin={1.5} maxDuration={0.5}>
        <AutoFit />
        <Center>
          <GLBScene
            url={url}
            selectedMeshName={selectedMeshName}
            onMeshClick={onMeshClick}
            onMeshesDiscovered={onMeshesDiscovered}
          />
        </Center>
      </Bounds>
    </>
  );
}

// ---------------------------------------------------------------------------
// Exported Canvas component
// ---------------------------------------------------------------------------

export function ModelViewerCanvas({
  modelUrl,
  selectedMeshName,
  onMeshSelect,
  onMeshesDiscovered,
}: ModelViewerProps) {
  const handleBackgroundClick = useCallback(() => {
    onMeshSelect(null);
  }, [onMeshSelect]);

  return (
    <Canvas
      camera={{ position: [0, 2, 5], fov: 45 }}
      shadows
      gl={{
        antialias: true,
        alpha: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.9,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      dpr={[1, 2]}
      className="h-full w-full"
      style={{ background: "#f5f5f5" }}
    >
      <Suspense fallback={<Loader />}>
        <SceneContent
          url={modelUrl}
          selectedMeshName={selectedMeshName}
          onMeshClick={onMeshSelect}
          onMeshesDiscovered={onMeshesDiscovered}
          onBackgroundClick={handleBackgroundClick}
        />
      </Suspense>
    </Canvas>
  );
}
```

### Commit

```
git add src/components/admin/model-builder/mesh-highlighter.tsx src/components/admin/model-builder/model-viewer.tsx
git commit -m "feat: add 3D model viewer with mesh selection and highlighting

ModelViewerCanvas loads a GLB via useGLTF, renders it with studio lighting
and orbit controls. Click any mesh to select it, hover to see wireframe
highlight. Discovers all meshes in the scene and reports them via callback.
MeshHighlightOverlay renders a wireframe overlay that copies the target
mesh's world matrix for pixel-perfect alignment."
```

---

## Task 4: Mesh Inspector Panel

The right-side panel that shows selected mesh details and lets the admin assign a role and bind properties to product options.

### Files

- [ ] Create `src/components/admin/model-builder/mesh-inspector.tsx`

### Code

```tsx
// src/components/admin/model-builder/mesh-inspector.tsx
"use client";

import { useState, useEffect } from "react";
import { Box, Layers, Eye, Paintbrush, Lightbulb, MousePointerClick } from "lucide-react";
import type { MeshBinding } from "@/types/schema";
import type { MeshInfo } from "./model-viewer";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MESH_ROLES = [
  { value: "face", label: "Face", description: "Front-facing surface (receives face material)" },
  { value: "side", label: "Side / Returns", description: "Side surfaces (receives return material)" },
  { value: "back", label: "Back", description: "Rear surface" },
  { value: "mount", label: "Mount / Raceway", description: "Mounting hardware" },
  { value: "trim", label: "Trim Cap", description: "Edge trim around face" },
  { value: "led", label: "LED Module", description: "Internal LED (emissive)" },
  { value: "frame", label: "Frame / Structure", description: "Structural frame" },
  { value: "panel", label: "Panel", description: "Flat panel surface" },
  { value: "glass", label: "Glass / Lens", description: "Translucent cover" },
  { value: "other", label: "Other", description: "General purpose" },
] as const;

const MATERIAL_PRESETS = [
  { value: "aluminum-brushed", label: "Brushed Aluminum" },
  { value: "aluminum-painted", label: "Painted Aluminum" },
  { value: "acrylic-translucent", label: "Translucent Acrylic" },
  { value: "acrylic-opaque", label: "Opaque Acrylic" },
  { value: "stainless-steel", label: "Stainless Steel" },
  { value: "pvc", label: "PVC" },
  { value: "vinyl", label: "Vinyl" },
  { value: "painted-metal", label: "Painted Metal" },
  { value: "wood", label: "Wood" },
  { value: "neon-tube", label: "Neon Tube" },
] as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MeshInspectorProps {
  selectedMesh: MeshInfo | null;
  allMeshes: MeshInfo[];
  bindings: Record<string, MeshBinding>;
  productOptions: { id: string; label: string }[];
  onBindingChange: (meshName: string, binding: MeshBinding) => void;
  onMeshSelect: (mesh: MeshInfo) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function MeshInspector({
  selectedMesh,
  allMeshes,
  bindings,
  productOptions,
  onBindingChange,
  onMeshSelect,
}: MeshInspectorProps) {
  const currentBinding: MeshBinding | null = selectedMesh
    ? bindings[selectedMesh.name] ?? { meshName: selectedMesh.name }
    : null;

  function updateBinding(patch: Partial<MeshBinding>) {
    if (!selectedMesh || !currentBinding) return;
    onBindingChange(selectedMesh.name, { ...currentBinding, ...patch });
  }

  // Helper for conditional option selects
  const optionSelectOptions = [
    { value: "", label: "— None —" },
    ...productOptions.map((o) => ({ value: o.id, label: o.label })),
  ];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* ── Mesh List ───────────────────────────────────────────────── */}
      <div className="border-b border-neutral-200 px-4 py-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
          Scene Meshes ({allMeshes.length})
        </h3>
      </div>

      <div className="max-h-48 overflow-y-auto border-b border-neutral-200">
        {allMeshes.length === 0 ? (
          <p className="px-4 py-6 text-center text-xs text-neutral-400">
            No meshes discovered yet
          </p>
        ) : (
          <ul className="py-1">
            {allMeshes.map((mesh) => {
              const isSelected = selectedMesh?.name === mesh.name;
              const hasBinding = Boolean(bindings[mesh.name]);
              return (
                <li key={mesh.uuid}>
                  <button
                    type="button"
                    onClick={() => onMeshSelect(mesh)}
                    className={`flex w-full items-center gap-2 px-4 py-1.5 text-left text-xs transition ${
                      isSelected
                        ? "bg-blue-50 text-blue-700"
                        : "text-neutral-600 hover:bg-neutral-50"
                    }`}
                  >
                    <Box className="h-3 w-3 shrink-0" />
                    <span className="flex-1 truncate font-mono">{mesh.name}</span>
                    {hasBinding && (
                      <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                        bound
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* ── Inspector ───────────────────────────────────────────────── */}
      {selectedMesh && currentBinding ? (
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* Mesh info header */}
          <div className="mb-4 rounded-lg bg-neutral-50 px-3 py-2.5">
            <p className="font-mono text-sm font-semibold text-neutral-900">
              {selectedMesh.name}
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              {selectedMesh.vertexCount.toLocaleString()} vertices
              {" / "}
              Material: {selectedMesh.materialName}
            </p>
          </div>

          <div className="space-y-5">
            {/* ── Role (materialPreset) ──────────────────────────── */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-neutral-700">
                <Layers className="h-3.5 w-3.5" />
                Role
              </label>
              <select
                value={currentBinding.materialPreset ?? ""}
                onChange={(e) =>
                  updateBinding({
                    materialPreset: e.target.value || undefined,
                  })
                }
                className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">— Unassigned —</option>
                {MESH_ROLES.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              {currentBinding.materialPreset && (
                <p className="mt-1 text-[10px] text-neutral-400">
                  {MESH_ROLES.find((r) => r.value === currentBinding.materialPreset)?.description}
                </p>
              )}
            </div>

            {/* ── Material Preset ────────────────────────────────── */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-neutral-700">
                <Paintbrush className="h-3.5 w-3.5" />
                Material Preset
              </label>
              <select
                value={currentBinding.materialOption ?? ""}
                onChange={(e) =>
                  updateBinding({
                    materialOption: e.target.value || undefined,
                  })
                }
                className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">— Default (keep original) —</option>
                {MATERIAL_PRESETS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {/* ── Bound Color Option ─────────────────────────────── */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-neutral-700">
                <Paintbrush className="h-3.5 w-3.5" />
                Color Driven By Option
              </label>
              <select
                value={currentBinding.colorOption ?? ""}
                onChange={(e) =>
                  updateBinding({
                    colorOption: e.target.value || undefined,
                  })
                }
                className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {optionSelectOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-neutral-400">
                The customer-facing option whose value sets this mesh's color
              </p>
            </div>

            {/* ── Emissive Driven By Option ──────────────────────── */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-neutral-700">
                <Lightbulb className="h-3.5 w-3.5" />
                Emissive / LED Driven By Option
              </label>
              <select
                value={currentBinding.emissiveOption ?? ""}
                onChange={(e) =>
                  updateBinding({
                    emissiveOption: e.target.value || undefined,
                  })
                }
                className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {optionSelectOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-neutral-400">
                Option that controls emissive intensity / LED color on this mesh
              </p>
            </div>

            {/* ── Visibility Binding ─────────────────────────────── */}
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-neutral-700">
                <Eye className="h-3.5 w-3.5" />
                Visible When
              </label>
              <p className="text-[10px] text-neutral-400">
                Leave empty to always show. Select an option and values to conditionally show this mesh.
              </p>
              <VisibilityEditor
                visibleWhen={currentBinding.visibleWhen ?? {}}
                productOptions={productOptions}
                onChange={(visibleWhen) => updateBinding({ visibleWhen })}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-center justify-center px-4">
          <div className="text-center">
            <MousePointerClick className="mx-auto mb-2 h-8 w-8 text-neutral-300" />
            <p className="text-sm font-medium text-neutral-400">
              Click a mesh in the viewport
            </p>
            <p className="mt-1 text-xs text-neutral-300">
              or select from the list above
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Visibility condition editor (simple key-values)
// ---------------------------------------------------------------------------

function VisibilityEditor({
  visibleWhen,
  productOptions,
  onChange,
}: {
  visibleWhen: Record<string, string[] | boolean>;
  productOptions: { id: string; label: string }[];
  onChange: (val: Record<string, string[] | boolean>) => void;
}) {
  const entries = Object.entries(visibleWhen);

  function addCondition() {
    if (productOptions.length === 0) return;
    const firstUnused = productOptions.find((o) => !(o.id in visibleWhen));
    const optionId = firstUnused?.id ?? productOptions[0].id;
    onChange({ ...visibleWhen, [optionId]: [] });
  }

  function removeCondition(key: string) {
    const next = { ...visibleWhen };
    delete next[key];
    onChange(next);
  }

  function updateConditionOption(oldKey: string, newKey: string) {
    const next = { ...visibleWhen };
    const val = next[oldKey];
    delete next[oldKey];
    next[newKey] = val;
    onChange(next);
  }

  function updateConditionValues(key: string, raw: string) {
    const values = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    onChange({ ...visibleWhen, [key]: values });
  }

  return (
    <div className="mt-2 space-y-2">
      {entries.map(([key, val]) => (
        <div key={key} className="flex items-center gap-2">
          <select
            value={key}
            onChange={(e) => updateConditionOption(key, e.target.value)}
            className="w-1/3 rounded-md border border-neutral-300 px-2 py-1 text-xs"
          >
            {productOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
          <span className="text-xs text-neutral-400">=</span>
          <input
            type="text"
            value={Array.isArray(val) ? val.join(", ") : String(val)}
            onChange={(e) => updateConditionValues(key, e.target.value)}
            placeholder="value1, value2"
            className="flex-1 rounded-md border border-neutral-300 px-2 py-1 text-xs"
          />
          <button
            type="button"
            onClick={() => removeCondition(key)}
            className="text-xs text-red-400 hover:text-red-600"
          >
            x
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={addCondition}
        className="text-xs font-medium text-blue-600 hover:text-blue-700"
      >
        + Add visibility condition
      </button>
    </div>
  );
}
```

### Commit

```
git add src/components/admin/model-builder/mesh-inspector.tsx
git commit -m "feat: add mesh inspector panel with role assignment and option bindings

MeshInspector shows all discovered meshes in a scrollable list, highlights
the selected mesh, and provides controls for: role assignment (face, side,
back, mount, etc.), material preset, color/emissive option bindings, and
conditional visibility rules tied to product options."
```

---

## Task 5: Model Builder Layout (Main Orchestrator)

The main client component that ties together the upload panel, 3D viewer, and mesh inspector. Manages all state and handles save.

### Files

- [ ] Create `src/components/admin/model-builder/model-builder.tsx`

### Code

```tsx
// src/components/admin/model-builder/model-builder.tsx
"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Save, Loader2, ArrowLeft, RotateCcw } from "lucide-react";
import dynamic from "next/dynamic";
import type { MeshBinding, RenderConfig, RenderPipeline } from "@/types/schema";
import type { MeshInfo } from "./model-viewer";
import { UploadPanel } from "./upload-panel";
import { MeshInspector } from "./mesh-inspector";

// Load R3F Canvas with SSR disabled
const ModelViewerCanvas = dynamic(
  () => import("./model-viewer").then((m) => m.ModelViewerCanvas),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-neutral-100">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          <p className="mt-3 text-sm text-neutral-500">Loading 3D Viewer...</p>
        </div>
      </div>
    ),
  }
);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ModelBuilderProps {
  productId: string;
  productName: string;
  productOptions: { id: string; label: string }[];
  initialRenderConfig: RenderConfig;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ModelBuilder({
  productId,
  productName,
  productOptions,
  initialRenderConfig,
}: ModelBuilderProps) {
  const router = useRouter();

  // Model URL from renderConfig or upload
  const [modelUrl, setModelUrl] = useState<string | null>(
    (initialRenderConfig as RenderConfig & { modelUrl?: string }).modelUrl ?? null
  );
  const [pipeline] = useState<RenderPipeline>(
    initialRenderConfig.pipeline ?? "part-assembly"
  );

  // Mesh bindings state
  const [bindings, setBindings] = useState<Record<string, MeshBinding>>(
    initialRenderConfig.meshBindings ?? {}
  );

  // Mesh discovery and selection
  const [allMeshes, setAllMeshes] = useState<MeshInfo[]>([]);
  const [selectedMesh, setSelectedMesh] = useState<MeshInfo | null>(null);

  // Save state
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  // ── Handlers ─────────────────────────────────────────────────────

  const handleModelUploaded = useCallback((url: string) => {
    setModelUrl(url);
    setAllMeshes([]);
    setSelectedMesh(null);
    setBindings({});
    setDirty(true);
  }, []);

  const handleClearModel = useCallback(() => {
    setModelUrl(null);
    setAllMeshes([]);
    setSelectedMesh(null);
    setBindings({});
    setDirty(true);
  }, []);

  const handleMeshesDiscovered = useCallback((meshes: MeshInfo[]) => {
    setAllMeshes(meshes);
  }, []);

  const handleMeshSelect = useCallback((info: MeshInfo | null) => {
    setSelectedMesh(info);
  }, []);

  const handleMeshSelectFromList = useCallback((info: MeshInfo) => {
    setSelectedMesh(info);
  }, []);

  const handleBindingChange = useCallback(
    (meshName: string, binding: MeshBinding) => {
      setBindings((prev) => ({ ...prev, [meshName]: binding }));
      setDirty(true);
    },
    []
  );

  const handleResetBindings = useCallback(() => {
    setBindings({});
    setSelectedMesh(null);
    setDirty(true);
  }, []);

  // ── Save ─────────────────────────────────────────────────────────

  async function handleSave() {
    // Clean bindings: remove entries with no meaningful data
    const cleanedBindings: Record<string, MeshBinding> = {};
    for (const [key, b] of Object.entries(bindings)) {
      const hasData =
        b.materialPreset ||
        b.colorOption ||
        b.materialOption ||
        b.emissiveOption ||
        (b.visibleWhen && Object.keys(b.visibleWhen).length > 0);
      if (hasData) {
        cleanedBindings[key] = b;
      }
    }

    const renderConfig: RenderConfig & { modelUrl?: string } = {
      pipeline,
      meshBindings: cleanedBindings,
      modelUrl: modelUrl ?? undefined,
    };

    setSaving(true);
    try {
      const res = await fetch(`/api/v1/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ renderConfig }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to save render config");
        return;
      }

      toast.success("Render config saved");
      setDirty(false);
    } catch {
      toast.error("An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col">
      {/* ── Top bar ──────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push(`/admin/products/${productId}`)}
            className="rounded-md p-1.5 text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-600"
            title="Back to product"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-sm font-semibold text-neutral-900">
              3D Model Builder
            </h1>
            <p className="text-xs text-neutral-400">{productName}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {dirty && (
            <span className="text-xs text-amber-600">Unsaved changes</span>
          )}
          <button
            type="button"
            onClick={handleResetBindings}
            disabled={Object.keys(bindings).length === 0}
            className="inline-flex items-center gap-1.5 rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:opacity-40"
          >
            <RotateCcw className="h-3 w-3" />
            Reset
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-4 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
          >
            {saving ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Save className="h-3 w-3" />
            )}
            Save Config
          </button>
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: 3D Viewport */}
        <div className="flex flex-1 flex-col">
          {/* Upload panel (compact when model loaded) */}
          <div className="border-b border-neutral-200 bg-white px-4 py-3">
            <UploadPanel
              modelUrl={modelUrl}
              onModelUploaded={handleModelUploaded}
              onClearModel={handleClearModel}
            />
          </div>

          {/* 3D Canvas */}
          <div className="flex-1 bg-neutral-100">
            {modelUrl ? (
              <ModelViewerCanvas
                modelUrl={modelUrl}
                selectedMeshName={selectedMesh?.name ?? null}
                onMeshSelect={handleMeshSelect}
                onMeshesDiscovered={handleMeshesDiscovered}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-neutral-400">
                  Upload a GLB model to get started
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Inspector panel */}
        <div className="w-80 shrink-0 border-l border-neutral-200 bg-white">
          <MeshInspector
            selectedMesh={selectedMesh}
            allMeshes={allMeshes}
            bindings={bindings}
            productOptions={productOptions}
            onBindingChange={handleBindingChange}
            onMeshSelect={handleMeshSelectFromList}
          />
        </div>
      </div>
    </div>
  );
}
```

### Commit

```
git add src/components/admin/model-builder/model-builder.tsx
git commit -m "feat: add model builder orchestrator component

ModelBuilder ties together UploadPanel, ModelViewerCanvas, and MeshInspector
in a split-panel layout. Manages all state: model URL, mesh bindings,
selection, dirty tracking. Saves the final RenderConfig (with modelUrl and
cleaned meshBindings) to the product via PATCH /api/v1/products/:id."
```

---

## Task 6: Model Builder Page + Product Form Link

The server page that loads the product data and renders the model builder, plus a link from the product edit form.

### Files

- [ ] Create `src/app/admin/products/[productId]/model/page.tsx`
- [ ] Modify `src/components/admin/product-form.tsx` — add link to model builder

### Code

```tsx
// src/app/admin/products/[productId]/model/page.tsx
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { ModelBuilder } from "@/components/admin/model-builder/model-builder";
import type { RenderConfig, SchemaOptionDef } from "@/types/schema";

export default async function ModelBuilderPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const admin = await requireAdmin();
  const { productId } = await params;

  const product = await prisma.product.findFirst({
    where: { id: productId, tenantId: admin.tenantId },
  });

  if (!product) {
    notFound();
  }

  // Extract render config
  const rawRenderConfig = product.renderConfig as Record<string, unknown> | null;
  const renderConfig: RenderConfig = {
    pipeline: (rawRenderConfig?.pipeline as RenderConfig["pipeline"]) ?? "part-assembly",
    meshBindings: (rawRenderConfig?.meshBindings as RenderConfig["meshBindings"]) ?? {},
    ...(rawRenderConfig?.modelUrl ? { modelUrl: rawRenderConfig.modelUrl as string } : {}),
  };

  // Extract product options for binding dropdowns
  const productSchema = product.productSchema as { options?: unknown[] } | null;
  const rawOptions: unknown[] = productSchema?.options ?? [];
  const productOptions = rawOptions.map((raw) => {
    const o = raw as { id?: string; label?: string };
    return {
      id: typeof o.id === "string" ? o.id : "unknown",
      label: typeof o.label === "string" ? o.label : "Unknown Option",
    };
  });

  return (
    <ModelBuilder
      productId={product.id}
      productName={product.name}
      productOptions={productOptions}
      initialRenderConfig={renderConfig as RenderConfig & { modelUrl?: string }}
    />
  );
}
```

### Modification to `src/components/admin/product-form.tsx`

After the "Render Pipeline" `<select>` block and before the "Active toggle" `<div>`, add a link to the model builder (only visible when editing and pipeline is `part-assembly`):

**Find** this exact block in `src/components/admin/product-form.tsx`:

```tsx
          {/* Active toggle */}
          <div className="flex items-center gap-3 sm:justify-end">
```

**Replace with:**

```tsx
          {/* 3D Model Builder link (only for part-assembly pipeline on existing products) */}
          {isEditing && renderPipeline === "part-assembly" && (
            <div className="sm:col-span-2">
              <a
                href={`/admin/products/${productId}/model`}
                className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                  <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                  <line x1="12" y1="22.08" x2="12" y2="12" />
                </svg>
                Configure 3D Model
              </a>
            </div>
          )}

          {/* Active toggle */}
          <div className="flex items-center gap-3 sm:justify-end">
```

### Commit

```
git add src/app/admin/products/[productId]/model/page.tsx src/components/admin/product-form.tsx
git commit -m "feat: add model builder page and link from product form

Server page at /admin/products/[productId]/model loads the product,
extracts renderConfig and product options, and renders the ModelBuilder
client component. Adds a 'Configure 3D Model' link button to the
product form when pipeline is part-assembly and product already exists."
```

---

## Task 7: Add .gitignore Entry for Uploaded Models

Ensure uploaded model files are not committed to the repo.

### Files

- [ ] Modify `.gitignore`

### Modification

Append to `.gitignore`:

```
# Uploaded 3D models (local dev storage)
public/uploads/models/
```

### Commit

```
git add .gitignore
git commit -m "chore: gitignore uploaded 3D models directory"
```

---

## Summary of Deliverables

| # | Deliverable | File(s) |
|---|-------------|---------|
| 1 | GLB upload API | `src/app/api/v1/models/upload/route.ts` |
| 2 | Upload panel | `src/components/admin/model-builder/upload-panel.tsx` |
| 3 | 3D viewer + mesh selection | `src/components/admin/model-builder/model-viewer.tsx`, `mesh-highlighter.tsx` |
| 4 | Mesh inspector | `src/components/admin/model-builder/mesh-inspector.tsx` |
| 5 | Model builder orchestrator | `src/components/admin/model-builder/model-builder.tsx` |
| 6 | Admin page + form link | `src/app/admin/products/[productId]/model/page.tsx`, modified `product-form.tsx` |
| 7 | Gitignore entry | `.gitignore` |

## Testing Checklist

After implementation, verify:

- [ ] Navigate to `/admin/products/{id}` and see "Configure 3D Model" link when pipeline is `part-assembly`
- [ ] Click the link to reach `/admin/products/{id}/model`
- [ ] Drag-and-drop a `.glb` file onto the upload zone
- [ ] Model renders in the 3D viewport with orbit controls
- [ ] Hover over meshes to see wireframe highlight
- [ ] Click a mesh to select it (blue pulsing wireframe)
- [ ] Mesh list in inspector populates with all scene meshes
- [ ] Select a mesh from the list to highlight it in the viewport
- [ ] Assign a role, material preset, color option, emissive option
- [ ] Add a visibility condition
- [ ] Click "Save Config" and verify the PATCH request succeeds
- [ ] Reload the page and verify all bindings are restored from the database
- [ ] Click "Reset" to clear all bindings
- [ ] Click "Back" arrow to return to product edit page
- [ ] Upload a non-GLB file and verify rejection
- [ ] Upload a file >50MB and verify rejection
