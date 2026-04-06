"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useConfiguratorStore } from "@/stores/configurator-store";
import { getLedColor } from "../utils/led-colors";
import { MATERIALS } from "../utils/constants";

interface CabinetRendererProps {
  width: number;
  height: number;
  depth?: number;
  led: string;
  doubleFace: boolean;
}

export function CabinetRenderer({
  width,
  height,
  depth = 6,
  led,
  doubleFace,
}: CabinetRendererProps) {
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

  const bodyMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#d0d0d0",
        metalness: MATERIALS.ALUMINUM.metalness,
        roughness: MATERIALS.ALUMINUM.roughness,
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
      <mesh castShadow receiveShadow>
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
