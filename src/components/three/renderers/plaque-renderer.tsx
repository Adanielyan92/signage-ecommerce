"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useConfiguratorStore } from "@/stores/configurator-store";

interface PlaqueRendererProps {
  width: number;
  height: number;
  material: "aluminum" | "acrylic" | "wood" | "brass";
  thickness: "1/8" | "1/4" | "3/8";
  finish: "brushed" | "polished" | "matte" | "painted";
  mounting: "standoffs" | "flat" | "easel";
}

const THICKNESS_MAP: Record<string, number> = {
  "1/8": 0.125,
  "1/4": 0.25,
  "3/8": 0.375,
};

const STANDOFF_RADIUS = 0.3;
const STANDOFF_LENGTH = 0.8;
const STANDOFF_INSET = 1.5;

export function PlaqueRenderer({
  width,
  height,
  material,
  thickness,
  finish,
  mounting,
}: PlaqueRendererProps) {
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

  const plaqueMaterial = useMemo(() => {
    const configs: Record<
      string,
      { color: string; metalness: number; roughness: number }
    > = {
      aluminum: { color: "#c0c0c0", metalness: 0.85, roughness: finish === "polished" ? 0.1 : finish === "brushed" ? 0.4 : 0.6 },
      acrylic: { color: "#e8e8f0", metalness: 0, roughness: 0.1 },
      wood: { color: "#8B6914", metalness: 0, roughness: 0.8 },
      brass: { color: "#D4A843", metalness: 0.9, roughness: finish === "polished" ? 0.1 : 0.35 },
    };
    const cfg = configs[material];
    return new THREE.MeshStandardMaterial({
      color: cfg.color,
      metalness: cfg.metalness,
      roughness: cfg.roughness,
    });
  }, [material, finish]);

  const standoffMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#c0c0c0",
        metalness: 0.9,
        roughness: 0.2,
      }),
    []
  );

  const depth = THICKNESS_MAP[thickness];

  return (
    <group>
      {/* Main plaque panel */}
      <mesh position={[0, 0, mounting === "standoffs" ? STANDOFF_LENGTH : 0]}>
        <boxGeometry args={[width, height, depth]} />
        <primitive object={plaqueMaterial} attach="material" />
      </mesh>

      {/* Standoffs (4 corners) */}
      {mounting === "standoffs" && (
        <>
          {[
            [-width / 2 + STANDOFF_INSET, height / 2 - STANDOFF_INSET],
            [width / 2 - STANDOFF_INSET, height / 2 - STANDOFF_INSET],
            [-width / 2 + STANDOFF_INSET, -height / 2 + STANDOFF_INSET],
            [width / 2 - STANDOFF_INSET, -height / 2 + STANDOFF_INSET],
          ].map(([x, y], i) => (
            <mesh
              key={`standoff-${i}`}
              position={[x, y, STANDOFF_LENGTH / 2]}
              rotation={[Math.PI / 2, 0, 0]}
            >
              <cylinderGeometry
                args={[STANDOFF_RADIUS, STANDOFF_RADIUS, STANDOFF_LENGTH, 12]}
              />
              <primitive object={standoffMaterial} attach="material" />
            </mesh>
          ))}
        </>
      )}

      {/* Easel stand */}
      {mounting === "easel" && (
        <mesh
          position={[0, -height * 0.1, -height * 0.35]}
          rotation={[-Math.PI / 6, 0, 0]}
        >
          <boxGeometry args={[0.5, height * 0.8, 0.3]} />
          <primitive object={standoffMaterial} attach="material" />
        </mesh>
      )}
    </group>
  );
}
