"use client";

import { useMemo } from "react";
import * as THREE from "three";

interface MountingStudsProps {
  letterPositions: { x: number; y: number; width: number }[];
  height: number;
  depth: number;
  xOffset: number;
}

const STUD_RADIUS = 0.15;
const STUD_LENGTH = 1.2;
const STUD_SEGMENTS = 6;

export function MountingStuds({ letterPositions, height, depth, xOffset }: MountingStudsProps) {
  // Single shared material for all studs (avoids per-stud allocation)
  const studMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#b0b0b0", metalness: 0.85, roughness: 0.25 }),
    []
  );

  // Single shared geometry for all studs
  const studGeometry = useMemo(
    () => new THREE.CylinderGeometry(STUD_RADIUS, STUD_RADIUS, STUD_LENGTH, STUD_SEGMENTS),
    []
  );

  return (
    <group>
      {letterPositions.map((lp, i) => (
        <group key={`studs-${i}`}>
          {/* Top stud */}
          <mesh
            geometry={studGeometry}
            material={studMaterial}
            position={[lp.x + lp.width / 2, lp.y + height * 0.75, -(depth + STUD_LENGTH / 2)]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          />
          {/* Bottom stud */}
          <mesh
            geometry={studGeometry}
            material={studMaterial}
            position={[lp.x + lp.width / 2, lp.y + height * 0.25, -(depth + STUD_LENGTH / 2)]}
            rotation={[Math.PI / 2, 0, 0]}
            castShadow
          />
        </group>
      ))}
    </group>
  );
}
