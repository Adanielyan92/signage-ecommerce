"use client";

import { useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useConfiguratorStore } from "@/stores/configurator-store";
import { DAY_LIGHTING, NIGHT_LIGHTING } from "./utils/day-night-lighting";

const DAY_COLOR = new THREE.Color(DAY_LIGHTING.backgroundColor);
const NIGHT_COLOR = new THREE.Color(NIGHT_LIGHTING.backgroundColor);

/**
 * Wall plane behind the sign. Uses MeshBasicMaterial so it isn't affected by
 * scene lighting — its color always exactly tracks the scene background,
 * making edges invisible regardless of day/night mode.
 */
export function WallPlane() {
  const sceneMode = useConfiguratorStore((s) => s.sceneMode);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const colorRef = useRef(new THREE.Color(DAY_COLOR));

  useFrame((_state, delta) => {
    if (!matRef.current) return;
    const target = sceneMode === "night" ? NIGHT_COLOR : DAY_COLOR;
    colorRef.current.lerp(target, 3 * delta);
    matRef.current.color.copy(colorRef.current);
  });

  return (
    <mesh position={[0, 0, -10]}>
      <planeGeometry args={[500, 500]} />
      <meshBasicMaterial ref={matRef} color={DAY_COLOR} />
    </mesh>
  );
}
