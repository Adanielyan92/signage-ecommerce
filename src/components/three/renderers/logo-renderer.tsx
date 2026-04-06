"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import { useConfiguratorStore } from "@/stores/configurator-store";
import { getLedColor } from "../utils/led-colors";
import {
  parseSvgToShapes,
  scaleShapesToFit,
  type ParsedSvgShapes,
} from "../utils/svg-to-shapes";

// Preset logo SVGs for demo (star, arrow, shield)
const PRESET_LOGOS: Record<string, string> = {
  star: `<svg viewBox="0 0 100 100"><polygon points="50,5 63,38 98,38 70,60 80,95 50,73 20,95 30,60 2,38 37,38" /></svg>`,
  shield: `<svg viewBox="0 0 100 120"><path d="M50,5 L95,25 L95,60 Q95,95 50,115 Q5,95 5,60 L5,25 Z" /></svg>`,
  circle: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" /></svg>`,
};

interface LogoRendererProps {
  width: number;
  height: number;
  depth?: number;
  led?: string;
  painting: string;
  svgString?: string;
  presetShape?: string;
}

export function LogoRenderer({
  width,
  height,
  depth = 3,
  led,
  painting,
  svgString,
  presetShape = "shield",
}: LogoRendererProps) {
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

  const isLit = !!led && led !== "-";
  const ledColor = isLit ? getLedColor(led!) : "#000000";
  const isPainted = painting !== "-";

  // Parse SVG into shapes
  const parsed = useMemo<ParsedSvgShapes | null>(() => {
    const svg = svgString || PRESET_LOGOS[presetShape] || PRESET_LOGOS.shield;
    try {
      return parseSvgToShapes(svg);
    } catch (e) {
      console.error("Failed to parse SVG:", e);
      return null;
    }
  }, [svgString, presetShape]);

  // Scale and extrude
  const geometry = useMemo(() => {
    if (!parsed || parsed.shapes.length === 0) return null;

    const scaled = scaleShapesToFit(
      parsed.shapes,
      parsed.originalWidth,
      parsed.originalHeight,
      width,
      height,
    );

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.2,
      bevelSize: 0.15,
      bevelSegments: 3,
      curveSegments: 12,
    };

    const geo = new THREE.ExtrudeGeometry(scaled, extrudeSettings);
    geo.center();
    geo.computeVertexNormals();
    return geo;
  }, [parsed, width, height, depth]);

  const bodyMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isPainted ? "#2c3e50" : "#c0c0c0",
        metalness: 0.85,
        roughness: 0.3,
      }),
    [isPainted],
  );

  const faceMaterial = useMemo(() => {
    if (isLit) {
      return new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        emissive: new THREE.Color(ledColor),
        emissiveIntensity: 1.5,
        transmission: 0.35,
        roughness: 0.15,
        thickness: 0.3,
        ior: 1.49,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: isPainted ? "#2c3e50" : "#b0b0b0",
      metalness: 0.7,
      roughness: 0.4,
    });
  }, [isLit, ledColor, isPainted]);

  // Fallback: if SVG parsing fails, render a box like before
  if (!geometry) {
    return (
      <group>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width, height, depth]} />
          <primitive object={bodyMaterial} attach="material" />
        </mesh>
      </group>
    );
  }

  // Extruded geometry with multi-material: [sides/back material, face material]
  const materials = [bodyMaterial, faceMaterial];

  return (
    <group>
      <mesh
        geometry={geometry}
        material={materials}
        castShadow
        receiveShadow
      />

      {/* Back glow for lit logos */}
      {isLit && (
        <rectAreaLight
          position={[0, 0, -(depth / 2 + 0.5)]}
          width={width * 0.8}
          height={height * 0.8}
          color={ledColor}
          intensity={3}
          rotation={[0, Math.PI, 0]}
        />
      )}
    </group>
  );
}
