"use client";

import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense, useRef, useMemo } from "react";
import { useMockupStore } from "@/stores/mockup-store";
import { useConfiguratorStore } from "@/stores/configurator-store";
import { HumanSilhouette } from "@/components/three/objects/human-silhouette";
import { DoorReference } from "@/components/three/objects/door-reference";
import type { WallTexture } from "@/types/mockup";

// ---------------------------------------------------------------------------
// Wall texture -> color mapping
// ---------------------------------------------------------------------------

const WALL_COLORS: Record<WallTexture, string> = {
  "red-brick": "#8B4513",
  "white-brick": "#F5F5DC",
  "brown-brick": "#6B3A2A",
  "cream-stucco": "#FAEBD7",
  "gray-stucco": "#A9A9A9",
  "white-stucco": "#F8F8F8",
  "glass-storefront": "#B0C4DE",
  concrete: "#808080",
  "wood-siding": "#DEB887",
  stone: "#696969",
};

// Roughness per wall texture for more realistic look
const WALL_ROUGHNESS: Record<WallTexture, number> = {
  "red-brick": 0.95,
  "white-brick": 0.9,
  "brown-brick": 0.95,
  "cream-stucco": 0.85,
  "gray-stucco": 0.85,
  "white-stucco": 0.8,
  "glass-storefront": 0.1,
  concrete: 0.92,
  "wood-siding": 0.88,
  stone: 0.95,
};

// ---------------------------------------------------------------------------
// Day / Night lighting presets for the mockup scene
// ---------------------------------------------------------------------------

interface LightingPreset {
  ambientIntensity: number;
  directionalIntensity: number;
  fillIntensity: number;
  backgroundColor: string;
  groundColor: string;
  signEmissiveIntensity: number;
}

const DAY_PRESET: LightingPreset = {
  ambientIntensity: 0.5,
  directionalIntensity: 1.0,
  fillIntensity: 0.3,
  backgroundColor: "#d4e6f1",
  groundColor: "#6B8E6B",
  signEmissiveIntensity: 0,
};

const NIGHT_PRESET: LightingPreset = {
  ambientIntensity: 0.05,
  directionalIntensity: 0.0,
  fillIntensity: 0.0,
  backgroundColor: "#0a0a14",
  groundColor: "#1a1a1a",
  signEmissiveIntensity: 1.5,
};

// ---------------------------------------------------------------------------
// SceneContent - the inner R3F scene
// ---------------------------------------------------------------------------

