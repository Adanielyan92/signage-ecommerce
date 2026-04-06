"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { Text3D, Center } from "@react-three/drei";
import { useConfiguratorStore } from "@/stores/configurator-store";
import { MATERIALS } from "../utils/constants";

interface PushThroughRendererProps {
  width: number;
  height: number;
  depth: number;
  text: string;
  letterHeight: number;
  led: string;
  frameFinish: "painted" | "brushed" | "raw";
  doubleSided: boolean;
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

const FACE_DEPTH = 0.25;
const LETTER_PROTRUSION = 0.5;

export function PushThroughRenderer({
  width,
  height,
  depth,
  text,
  letterHeight,
  led,
  frameFinish,
  doubleSided,
}: PushThroughRendererProps) {
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

  const frameMaterial = useMemo(() => {
    const configs: Record<string, { color: string; roughness: number }> = {
      painted: { color: "#505050", roughness: 0.5 },
      brushed: { color: "#c0c0c0", roughness: 0.35 },
      raw: { color: "#a0a0a0", roughness: 0.6 },
    };
    const cfg = configs[frameFinish];
    return new THREE.MeshStandardMaterial({
      color: cfg.color,
      metalness: MATERIALS.ALUMINUM.metalness,
      roughness: cfg.roughness,
    });
  }, [frameFinish]);

  const faceMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#e0e0e0",
        metalness: 0,
        roughness: 0.3,
      }),
    []
  );

  const letterMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        emissive: new THREE.Color(ledColor),
        emissiveIntensity: 1.5,
        transmission: 0.5,
        roughness: 0.1,
      }),
    [ledColor]
  );

  const hasText = text.replace(/\s+/g, "").length > 0;

  return (
    <group>
      {/* Cabinet body (aluminum frame) */}
      <mesh>
        <boxGeometry args={[width, height, depth]} />
        <primitive object={frameMaterial} attach="material" />
      </mesh>

      {/* Front face panel */}
      <mesh position={[0, 0, depth / 2 + FACE_DEPTH / 2]}>
        <boxGeometry args={[width - 0.5, height - 0.5, FACE_DEPTH]} />
        <primitive object={faceMaterial} attach="material" />
      </mesh>

      {/* Back face panel (if double-sided) */}
      {doubleSided && (
        <mesh position={[0, 0, -(depth / 2 + FACE_DEPTH / 2)]}>
          <boxGeometry args={[width - 0.5, height - 0.5, FACE_DEPTH]} />
          <primitive object={faceMaterial} attach="material" />
        </mesh>
      )}

      {/* Push-through letters (protruding from front face) */}
      {hasText && (
        <Center
          position={[0, 0, depth / 2 + FACE_DEPTH + LETTER_PROTRUSION / 2]}
        >
          <Text3D
            font="/fonts/helvetiker_regular.typeface.json"
            size={letterHeight}
            height={LETTER_PROTRUSION}
            curveSegments={8}
            bevelEnabled={false}
          >
            {text}
            <primitive object={letterMaterial} attach="material" />
          </Text3D>
        </Center>
      )}

      {/* Push-through letters (back face, if double-sided) */}
      {doubleSided && hasText && (
        <Center
          position={[
            0,
            0,
            -(depth / 2 + FACE_DEPTH + LETTER_PROTRUSION / 2),
          ]}
          rotation={[0, Math.PI, 0]}
        >
          <Text3D
            font="/fonts/helvetiker_regular.typeface.json"
            size={letterHeight}
            height={LETTER_PROTRUSION}
            curveSegments={8}
            bevelEnabled={false}
          >
            {text}
            <primitive object={letterMaterial} attach="material" />
          </Text3D>
        </Center>
      )}
    </group>
  );
}
