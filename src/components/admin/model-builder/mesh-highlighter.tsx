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
  useFrame(() => {
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