function SceneContent({ dayMode }: { dayMode: boolean }) {
  const wallTexture = useMockupStore((s) => s.wallTexture);
  const wallWidthFt = useMockupStore((s) => s.wallWidthFt);
  const wallHeightFt = useMockupStore((s) => s.wallHeightFt);
  const signPositionX = useMockupStore((s) => s.signPositionX);
  const signPositionY = useMockupStore((s) => s.signPositionY);
  const showHumanRef = useMockupStore((s) => s.showHumanRef);
  const showDoorRef = useMockupStore((s) => s.showDoorRef);

  const totalWidthInches = useConfiguratorStore(
    (s) => s.dimensions.totalWidthInches
  );
  const heightInches = useConfiguratorStore((s) => s.dimensions.heightInches);

  // Convert sign dimensions from inches to feet
  const signWidthFt = totalWidthInches / 12;
  const signHeightFt = heightInches / 12;

  // Default to a reasonable sign size (6ft x 2ft) when nothing is configured,
  // otherwise enforce a visible minimum of 2ft x 1ft
  const hasConfiguredSign = totalWidthInches > 0;
  const effectiveSignWidth = hasConfiguredSign
    ? Math.max(signWidthFt, 2)
    : 6;
  const effectiveSignHeight = hasConfiguredSign
    ? Math.max(signHeightFt, 1)
    : 2;

  // Wall is centered at origin; compute wall bounds
  const wallLeft = -wallWidthFt / 2;
  const wallRight = wallWidthFt / 2;
  const wallBottom = 0; // wall sits on the ground
  const wallTop = wallHeightFt;
  const wallCenterY = wallHeightFt / 2;

  // Sign position: map (0-1) to wall surface, clamped so sign stays on wall
  const signX =
    wallLeft +
    effectiveSignWidth / 2 +
    signPositionX * (wallWidthFt - effectiveSignWidth);
  const signY =
    wallBottom +
    effectiveSignHeight / 2 +
    signPositionY * (wallHeightFt - effectiveSignHeight);

  // Wall color
  const wallColor = WALL_COLORS[wallTexture];
  const wallRoughness = WALL_ROUGHNESS[wallTexture];
  const isGlass = wallTexture === "glass-storefront";

  // Lighting target
  const target = dayMode ? DAY_PRESET : NIGHT_PRESET;

  // Refs for animated lighting transitions
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const dirRef = useRef<THREE.DirectionalLight>(null);
  const fillRef = useRef<THREE.DirectionalLight>(null);
  const bgRef = useRef<THREE.Color>(
    new THREE.Color(DAY_PRESET.backgroundColor)
  );
  const groundColorRef = useRef<THREE.Color>(
    new THREE.Color(DAY_PRESET.groundColor)
  );
  const signEmissiveRef = useRef(0);

  // Animated wall color (changes on texture swap)
  const wallColorRef = useRef<THREE.Color>(new THREE.Color(wallColor));
  const wallMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const groundMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const signMatRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state, delta) => {
    const speed = 3;

    // Ambient light
    if (ambientRef.current) {
      ambientRef.current.intensity = THREE.MathUtils.lerp(
        ambientRef.current.intensity,
        target.ambientIntensity,
        speed * delta
      );
    }

    // Directional light
    if (dirRef.current) {
      dirRef.current.intensity = THREE.MathUtils.lerp(
        dirRef.current.intensity,
        target.directionalIntensity,
        speed * delta
      );
    }

    // Fill light
    if (fillRef.current) {
      fillRef.current.intensity = THREE.MathUtils.lerp(
        fillRef.current.intensity,
        target.fillIntensity,
        speed * delta
      );
    }

    // Background color lerp
    const targetBg = new THREE.Color(target.backgroundColor);
    bgRef.current.lerp(targetBg, speed * delta);
    state.scene.background = bgRef.current;

    // Wall color lerp
    const targetWallColor = new THREE.Color(wallColor);
    wallColorRef.current.lerp(targetWallColor, speed * delta);
    if (wallMatRef.current) {
      wallMatRef.current.color.copy(wallColorRef.current);
    }

    // Ground color lerp
    const targetGroundColor = new THREE.Color(target.groundColor);
    groundColorRef.current.lerp(targetGroundColor, speed * delta);
    if (groundMatRef.current) {
      groundMatRef.current.color.copy(groundColorRef.current);
    }

    // Sign emissive lerp (for night glow)
    signEmissiveRef.current = THREE.MathUtils.lerp(
      signEmissiveRef.current,
      target.signEmissiveIntensity,
      speed * delta
    );
    if (signMatRef.current) {
      signMatRef.current.emissiveIntensity = signEmissiveRef.current;
    }
  });

  // Camera distance to see the whole wall
  const cameraZ = useMemo(() => {
    const fovRad = (50 * Math.PI) / 180;
    const halfHeight = wallHeightFt / 2;
    const distForHeight = halfHeight / Math.tan(fovRad / 2);
    // Aspect ratio consideration: assume roughly 16:9
    const halfWidth = wallWidthFt / 2;
    const distForWidth = halfWidth / Math.tan(fovRad / 2) / (16 / 9);
    return Math.max(distForHeight, distForWidth) * 1.3;
  }, [wallWidthFt, wallHeightFt]);

  // Human silhouette position: bottom-left of wall
  const humanX = wallLeft + 1.5;

  // Door position: bottom-right of wall
  const doorX = wallRight - 2;

  return (
    <>
      <OrbitControls
        makeDefault
        minDistance={3}
        maxDistance={cameraZ * 3}
        enablePan
        target={[0, wallCenterY, 0]}
        maxPolarAngle={Math.PI / 1.5}
      />

      {/* Lighting */}
      <ambientLight
        ref={ambientRef}
        intensity={DAY_PRESET.ambientIntensity}
      />
      <directionalLight
        ref={dirRef}
        position={[wallWidthFt * 0.5, wallHeightFt * 1.5, wallWidthFt * 0.8]}
        intensity={DAY_PRESET.directionalIntensity}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <directionalLight
        ref={fillRef}
        position={[-wallWidthFt * 0.3, wallHeightFt * 0.5, wallWidthFt * 0.5]}
        intensity={DAY_PRESET.fillIntensity}
      />

      {/* Wall */}
      <mesh position={[0, wallCenterY, 0]} receiveShadow>
        <planeGeometry args={[wallWidthFt, wallHeightFt]} />
        <meshStandardMaterial
          ref={wallMatRef}
          color={wallColor}
          roughness={wallRoughness}
          metalness={isGlass ? 0.3 : 0}
          transparent={isGlass}
          opacity={isGlass ? 0.6 : 1}
        />
      </mesh>

      {/* Sign on the wall */}
      <mesh position={[signX, signY, 0.05]} castShadow>
        <planeGeometry args={[effectiveSignWidth, effectiveSignHeight]} />
        <meshStandardMaterial
          ref={signMatRef}
          color="#1E40AF"
          emissive="#1E40AF"
          emissiveIntensity={0}
          roughness={0.3}
          metalness={0.2}
        />
      </mesh>

      {/* Sign border outline (slightly larger, darker rectangle behind) */}
      <mesh position={[signX, signY, 0.04]}>
        <planeGeometry
          args={[effectiveSignWidth + 0.15, effectiveSignHeight + 0.15]}
        />
        <meshStandardMaterial color="#0F172A" roughness={0.5} />
      </mesh>

      {/* Scale references */}
      {showHumanRef && (
        <HumanSilhouette positionX={humanX} wallBottomY={wallBottom} />
      )}
      {showDoorRef && (
        <DoorReference positionX={doorX} wallBottomY={wallBottom} />
      )}

      {/* Ground plane */}
      <mesh
        position={[0, -0.01, wallWidthFt * 0.3]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[wallWidthFt * 2, wallWidthFt * 1.5]} />
        <meshStandardMaterial
          ref={groundMatRef}
          color={DAY_PRESET.groundColor}
          roughness={0.95}
        />
      </mesh>
    </>
  );
}

