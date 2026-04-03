"use client";

import * as THREE from "three";
import { useMemo, useRef, useEffect } from "react";
import { useFont } from "../hooks/use-font";
import { SignLetter } from "../sign-letter";
import { clearGeometryCache } from "../utils/geometry-cache";

interface DimensionalRendererProps {
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
      return {
        face: new THREE.MeshStandardMaterial({
          color: "#c8c8c8",
          metalness: 0.95,
          roughness: 0.15,
        }),
        sides: new THREE.MeshStandardMaterial({
          color: "#c0c0c0",
          metalness: 0.9,
          roughness: 0.2,
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

export function DimensionalRenderer({
  text,
  height,
  font: fontName,
  thickness,
  materialType,
  painting,
}: DimensionalRendererProps) {
  const font = useFont(fontName);
  const prevFontName = useRef(fontName);

  const textNoSpaces = (text || "").replace(/\s+/g, "");
  const depth = parseFloat(thickness) || 1;
  const curveSegments = QUALITY_MAP["medium"];

  // Clear geometry cache when font changes
  useEffect(() => {
    if (prevFontName.current !== fontName) {
      clearGeometryCache();
      prevFontName.current = fontName;
    }
  }, [fontName]);

  const materials = useMemo(
    () => getDimensionalMaterials(materialType, painting),
    [materialType, painting]
  );

  // Compute per-character positions using font metrics
  // Same logic as SignAssembly
  const letterPositions = useMemo(() => {
    if (!font || textNoSpaces.length === 0) return [];
    const scale = height / font.unitsPerEm;
    const positions: { char: string; x: number; width: number }[] = [];
    let x = 0;

    for (let i = 0; i < textNoSpaces.length; i++) {
      const glyph = font.charToGlyph(textNoSpaces[i]);
      const advanceWidth =
        (glyph.advanceWidth || font.unitsPerEm * 0.6) * scale;
      positions.push({ char: textNoSpaces[i], x, width: advanceWidth });
      x += advanceWidth;

      if (i < textNoSpaces.length - 1) {
        const nextGlyph = font.charToGlyph(textNoSpaces[i + 1]);
        x += font.getKerningValue(glyph, nextGlyph) * scale;
      }
    }
    return positions;
  }, [font, textNoSpaces, height]);

  const totalWidth =
    letterPositions.length > 0
      ? letterPositions[letterPositions.length - 1].x +
        letterPositions[letterPositions.length - 1].width
      : 0;
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
