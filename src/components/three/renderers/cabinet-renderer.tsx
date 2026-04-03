"use client";

import * as THREE from "three";
import { useMemo } from "react";

interface CabinetRendererProps {
  width: number;
  height: number;
  depth?: number;
  led: string;
  doubleFace: boolean;
}

const LED_COLORS: Record<string, string> = {
  "3000K": "#FFB46B",
  "3500K": "#FFC98E",
  "6000K": "#E3EEFF",
  "Red": "#FF0000",
  "Green": "#00FF00",
  "Blue": "#0066FF",
  RGB: "#FF0000",
};

export function CabinetRenderer({
  width,
  height,
  depth = 6,
  led,
  doubleFace,
}: CabinetRendererProps) {
  const ledColor = LED_COLORS[led] || "#FFFFFF";

  const bodyMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#d0d0d0",
        metalness: 0.7,
        roughness: 0.4,
      }),
    []
  );

  const litFaceMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        emissive: new THREE.Color(ledColor),
        emissiveIntensity: 1.2,
        transmission: 0.5,
        roughness: 0.1,
      }),
    [ledColor]
  );

  return (
    <group>
      {/* Cabinet body */}
      <mesh>
        <boxGeometry args={[width, height, depth]} />
        <primitive object={bodyMaterial} attach="material" />
      </mesh>

      {/* Front face (lit) */}
      <mesh position={[0, 0, depth / 2 + 0.05]}>
        <planeGeometry args={[width - 0.3, height - 0.3]} />
        <primitive object={litFaceMaterial} attach="material" />
      </mesh>

      {/* Back face (if double-sided) */}
      {doubleFace && (
        <mesh
          position={[0, 0, -(depth / 2 + 0.05)]}
          rotation={[0, Math.PI, 0]}
        >
          <planeGeometry args={[width - 0.3, height - 0.3]} />
          <primitive object={litFaceMaterial} attach="material" />
        </mesh>
      )}
    </group>
  );
}
