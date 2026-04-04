"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useConfiguratorStore } from "@/stores/configurator-store";

interface BannerRendererProps {
  width: number;
  height: number;
  material: "13oz" | "15oz" | "mesh";
  finishing: "hem-grommets" | "pole-pockets" | "wind-slits";
  doubleSided: boolean;
}

const PANEL_DEPTH = 0.1;
const GROMMET_MAJOR_RADIUS = 0.3;
const GROMMET_MINOR_RADIUS = 0.1;
const GROMMET_SPACING = 12; // inches between grommets along edges
const GROMMET_INSET = 1; // inches from panel edge

export function BannerRenderer({
  width,
  height,
  material,
  finishing,
  doubleSided,
}: BannerRendererProps) {
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

  const faceMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#f8f8f0",
        metalness: 0,
        roughness: 0.7,
        ...(material === "mesh"
          ? { transparent: true, opacity: 0.85 }
          : {}),
      }),
    [material]
  );

  const edgeMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#e0e0d8",
        metalness: 0,
        roughness: 0.65,
      }),
    []
  );

  const grommetMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#404040",
        metalness: 0.8,
        roughness: 0.3,
      }),
    []
  );

  const polePocketMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#e8e8e0",
        metalness: 0,
        roughness: 0.75,
      }),
    []
  );

  // Compute grommet positions along top and bottom edges
  const grommetPositions = useMemo(() => {
    if (finishing !== "hem-grommets") return [];

    const positions: [number, number, number][] = [];
    const halfW = width / 2;
    const halfH = height / 2;
    const insetX = halfW - GROMMET_INSET;
    const topY = halfH - GROMMET_INSET;
    const bottomY = -(halfH - GROMMET_INSET);
    const frontZ = PANEL_DEPTH / 2 + GROMMET_MINOR_RADIUS;

    // Four corners
    positions.push([-insetX, topY, frontZ]);
    positions.push([insetX, topY, frontZ]);
    positions.push([-insetX, bottomY, frontZ]);
    positions.push([insetX, bottomY, frontZ]);

    // Along top and bottom edges (between corners)
    const innerWidth = (insetX - (-insetX));
    const count = Math.max(0, Math.floor(innerWidth / GROMMET_SPACING) - 1);
    if (count > 0) {
      const step = innerWidth / (count + 1);
      for (let i = 1; i <= count; i++) {
        const x = -insetX + step * i;
        positions.push([x, topY, frontZ]);
        positions.push([x, bottomY, frontZ]);
      }
    }

    return positions;
  }, [width, height, finishing]);

  return (
    <group>
      {/* Main banner panel */}
      <mesh material={[edgeMaterial, edgeMaterial, edgeMaterial, edgeMaterial, faceMaterial, faceMaterial]}>
        <boxGeometry args={[width, height, PANEL_DEPTH]} />
      </mesh>

      {/* Grommets */}
      {grommetPositions.map((pos, i) => (
        <mesh key={`grommet-${i}`} position={pos} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry
            args={[GROMMET_MAJOR_RADIUS, GROMMET_MINOR_RADIUS, 8, 16]}
          />
          <primitive object={grommetMaterial} attach="material" />
        </mesh>
      ))}

      {/* Pole pocket indicator (thin strip along top edge) */}
      {finishing === "pole-pockets" && (
        <mesh position={[0, height / 2 + 0.4, 0]}>
          <boxGeometry args={[width, 0.8, PANEL_DEPTH + 0.3]} />
          <primitive object={polePocketMaterial} attach="material" />
        </mesh>
      )}
    </group>
  );
}