// ---------------------------------------------------------------------------
// SceneBuilder - exported component (renders inside a Canvas)
// ---------------------------------------------------------------------------

interface SceneBuilderProps {
  dayMode: boolean;
}

export default function SceneBuilder({ dayMode }: SceneBuilderProps) {
  const wallWidthFt = useMockupStore((s) => s.wallWidthFt);
  const wallHeightFt = useMockupStore((s) => s.wallHeightFt);

  // Compute initial camera position to see the whole wall
  const cameraZ = useMemo(() => {
    const fovRad = (50 * Math.PI) / 180;
    const halfHeight = wallHeightFt / 2;
    const distForHeight = halfHeight / Math.tan(fovRad / 2);
    const halfWidth = wallWidthFt / 2;
    const distForWidth = halfWidth / Math.tan(fovRad / 2) / (16 / 9);
    return Math.max(distForHeight, distForWidth) * 1.3;
  }, [wallWidthFt, wallHeightFt]);

  return (
    <Canvas
      camera={{
        position: [0, wallHeightFt / 2, cameraZ],
        fov: 50,
        near: 0.1,
        far: 500,
      }}
      gl={{
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true,
      }}
      dpr={[1, 2]}
      shadows
      className="h-full w-full"
    >
      <Suspense fallback={null}>
        <SceneContent dayMode={dayMode} />
      </Suspense>
    </Canvas>
  );
}
