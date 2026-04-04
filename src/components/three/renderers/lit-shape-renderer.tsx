"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useConfiguratorStore } from "@/stores/configurator-store";
import { getLedColor } from "../utils/led-colors";

interface LitShapeRendererProps {
  width: number;
  height: number;
  depth?: number;
  led: string;
  painting: string;
}

export function LitShapeRenderer({
  width,
  height,
  depth = 4,
  led,
  painting,
}: LitShapeRendererProps) {
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

  const ledColor = getLedColor(led);
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
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
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
