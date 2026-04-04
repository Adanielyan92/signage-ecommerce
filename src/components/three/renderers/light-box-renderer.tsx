"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useConfiguratorStore } from "@/stores/configurator-store";

interface LightBoxRendererProps {
  width: number;
  height: number;
  depth?: number;
  led: string;
  faceType: "translucent" | "push-through";
  shape: "rectangular" | "round";
}

const LED_COLORS: Record<string, string> = {
  "3000K": "#FFB46B",
  "3500K": "#FFC98E",
  "6000K": "#E3EEFF",
  Red: "#FF0000",
  Green: "#00FF00",
  Blue: "#0066FF",
  RGB: "#FF0000",
};

export function LightBoxRenderer({
  width,
  height,
  depth = 6,
  led,
  faceType,
  shape,
}: LightBoxRendererProps) {
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

  const ledColor = LED_COLORS[led] || "#FFFFFF";
  const emissiveIntensity = faceType === "push-through" ? 1.8 : 1.2;

  const bodyMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#c0c0c0",
        metalness: 0.75,
        roughness: 0.35,
      }),
    []
  );

  const faceMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        emissive: new THREE.Color(ledColor),
        emissiveIntensity,
        transmission: faceType === "translucent" ? 0.5 : 0.4,
        roughness: 0.1,
      }),
    [ledColor, emissiveIntensity, faceType]
  );

  const isRound = shape === "round";

  return (
    <group>
      {/* Light box body */}
      {isRound ? (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[width / 2, width / 2, depth, 32]} />
          <primitive object={bodyMaterial} attach="material" />
        </mesh>
      ) : (
        <mesh>
          <boxGeometry args={[width, height, depth]} />
          <primitive object={bodyMaterial} attach="material" />
        </mesh>
      )}

      {/* Front face (lit) */}
      {isRound ? (
        <mesh position={[0, 0, depth / 2 + 0.05]}>
          <circleGeometry args={[width / 2 - 0.3, 32]} />
          <primitive object={faceMaterial} attach="material" />
        </mesh>
      ) : (
        <mesh position={[0, 0, depth / 2 + 0.05]}>
          <planeGeometry args={[width - 0.3, height - 0.3]} />
          <primitive object={faceMaterial} attach="material" />
        </mesh>
      )}
    </group>
  );
}
