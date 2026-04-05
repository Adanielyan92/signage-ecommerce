"use client";

import { Suspense, useCallback, useRef, useState, useEffect } from "react";
import * as THREE from "three";
import { Canvas, ThreeEvent } from "@react-three/fiber";
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
