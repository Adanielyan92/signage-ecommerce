"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useConfiguratorStore } from "@/stores/configurator-store";
import { getLedColor } from "../utils/led-colors";

interface LogoRendererProps {
  width: number;
  height: number;
  depth?: number;
  led?: string;
  painting: string;
}

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
  const setDimensions = useConfiguratorStore((s) => s.setDimensions);
  const prevDims = useRef("");

  useEffect(() => {
    const key = `${width}:${height}`;
    if (key === prevDims.current) return;
    prevDims.current = key;
    setDimensions({
      totalWidthInches: width,
      heightInches: height,
      squareFeet: (width * height) / 144,
      linearFeet: ((width + height) * 2) / 12,
      letterWidths: [],
    });
  }, [width, height, setDimensions]);

  const isLit = !!led && led !== "-";
  const ledColor = isLit ? getLedColor(led!) : "#000000";
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
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
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
