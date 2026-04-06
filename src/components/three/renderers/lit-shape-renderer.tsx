"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef } from "react";
import { useConfiguratorStore } from "@/stores/configurator-store";
import { getLedColor } from "../utils/led-colors";

interface LitShapeRendererProps {
  width: number;
  height: number;
  depth?: number;
  led: string;
  painting: string;
}

/**
 * Create a cloud-shaped THREE.Shape using bezier curves.
 * Normalized to fit within (0,0) to (width,height).
 */
function createCloudShape(width: number, height: number): THREE.Shape {
  const shape = new THREE.Shape();
  const w = width;
  const h = height;

  // Cloud outline using quadratic bezier curves
  // Start at bottom-left
  shape.moveTo(w * 0.15, h * 0.3);

  // Bottom edge (slightly curved)
  shape.quadraticCurveTo(w * 0.5, h * 0.25, w * 0.85, h * 0.3);

  // Right bump
  shape.quadraticCurveTo(w * 1.05, h * 0.35, w * 0.95, h * 0.55);

  // Top-right bump
  shape.quadraticCurveTo(w * 1.0, h * 0.75, w * 0.75, h * 0.8);

  // Top center bump (tallest)
  shape.quadraticCurveTo(w * 0.65, h * 1.0, w * 0.5, h * 0.85);

  // Top-left bump
  shape.quadraticCurveTo(w * 0.35, h * 0.95, w * 0.25, h * 0.8);

  // Left bump
  shape.quadraticCurveTo(w * 0.0, h * 0.7, w * 0.05, h * 0.5);

  // Close back to start
  shape.quadraticCurveTo(w * -0.05, h * 0.35, w * 0.15, h * 0.3);

  return shape;
}

export function LitShapeRenderer({
  width,
  height,
  depth = 4,
  led,
  painting,
}: LitShapeRendererProps) {
  const setDimensions = useConfiguratorStore((s) => s.setDimensions);
  const productType = useConfiguratorStore((s) => s.litShapeConfig.productType);
  const uploadedImageUrl = useConfiguratorStore((s) => s.uploadedImageUrl);
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

  const ledColor = getLedColor(led);
  const isPainted = painting !== "-";

  const bodyMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isPainted ? "#2c3e50" : "#c0c0c0",
        metalness: 0.85,
        roughness: 0.3,
      }),
    [isPainted],
  );

  const faceMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        emissive: new THREE.Color(ledColor),
        emissiveIntensity: 1.5,
        transmission: 0.4,
        roughness: 0.15,
        thickness: 0.25,
        ior: 1.49,
      }),
    [ledColor],
  );

  const geometry = useMemo(() => {
    if (productType === "cloud-sign") {
      const shape = createCloudShape(width, height);
      const extrudeSettings: THREE.ExtrudeGeometryOptions = {
        depth,
        bevelEnabled: true,
        bevelThickness: 0.3,
        bevelSize: 0.2,
        bevelSegments: 3,
        curveSegments: 16,
      };
      const geo = new THREE.ExtrudeGeometry([shape], extrudeSettings);
      geo.center();
      geo.computeVertexNormals();
      return geo;
    }

    // logo-shape: simple rounded box as fallback (logo SVG upload will replace)
    const shape = new THREE.Shape();
    const radius = Math.min(width, height) * 0.08;
    shape.moveTo(radius, 0);
    shape.lineTo(width - radius, 0);
    shape.quadraticCurveTo(width, 0, width, radius);
    shape.lineTo(width, height - radius);
    shape.quadraticCurveTo(width, height, width - radius, height);
    shape.lineTo(radius, height);
    shape.quadraticCurveTo(0, height, 0, height - radius);
    shape.lineTo(0, radius);
    shape.quadraticCurveTo(0, 0, radius, 0);

    const geo = new THREE.ExtrudeGeometry([shape], {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.2,
      bevelSize: 0.15,
      bevelSegments: 2,
      curveSegments: 8,
    });
    geo.center();
    geo.computeVertexNormals();
    return geo;
  }, [productType, width, height, depth]);

  // Load uploaded image as a texture for the face
  const imageTexture = useMemo(() => {
    if (!uploadedImageUrl) return null;
    const tex = new THREE.TextureLoader().load(uploadedImageUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [uploadedImageUrl]);

  useEffect(() => {
    return () => {
      imageTexture?.dispose();
    };
  }, [imageTexture]);

  return (
    <group>
      {/* Extruded shape body */}
      <mesh geometry={geometry} castShadow receiveShadow>
        <primitive object={bodyMaterial} attach="material" />
      </mesh>

      {/* Lit face overlay -- uses a slightly smaller version of the shape */}
      <mesh position={[0, 0, depth / 2 + 0.1]}>
        <primitive object={faceMaterial} attach="material" />
        <planeGeometry args={[width * 0.9, height * 0.9]} />
      </mesh>

      {/* Uploaded image texture on the front face */}
      {imageTexture && (
        <mesh position={[0, 0, depth / 2 + 0.15]}>
          <planeGeometry args={[width * 0.8, height * 0.8]} />
          <meshStandardMaterial
            map={imageTexture}
            transparent
            roughness={0.4}
            metalness={0.1}
          />
        </mesh>
      )}
    </group>
  );
}
