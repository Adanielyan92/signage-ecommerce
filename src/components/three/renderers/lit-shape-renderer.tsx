"use client";

import * as THREE from "three";
import { useMemo } from "react";

interface LitShapeRendererProps {
  width: number;
  height: number;
  depth?: number;
  led: string;
  painting: string;
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

export function LitShapeRenderer({
  width,
  height,
  depth = 4,
  led,
  painting,
}: LitShapeRendererProps) {
  const ledColor = LED_COLORS[led] || "#FFFFFF";
  const isPainted = painting !== "-";

  const bodyMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isPainted ? "#2c3e50" : "#c0c0c0",
        metalness: 0.8,
        roughness: 0.3,
      }),
    [isPainted]
  );

  const faceMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        emissive: new THREE.Color(ledColor),
        emissiveIntensity: 1.5,
        transmission: 0.4,
        roughness: 0.15,
        thickness: 0.25,
      }),
    [ledColor]
  );

  return (
    <group>
      {/* Sign body */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[width, height, depth]} />
        <primitive object={bodyMaterial} attach="material" />
      </mesh>

      {/* Lit face */}
      <mesh position={[0, 0, depth / 2 + 0.1]}>
        <planeGeometry args={[width - 0.5, height - 0.5]} />
        <primitive object={faceMaterial} attach="material" />
      </mesh>
    </group>
  );
}
