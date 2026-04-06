"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useConfiguratorStore } from "@/stores/configurator-store";

interface YardSignRendererProps {
  width: number;
  height: number;
  material: "coroplast" | "aluminum";
  doubleSided: boolean;
  stakeType: "h-stake" | "spider-stake" | "none";
}

const PANEL_DEPTH = 0.25;
const STAKE_WIRE_RADIUS = 0.15;
const STAKE_HEIGHT = 18; // 18 inches below the panel

export function YardSignRenderer({
  width,
  height,
  material,
  doubleSided,
  stakeType,
}: YardSignRendererProps) {
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

  const panelMaterial = useMemo(() => {
    if (material === "aluminum") {
      return new THREE.MeshStandardMaterial({
        color: "#d0d0d0",
        metalness: 0.7,
        roughness: 0.35,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: "#f8f8f0",
      metalness: 0,
      roughness: 0.7,
    });
  }, [material]);

  const stakeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#606060",
        metalness: 0.8,
        roughness: 0.3,
      }),
    []
  );

  const stakeInset = width * 0.2;

  return (
    <group>
      {/* Sign panel */}
      <mesh position={[0, STAKE_HEIGHT + height / 2, 0]}>
        <boxGeometry args={[width, height, PANEL_DEPTH]} />
        <primitive object={panelMaterial} attach="material" />
      </mesh>

      {/* H-Stake */}
      {stakeType === "h-stake" && (
        <>
          {/* Left vertical */}
          <mesh position={[-width / 2 + stakeInset, STAKE_HEIGHT / 2, 0]}>
            <cylinderGeometry
              args={[STAKE_WIRE_RADIUS, STAKE_WIRE_RADIUS, STAKE_HEIGHT + height * 0.4, 6]}
            />
            <primitive object={stakeMaterial} attach="material" />
          </mesh>
          {/* Right vertical */}
          <mesh position={[width / 2 - stakeInset, STAKE_HEIGHT / 2, 0]}>
            <cylinderGeometry
              args={[STAKE_WIRE_RADIUS, STAKE_WIRE_RADIUS, STAKE_HEIGHT + height * 0.4, 6]}
            />
            <primitive object={stakeMaterial} attach="material" />
          </mesh>
          {/* Horizontal crossbar */}
          <mesh
            position={[0, STAKE_HEIGHT + height * 0.25, 0]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry
              args={[
                STAKE_WIRE_RADIUS,
                STAKE_WIRE_RADIUS,
                width - 2 * stakeInset,
                6,
              ]}
            />
            <primitive object={stakeMaterial} attach="material" />
          </mesh>
        </>
      )}

      {/* Spider stake — single spike */}
      {stakeType === "spider-stake" && (
        <mesh position={[0, STAKE_HEIGHT / 2, 0]}>
          <cylinderGeometry
            args={[STAKE_WIRE_RADIUS, STAKE_WIRE_RADIUS * 0.5, STAKE_HEIGHT, 6]}
          />
          <primitive object={stakeMaterial} attach="material" />
        </mesh>
      )}
    </group>
  );
}
