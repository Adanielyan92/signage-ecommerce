"use client";

import * as THREE from "three";
import { useMemo } from "react";

interface LogoRendererProps {
  width: number;
  height: number;
  depth?: number;
  led?: string;
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

/**
 * Placeholder renderer for logo signs.
 * Renders as a rounded-ish box with optional LED glow on the face.
 * Will be replaced with SVG-based extrusion when custom logo uploads land.
 */
export function LogoRenderer({
  width,
  height,
  depth = 3,
  led,
  painting,
}: LogoRendererProps) {
  const isLit = !!led && led !== "-";
  const ledColor = isLit ? (LED_COLORS[led!] || "#FFFFFF") : "#000000";
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

  const faceMaterial = useMemo(() => {
    if (isLit) {
      return new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        emissive: new THREE.Color(ledColor),
        emissiveIntensity: 1.2,
        transmission: 0.35,
        roughness: 0.15,
        thickness: 0.2,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: isPainted ? "#2c3e50" : "#b0b0b0",
      metalness: 0.7,
      roughness: 0.4,
    });
  }, [isLit, ledColor, isPainted]);

  return (
    <group>
      {/* Logo body -- placeholder rectangle */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[width, height, depth]} />
        <primitive object={bodyMaterial} attach="material" />
      </mesh>

      {/* Face overlay */}
      <mesh position={[0, 0, depth / 2 + 0.08]}>
        <planeGeometry args={[width - 0.4, height - 0.4]} />
        <primitive object={faceMaterial} attach="material" />
      </mesh>

      {/* Back glow for lit logos */}
      {isLit && (
        <rectAreaLight
          position={[0, 0, -(depth / 2 + 0.5)]}
          width={width * 0.8}
          height={height * 0.8}
          color={ledColor}
          intensity={3}
          rotation={[0, Math.PI, 0]}
        />
      )}
    </group>
  );
}
