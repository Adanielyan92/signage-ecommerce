"use client";

import * as THREE from "three";
import { useMemo } from "react";

interface PrintSignRendererProps {
  width: number;
  height: number;
  materialType: string; // acm-panel, coroplast, foam-board
}

function getPanelAppearance(materialType: string): {
  color: string;
  metalness: number;
  roughness: number;
  thickness: number;
} {
  switch (materialType) {
    case "acm-panel":
      // Aluminum composite: slightly glossy, silver-white
      return { color: "#e8e8e8", metalness: 0.6, roughness: 0.25, thickness: 0.25 };

    case "coroplast":
      // Corrugated plastic: matte white, thicker from flutes
      return { color: "#f5f5f0", metalness: 0.0, roughness: 0.7, thickness: 0.4 };

    case "foam-board":
      // Foam core: matte white, lightweight appearance
      return { color: "#ffffff", metalness: 0.0, roughness: 0.85, thickness: 0.5 };

    default:
      return { color: "#f0f0f0", metalness: 0.0, roughness: 0.5, thickness: 0.3 };
  }
}

/**
 * Flat panel renderer for printed signs (ACM, Coroplast, Foam Board).
 * Renders a thin slab with material-appropriate surface finish.
 */
export function PrintSignRenderer({
  width,
  height,
  materialType,
}: PrintSignRendererProps) {
  const appearance = getPanelAppearance(materialType);

  const panelMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: appearance.color,
        metalness: appearance.metalness,
        roughness: appearance.roughness,
      }),
    [appearance.color, appearance.metalness, appearance.roughness]
  );

  // Thin edge material slightly darker
  const edgeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: materialType === "coroplast" ? "#e0e0d8" : "#d0d0d0",
        metalness: appearance.metalness * 0.5,
        roughness: Math.min(appearance.roughness + 0.1, 1.0),
      }),
    [materialType, appearance.metalness, appearance.roughness]
  );

  // Printed face: slightly different surface to simulate printed vinyl
  const printFaceMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#f8f8f8",
        metalness: 0.0,
        roughness: 0.3,
      }),
    []
  );

  return (
    <group>
      {/* Panel body */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[width, height, appearance.thickness]} />
        <primitive object={edgeMaterial} attach="material" />
      </mesh>

      {/* Front printed face */}
      <mesh position={[0, 0, appearance.thickness / 2 + 0.01]}>
        <planeGeometry args={[width, height]} />
        <primitive object={printFaceMaterial} attach="material" />
      </mesh>

      {/* Back panel face */}
      <mesh
        position={[0, 0, -(appearance.thickness / 2 + 0.01)]}
        rotation={[0, Math.PI, 0]}
      >
        <planeGeometry args={[width, height]} />
        <primitive object={panelMaterial} attach="material" />
      </mesh>
    </group>
  );
}
