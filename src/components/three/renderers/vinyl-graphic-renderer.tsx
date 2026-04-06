"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useConfiguratorStore } from "@/stores/configurator-store";

interface VinylGraphicRendererProps {
  width: number;
  height: number;
  vinylType: "calendered" | "cast" | "reflective" | "perforated-window";
  applicationSurface: "wall" | "window" | "floor" | "vehicle";
}

const VINYL_DEPTH = 0.05;
const SURFACE_DEPTH = 0.5;
const SURFACE_PADDING = 6;

export function VinylGraphicRenderer({
  width,
  height,
  vinylType,
  applicationSurface,
}: VinylGraphicRendererProps) {
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

  const surfaceMaterial = useMemo(() => {
    const configs: Record<
      string,
      { color: string; metalness: number; roughness: number; opacity?: number }
    > = {
      wall: { color: "#e8e4e0", metalness: 0, roughness: 0.9 },
      window: { color: "#a8d8ea", metalness: 0.1, roughness: 0.05, opacity: 0.3 },
      floor: { color: "#c0b8a8", metalness: 0, roughness: 0.7 },
      vehicle: { color: "#f0f0f0", metalness: 0.4, roughness: 0.3 },
    };
    const cfg = configs[applicationSurface];
    return new THREE.MeshStandardMaterial({
      color: cfg.color,
      metalness: cfg.metalness,
      roughness: cfg.roughness,
      ...(cfg.opacity ? { transparent: true, opacity: cfg.opacity } : {}),
    });
  }, [applicationSurface]);

  const vinylMaterial = useMemo(() => {
    const isPerforated = vinylType === "perforated-window";
    return new THREE.MeshStandardMaterial({
      color: "#f8f8f0",
      metalness: vinylType === "reflective" ? 0.5 : 0,
      roughness: vinylType === "reflective" ? 0.15 : 0.4,
      ...(isPerforated ? { transparent: true, opacity: 0.85 } : {}),
    });
  }, [vinylType]);

  return (
    <group>
      {/* Background surface */}
      <mesh position={[0, 0, -SURFACE_DEPTH / 2]}>
        <boxGeometry
          args={[
            width + SURFACE_PADDING * 2,
            height + SURFACE_PADDING * 2,
            SURFACE_DEPTH,
          ]}
        />
        <primitive object={surfaceMaterial} attach="material" />
      </mesh>

      {/* Vinyl graphic panel */}
      <mesh position={[0, 0, VINYL_DEPTH / 2]}>
        <boxGeometry args={[width, height, VINYL_DEPTH]} />
        <primitive object={vinylMaterial} attach="material" />
      </mesh>
    </group>
  );
}
