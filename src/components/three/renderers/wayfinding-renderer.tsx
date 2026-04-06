"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useConfiguratorStore } from "@/stores/configurator-store";

interface WayfindingRendererProps {
  width: number;
  height: number;
  material: "acrylic" | "photopolymer" | "pvc";
  adaCompliant: boolean;
  pictogram: "arrow" | "restroom" | "exit" | "custom" | "none";
  mounting: "wall" | "projecting" | "ceiling-hung";
}

const PANEL_DEPTH = 0.25;
const BRAILLE_DOT_RADIUS = 0.06;
const BRAILLE_OFFSET_Z = 0.05;
const BRACKET_SIZE = 0.5;

export function WayfindingRenderer({
  width,
  height,
  material,
  adaCompliant,
  pictogram,
  mounting,
}: WayfindingRendererProps) {
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

  const panelMaterial = useMemo(() => {
    const configs: Record<
      string,
      { color: string; metalness: number; roughness: number }
    > = {
      acrylic: { color: "#1a365d", metalness: 0, roughness: 0.15 },
      photopolymer: { color: "#1e3a5f", metalness: 0, roughness: 0.3 },
      pvc: { color: "#2d3748", metalness: 0, roughness: 0.5 },
    };
    const cfg = configs[material];
    return new THREE.MeshStandardMaterial({
      color: cfg.color,
      metalness: cfg.metalness,
      roughness: cfg.roughness,
    });
  }, [material]);

  const textRaisedMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#f0f0f0",
        metalness: 0,
        roughness: 0.3,
      }),
    []
  );

  const bracketMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#808080",
        metalness: 0.7,
        roughness: 0.3,
      }),
    []
  );

  // Generate braille dot positions (simplified grid pattern)
  const brailleDots = useMemo(() => {
    if (!adaCompliant) return [];
    const dots: [number, number, number][] = [];
    const startX = -width / 4;
    const startY = -height / 3;
    const spacing = 0.25;
    // Two columns of 3 dots (one braille cell pattern, repeated)
    for (let cell = 0; cell < 4; cell++) {
      const cx = startX + cell * 0.6;
      for (let col = 0; col < 2; col++) {
        for (let row = 0; row < 3; row++) {
          if (Math.random() > 0.4) {
            dots.push([
              cx + col * spacing,
              startY + row * spacing,
              PANEL_DEPTH / 2 + BRAILLE_OFFSET_Z,
            ]);
          }
        }
      }
    }
    return dots;
  }, [adaCompliant, width, height]);

  // Pictogram indicator (simple shape)
  const showPictogram = pictogram !== "none";

  return (
    <group>
      {/* Main panel */}
      <mesh>
        <boxGeometry args={[width, height, PANEL_DEPTH]} />
        <primitive object={panelMaterial} attach="material" />
      </mesh>

      {/* Raised text area (simplified as a lighter rectangle) */}
      <mesh position={[0, height * 0.1, PANEL_DEPTH / 2 + 0.03]}>
        <boxGeometry args={[width * 0.7, height * 0.25, 0.06]} />
        <primitive object={textRaisedMaterial} attach="material" />
      </mesh>

      {/* Pictogram area */}
      {showPictogram && (
        <mesh position={[-width * 0.3, height * 0.1, PANEL_DEPTH / 2 + 0.03]}>
          <boxGeometry args={[height * 0.3, height * 0.3, 0.06]} />
          <primitive object={textRaisedMaterial} attach="material" />
        </mesh>
      )}

      {/* Braille dots */}
      {brailleDots.map((pos, i) => (
        <mesh key={`braille-${i}`} position={pos}>
          <sphereGeometry args={[BRAILLE_DOT_RADIUS, 8, 8]} />
          <primitive object={textRaisedMaterial} attach="material" />
        </mesh>
      ))}

      {/* Projecting bracket */}
      {mounting === "projecting" && (
        <>
          <mesh position={[0, height / 2 + BRACKET_SIZE, -2]}>
            <boxGeometry args={[BRACKET_SIZE, BRACKET_SIZE, 4]} />
            <primitive object={bracketMaterial} attach="material" />
          </mesh>
          {/* Vertical support */}
          <mesh position={[0, height / 2 + BRACKET_SIZE / 2, -4]}>
            <boxGeometry args={[BRACKET_SIZE, BRACKET_SIZE * 2, BRACKET_SIZE]} />
            <primitive object={bracketMaterial} attach="material" />
          </mesh>
        </>
      )}

      {/* Ceiling hung cables */}
      {mounting === "ceiling-hung" && (
        <>
          <mesh position={[-width * 0.3, height / 2 + 6, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 12, 6]} />
            <primitive object={bracketMaterial} attach="material" />
          </mesh>
          <mesh position={[width * 0.3, height / 2 + 6, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 12, 6]} />
            <primitive object={bracketMaterial} attach="material" />
          </mesh>
        </>
      )}
    </group>
  );
}
