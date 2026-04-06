"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useConfiguratorStore } from "@/stores/configurator-store";

interface AFrameRendererProps {
  width: number;
  height: number;
  material: "corrugated-plastic" | "aluminum" | "steel";
  doubleSided: boolean;
  insertType: "printed-panel" | "chalkboard" | "dry-erase";
}

const PANEL_DEPTH = 0.5;
const HINGE_GAP = 0.3;
const FRAME_ANGLE = Math.PI / 7; // ~25 degrees from vertical

export function AFrameRenderer({
  width,
  height,
  material,
  doubleSided,
  insertType,
}: AFrameRendererProps) {
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

  const frameMaterial = useMemo(() => {
    const colorMap: Record<string, string> = {
      "corrugated-plastic": "#f0f0e8",
      aluminum: "#c0c0c0",
      steel: "#707070",
    };
    const metalnessMap: Record<string, number> = {
      "corrugated-plastic": 0,
      aluminum: 0.8,
      steel: 0.85,
    };
    return new THREE.MeshStandardMaterial({
      color: colorMap[material],
      metalness: metalnessMap[material],
      roughness: material === "corrugated-plastic" ? 0.8 : 0.35,
    });
  }, [material]);

  const panelMaterial = useMemo(() => {
    const colorMap: Record<string, string> = {
      "printed-panel": "#f8f8f0",
      chalkboard: "#2a2a2a",
      "dry-erase": "#ffffff",
    };
    return new THREE.MeshStandardMaterial({
      color: colorMap[insertType],
      metalness: 0,
      roughness: insertType === "chalkboard" ? 0.9 : 0.3,
    });
  }, [insertType]);

  const hingeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#404040",
        metalness: 0.8,
        roughness: 0.3,
      }),
    []
  );

  return (
    <group>
      {/* Front panel — tilted forward */}
      <group
        position={[0, 0, HINGE_GAP / 2]}
        rotation={[FRAME_ANGLE, 0, 0]}
      >
        {/* Frame */}
        <mesh>
          <boxGeometry args={[width, height, PANEL_DEPTH]} />
          <primitive object={frameMaterial} attach="material" />
        </mesh>
        {/* Panel face */}
        <mesh position={[0, 0, PANEL_DEPTH / 2 + 0.05]}>
          <planeGeometry args={[width - 2, height - 2]} />
          <primitive object={panelMaterial} attach="material" />
        </mesh>
      </group>

      {/* Back panel — tilted backward */}
      {doubleSided && (
        <group
          position={[0, 0, -HINGE_GAP / 2]}
          rotation={[-FRAME_ANGLE, 0, 0]}
        >
          <mesh>
            <boxGeometry args={[width, height, PANEL_DEPTH]} />
            <primitive object={frameMaterial} attach="material" />
          </mesh>
          <mesh
            position={[0, 0, -(PANEL_DEPTH / 2 + 0.05)]}
            rotation={[0, Math.PI, 0]}
          >
            <planeGeometry args={[width - 2, height - 2]} />
            <primitive object={panelMaterial} attach="material" />
          </mesh>
        </group>
      )}

      {/* Hinge bar at the top */}
      <mesh position={[0, height / 2 - 1, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.3, 0.3, width - 2, 8]} />
        <primitive object={hingeMaterial} attach="material" />
      </mesh>
    </group>
  );
}
