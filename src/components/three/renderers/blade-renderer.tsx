"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useConfiguratorStore } from "@/stores/configurator-store";
import { MATERIALS } from "../utils/constants";

interface BladeRendererProps {
  width: number;
  height: number;
  depth?: number;
  illuminated: boolean;
  led: string;
  doubleSided: boolean;
  shape: "rectangular" | "round";
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

const WALL_PLATE_SIZE = 4;
const WALL_PLATE_DEPTH = 0.5;
const BRACKET_WIDTH = 2;
const BRACKET_HEIGHT = 1;
const BRACKET_LENGTH = 12;
const SIGN_OFFSET_Z = 14;

export function BladeRenderer({
  width,
  height,
  depth = 3,
  illuminated,
  led,
  doubleSided,
  shape,
}: BladeRendererProps) {
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

  const bracketMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#404040",
        metalness: 0.8,
        roughness: 0.35,
      }),
    []
  );

  const signBodyMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#505050",
        metalness: MATERIALS.ALUMINUM.metalness,
        roughness: MATERIALS.ALUMINUM.roughness,
      }),
    []
  );

  const faceMaterial = useMemo(() => {
    if (illuminated) {
      return new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        emissive: new THREE.Color(ledColor),
        emissiveIntensity: 1.2,
        transmission: 0.4,
        roughness: 0.1,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: "#e8e8e8",
      metalness: 0.1,
      roughness: 0.5,
    });
  }, [illuminated, ledColor]);

  const isRound = shape === "round";

  return (
    <group>
      {/* Wall plate */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry
          args={[WALL_PLATE_SIZE, WALL_PLATE_SIZE, WALL_PLATE_DEPTH]}
        />
        <primitive object={bracketMaterial} attach="material" />
      </mesh>

      {/* Bracket arm extending along Z */}
      <mesh position={[0, 0, WALL_PLATE_DEPTH / 2 + BRACKET_LENGTH / 2]}>
        <boxGeometry
          args={[BRACKET_WIDTH, BRACKET_HEIGHT, BRACKET_LENGTH]}
        />
        <primitive object={bracketMaterial} attach="material" />
      </mesh>

      {/* Sign panel body */}
      {isRound ? (
        <mesh
          position={[0, 0, SIGN_OFFSET_Z]}
          rotation={[Math.PI / 2, 0, 0]}
        >
          <cylinderGeometry args={[width / 2, width / 2, depth, 32]} />
          <primitive object={signBodyMaterial} attach="material" />
        </mesh>
      ) : (
        <mesh position={[0, 0, SIGN_OFFSET_Z]}>
          <boxGeometry args={[width, height, depth]} />
          <primitive object={signBodyMaterial} attach="material" />
        </mesh>
      )}

      {/* Front face */}
      {isRound ? (
        <mesh position={[0, 0, SIGN_OFFSET_Z + depth / 2 + 0.05]}>
          <circleGeometry args={[width / 2 - 0.3, 32]} />
          <primitive object={faceMaterial} attach="material" />
        </mesh>
      ) : (
        <mesh position={[0, 0, SIGN_OFFSET_Z + depth / 2 + 0.05]}>
          <planeGeometry args={[width - 0.3, height - 0.3]} />
          <primitive object={faceMaterial} attach="material" />
        </mesh>
      )}

      {/* Back face (if double-sided) */}
      {doubleSided && (
        isRound ? (
          <mesh
            position={[0, 0, SIGN_OFFSET_Z - depth / 2 - 0.05]}
            rotation={[0, Math.PI, 0]}
          >
            <circleGeometry args={[width / 2 - 0.3, 32]} />
            <primitive object={faceMaterial} attach="material" />
          </mesh>
        ) : (
          <mesh
            position={[0, 0, SIGN_OFFSET_Z - depth / 2 - 0.05]}
            rotation={[0, Math.PI, 0]}
          >
            <planeGeometry args={[width - 0.3, height - 0.3]} />
            <primitive object={faceMaterial} attach="material" />
          </mesh>
        )
      )}
    </group>
  );
}
