"use client";

import { useMemo } from "react";
import * as THREE from "three";
import type { Font } from "opentype.js";
import { createGlyphGeometry } from "./utils/glyph-to-geometry";
import {
  getCachedGeometry,
  setCachedGeometry,
} from "./utils/geometry-cache";

interface SignLetterProps {
  char: string;
  font: Font;
  fontSize: number;
  depth: number;
  curveSegments: number;
  position: [number, number, number];
  faceMaterial: THREE.Material;
  sidesMaterial: THREE.Material;
  fontName: string;
  bevelEnabled: boolean;
}

export function SignLetter({
  char,
  font,
  fontSize,
  depth,
  curveSegments,
  position,
  faceMaterial,
  sidesMaterial,
  fontName,
  bevelEnabled,
}: SignLetterProps) {
  const geometry = useMemo(() => {
    const charCode = char.charCodeAt(0);

    // Check cache (now includes bevel in key)
    const cached = getCachedGeometry(fontName, charCode, depth, curveSegments, bevelEnabled);
    if (cached !== undefined) return cached;

    // Create geometry from opentype glyph
    const glyph = font.charToGlyph(char);
    const path = glyph.getPath(0, 0, fontSize);

    const geo = createGlyphGeometry(path.commands, {
      depth,
      curveSegments,
      bevelEnabled,
      bevelThickness: bevelEnabled ? 0.2 : 0,
      bevelSize: bevelEnabled ? 0.1 : 0,
    });

    setCachedGeometry(fontName, charCode, depth, curveSegments, geo, bevelEnabled);
    return geo;
  }, [char, font, fontSize, depth, curveSegments, fontName, bevelEnabled]);

  if (!geometry) return null;

  return (
    <mesh
      geometry={geometry}
      position={position}
      material={[faceMaterial, sidesMaterial]}
      castShadow
      receiveShadow
    />
  );
}
