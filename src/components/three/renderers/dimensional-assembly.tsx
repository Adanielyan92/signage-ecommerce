"use client";

import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { useConfiguratorStore } from "@/stores/configurator-store";
import { useFont } from "../hooks/use-font";
import { SignLetter } from "../sign-letter";
import { clearGeometryCache } from "../utils/geometry-cache";
import { computeLetterPositions, getTotalWidth } from "../utils/letter-layout";

interface DimensionalAssemblyProps {
  text: string;
  height: number;
  font: string;
  thickness: string;
  materialType: string; // acrylic, painted-metal, brushed-metal, flat-cut-aluminum
  painting: string;
}

const QUALITY_MAP: Record<string, number> = {
  low: 4,
  medium: 8,
  high: 12,
};

function getDimensionalMaterials(
  materialType: string,
  painting: string
): { face: THREE.Material; sides: THREE.Material } {
  const isPainted = painting !== "-";

  switch (materialType) {
    case "acrylic":
      return {
        face: new THREE.MeshPhysicalMaterial({
          color: "#e0f0ff",
          transmission: 0.3,
          roughness: 0.1,
          ior: 1.49,
          thickness: 0.5,
        }),
        sides: new THREE.MeshPhysicalMaterial({
          color: "#e0f0ff",
          transmission: 0.2,
          roughness: 0.15,
          ior: 1.49,
        }),
      };

    case "painted-metal":
      return {
        face: new THREE.MeshStandardMaterial({
          color: isPainted ? "#2c3e50" : "#404040",
          metalness: 0.6,
          roughness: 0.5,
        }),
        sides: new THREE.MeshStandardMaterial({
          color: isPainted ? "#2c3e50" : "#404040",
          metalness: 0.6,
          roughness: 0.5,
        }),
      };

    case "brushed-metal":
      // Use MeshPhysicalMaterial with anisotropy for realistic brushed finish
      return {
        face: new THREE.MeshPhysicalMaterial({
          color: "#c8c8c8",
          metalness: 0.95,
          roughness: 0.15,
          anisotropy: 0.8,
          anisotropyRotation: 0,
        }),
        sides: new THREE.MeshPhysicalMaterial({
          color: "#c0c0c0",
          metalness: 0.9,
          roughness: 0.2,
          anisotropy: 0.5,
          anisotropyRotation: Math.PI / 2,
        }),
      };

    case "flat-cut-aluminum":
    default:
      return {
        face: new THREE.MeshStandardMaterial({
          color: "#b0b0b0",
          metalness: 0.85,
          roughness: 0.25,
        }),
        sides: new THREE.MeshStandardMaterial({
          color: "#a0a0a0",
          metalness: 0.85,
          roughness: 0.3,
        }),
      };
  }
}

export function DimensionalAssembly({
  text,
  height,
  font: fontName,
  thickness,
  materialType,
  painting,
}: DimensionalAssemblyProps) {
  const quality = useConfiguratorStore((s) => s.quality);
  const setDimensions = useConfiguratorStore((s) => s.setDimensions);
  const font = useFont(fontName);
  const prevFontName = useRef(fontName);

  const depth = parseFloat(thickness) || 1;
  const curveSegments = QUALITY_MAP[quality] || 8;

  // Clear geometry cache when font changes
  useEffect(() => {
    if (prevFontName.current !== fontName) {
      clearGeometryCache();
      prevFontName.current = fontName;
    }
  }, [fontName]);

  // Materials with proper disposal via effect cleanup
  const materials = useMemo(
    () => getDimensionalMaterials(materialType, painting),
    [materialType, painting]
  );

  useEffect(() => {
    return () => {
      materials.face.dispose();
      materials.sides.dispose();
    };
  }, [materials]);

  // Compute per-character positions using shared helper
  const letterPositions = useMemo(() => {
    if (!font) return [];
    return computeLetterPositions(font, text, height);
  }, [font, text, height]);

  // Feed dimensions back to the store for pricing
  const prevDimsRef = useRef("");
  useEffect(() => {
    if (letterPositions.length > 0) {
      const totalWidth = getTotalWidth(letterPositions);
      const dimsKey = `${totalWidth}:${height}`;
      if (dimsKey !== prevDimsRef.current) {
        prevDimsRef.current = dimsKey;
        setDimensions({
          totalWidthInches: totalWidth,
          heightInches: height,
          squareFeet: (totalWidth * height) / 144,
          linearFeet: ((totalWidth + height) * 2) / 12,
          letterWidths: letterPositions.map((p) => p.width),
        });
      }
    }
  }, [letterPositions, height, setDimensions]);

  const totalWidth = getTotalWidth(letterPositions);
  const xOffset = -totalWidth / 2;

  if (!font) return null;

  return (
    <group>
      {letterPositions.map((lp, i) => (
        <SignLetter
          key={`${lp.char}-${i}`}
          char={lp.char}
          font={font}
          fontSize={height}
          depth={depth}
          curveSegments={curveSegments}
          position={[lp.x + xOffset, 0, 0]}
          faceMaterial={materials.face}
          sidesMaterial={materials.sides}
          fontName={fontName}
          bevelEnabled={false}
        />
      ))}
    </group>
  );
}
