"use client";

import * as THREE from "three";
import { useMemo } from "react";

interface RacewayRendererProps {
  width: number; // total sign width in inches
  raceType: "linear" | "box";
  heightOffset: number; // Y position (typically below the letters)
}

/**
 * Raceway: a metal channel mounted below channel letters that hides wiring.
 * Linear: narrow U-channel running the width of the sign.
 * Box: wider rectangular enclosure for larger installations.
 */
export function RacewayRenderer({
  width,
  raceType,
  heightOffset,
}: RacewayRendererProps) {
  const raceHeight = raceType === "box" ? 4 : 2; // inches
  const raceDepth = raceType === "box" ? 4 : 2.5; // inches

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#909090",
        metalness: 0.85,
        roughness: 0.3,
      }),
    [],
  );

  // Wire channel groove on the back
  const grooveMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#404040",
        metalness: 0.5,
        roughness: 0.6,
      }),
    [],
  );

  return (
    <group position={[0, heightOffset - raceHeight / 2, 0]}>
      {/* Main raceway body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, raceHeight, raceDepth]} />
        <primitive object={material} attach="material" />
      </mesh>

      {/* Wire channel groove (back face indent) */}
      <mesh position={[0, 0, -(raceDepth / 2 + 0.01)]}>
        <planeGeometry args={[width * 0.85, raceHeight * 0.6]} />
        <primitive object={grooveMaterial} attach="material" />
      </mesh>

      {/* Mounting holes (decorative circles on front) */}
      {[-width / 3, 0, width / 3].map((x, i) => (
        <mesh key={i} position={[x, 0, raceDepth / 2 + 0.02]}>
          <circleGeometry args={[0.25, 16]} />
          <primitive object={grooveMaterial} attach="material" />
        </mesh>
      ))}
    </group>
  );
}
