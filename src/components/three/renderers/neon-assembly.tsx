"use client";

import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useConfiguratorStore } from "@/stores/configurator-store";
import { useFont } from "../hooks/use-font";
import { SignLetter } from "../sign-letter";
import { clearGeometryCache } from "../utils/geometry-cache";

interface NeonAssemblyProps {
  text: string;
  height: number;
  font: string;
  neonColor: string;
  backer: "clear-acrylic" | "black-acrylic" | "none";
  backerShape: "rectangular" | "contour";
}

const NEON_COLORS: Record<string, string> = {
  "warm-white": "#FFD4A0",
  "cool-white": "#E3EEFF",
  pink: "#FF69B4",
  red: "#FF0000",
  blue: "#0066FF",
  green: "#00FF00",
  rgb: "#FF0000",
};

const QUALITY_MAP: Record<string, number> = {
  low: 4,
  medium: 8,
  high: 12,
};

const NEON_DEPTH = 0.3;
const BACKER_PADDING = 2;

export function NeonAssembly({
  text,
  height,
  font: fontName,
  neonColor,
  backer,
  backerShape,
}: NeonAssemblyProps) {
  const quality = useConfiguratorStore((s) => s.quality);
  const setDimensions = useConfiguratorStore((s) => s.setDimensions);
  const font = useFont(fontName);
  const prevFontName = useRef(fontName);
  const rgbRef = useRef<THREE.MeshPhysicalMaterial | null>(null);

  const textNoSpaces = (text || "").replace(/\s+/g, "");
  const curveSegments = QUALITY_MAP[quality] || 8;

  // Clear geometry cache when font changes
  useEffect(() => {
    if (prevFontName.current !== fontName) {
      clearGeometryCache();
      prevFontName.current = fontName;
    }
  }, [fontName]);

  const neonHex = NEON_COLORS[neonColor] || "#FFFFFF";

  const neonMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: neonHex,
        emissive: new THREE.Color(neonHex),
        emissiveIntensity: 3.0,
        roughness: 0.15,
        transmission: 0.1,
      }),
    [neonHex]
  );

  // Track the neon material for RGB animation
  useEffect(() => {
    if (neonColor === "rgb") {
      rgbRef.current = neonMaterial;
    } else {
      rgbRef.current = null;
    }
  }, [neonColor, neonMaterial]);

  // RGB hue cycling animation
  useFrame((state) => {
    if (neonColor === "rgb" && rgbRef.current) {
      const hue = (state.clock.elapsedTime * 0.1) % 1;
      rgbRef.current.emissive.setHSL(hue, 1, 0.5);
    }
  });

  // Compute per-character positions using font metrics
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

  // Feed dimensions back to the store for pricing
  const prevDimsRef = useRef("");
  useEffect(() => {
    if (letterPositions.length > 0) {
      const last = letterPositions[letterPositions.length - 1];
      const totalWidth = last.x + last.width;
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

  const totalWidth =
    letterPositions.length > 0
      ? letterPositions[letterPositions.length - 1].x +
        letterPositions[letterPositions.length - 1].width
      : 0;
  const xOffset = -totalWidth / 2;

  const backerWidth = totalWidth + BACKER_PADDING * 2;
  const backerHeight = height + BACKER_PADDING * 2;

  const backerMaterial = useMemo(() => {
    if (backer === "clear-acrylic") {
      return new THREE.MeshPhysicalMaterial({
        color: "#d0e8ff",
        transmission: 0.3,
        roughness: 0.1,
        transparent: true,
        opacity: 0.6,
      });
    }
    if (backer === "black-acrylic") {
      return new THREE.MeshStandardMaterial({
        color: "#1a1a1a",
        metalness: 0.1,
        roughness: 0.4,
      });
    }
    return null;
  }, [backer]);

  if (!font) return null;

  return (
    <group>
      {/* Neon letters */}
      {letterPositions.map((lp, i) => (
        <SignLetter
          key={`${lp.char}-${i}`}
          char={lp.char}
          font={font}
          fontSize={height}
          depth={NEON_DEPTH}
          curveSegments={curveSegments}
          position={[lp.x + xOffset, 0, 0]}
          faceMaterial={neonMaterial}
          sidesMaterial={neonMaterial}
          fontName={fontName}
          bevelEnabled={false}
        />
      ))}

      {/* Backer panel */}
      {backer !== "none" && backerMaterial && totalWidth > 0 && (
        <mesh position={[0, height / 2, -(NEON_DEPTH + 0.5)]}>
          <planeGeometry args={[backerWidth, backerHeight]} />
          <primitive object={backerMaterial} attach="material" />
        </mesh>
      )}
    </group>
  );
}
