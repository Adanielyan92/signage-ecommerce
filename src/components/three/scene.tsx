"use client";

import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  Bounds,
  useBounds,
  Center,
  ContactShadows,
  Html,
  useProgress,
} from "@react-three/drei";
import {
  EffectComposer as PMEffectComposer,
  BloomEffect,
  EffectPass,
  RenderPass,
} from "postprocessing";
import { Suspense, useEffect, useRef } from "react";
import { useConfiguratorStore } from "@/stores/configurator-store";
import { WallPlane } from "./wall-plane";
import { SceneRouter } from "./scene-router";
import { DAY_LIGHTING, NIGHT_LIGHTING } from "./utils/day-night-lighting";
import { setSignGroupRef } from "./scene-ref";

// ---------------------------------------------------------------------------
// Loading indicator (shown while fonts/environment/textures load)
// ---------------------------------------------------------------------------

function Loader() {
  const { progress } = useProgress();
  return (
    <Html center>
      <div className="flex flex-col items-center gap-2">
        <div className="h-1 w-32 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-gray-400">
          {progress.toFixed(0)}%
        </span>
      </div>
    </Html>
  );
}

// ---------------------------------------------------------------------------
// Imperative bloom post-processing
// ---------------------------------------------------------------------------

/**
 * Creates the EffectComposer, RenderPass, and BloomEffect directly from the
 * `postprocessing` library instead of the JSX wrappers.  This avoids R3F's
 * reconciler (and Next.js Turbopack HMR) trying to JSON.stringify the effect
 * objects which fails due to circular references in KawaseBlurPass.
 */
function ImperativeBloom() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const sceneMode = useConfiguratorStore((s) => s.sceneMode);

  const composerRef = useRef<PMEffectComposer | null>(null);
  const bloomRef = useRef<BloomEffect | null>(null);

  useEffect(() => {
    const composer = new PMEffectComposer(gl, {
      frameBufferType: THREE.HalfFloatType,
    });
    const renderPass = new RenderPass(scene, camera);
    const bloom = new BloomEffect({
      luminanceThreshold: DAY_LIGHTING.bloomThreshold,
      luminanceSmoothing: 0.3,
      intensity: DAY_LIGHTING.bloomIntensity,
      mipmapBlur: true,
    });
    const effectPass = new EffectPass(camera, bloom);

    composer.addPass(renderPass);
    composer.addPass(effectPass);

    composerRef.current = composer;
    bloomRef.current = bloom;

    return () => {
      composer.dispose();
      composerRef.current = null;
      bloomRef.current = null;
    };
  }, [gl, scene, camera]);

  useEffect(() => {
    composerRef.current?.setSize(size.width, size.height);
  }, [size]);

  // Always render through the bloom compositor. In night mode, bloom is
  // *stronger* (not disabled) -- that's when LED glow matters most.
  useFrame((_state, delta) => {
    const bloom = bloomRef.current;
    const composer = composerRef.current;
    if (!bloom || !composer) return;

    const target = sceneMode === "night" ? NIGHT_LIGHTING : DAY_LIGHTING;
    const speed = 3;

    bloom.intensity = THREE.MathUtils.lerp(
      bloom.intensity,
      target.bloomIntensity,
      speed * delta
    );
    bloom.luminanceMaterial.threshold = THREE.MathUtils.lerp(
      bloom.luminanceMaterial.threshold,
      target.bloomThreshold,
      speed * delta
    );

    composer.render(delta);
  }, /* priority */ 1);

  return null;
}

// ---------------------------------------------------------------------------
// Auto-fit camera to sign content
// ---------------------------------------------------------------------------

function AutoFit() {
  const bounds = useBounds();
  const productCategory = useConfiguratorStore((s) => s.productCategory);
  const config = useConfiguratorStore((s) => s.config);
  const litShapeConfig = useConfiguratorStore((s) => s.litShapeConfig);
  const cabinetConfig = useConfiguratorStore((s) => s.cabinetConfig);
  const dimensionalConfig = useConfiguratorStore((s) => s.dimensionalConfig);
  const logoConfig = useConfiguratorStore((s) => s.logoConfig);
  const printConfig = useConfiguratorStore((s) => s.printConfig);
  const signPostConfig = useConfiguratorStore((s) => s.signPostConfig);
  const lightBoxConfig = useConfiguratorStore((s) => s.lightBoxConfig);
  const bladeConfig = useConfiguratorStore((s) => s.bladeConfig);
  const neonConfig = useConfiguratorStore((s) => s.neonConfig);
  const bannerConfig = useConfiguratorStore((s) => s.bannerConfig);
  const prevKey = useRef("");

  const key = (() => {
    switch (productCategory) {
      case "CHANNEL_LETTERS":
        return `cl:${config.text}:${config.height}:${config.font}:${config.sideDepth}`;
      case "DIMENSIONAL_LETTERS":
        return `dl:${dimensionalConfig.text}:${dimensionalConfig.height}:${dimensionalConfig.font}:${dimensionalConfig.thickness}`;
      case "CABINET_SIGNS":
        return `cab:${cabinetConfig.widthInches}:${cabinetConfig.heightInches}:${cabinetConfig.productType}`;
      case "LIT_SHAPES":
        return `ls:${litShapeConfig.widthInches}:${litShapeConfig.heightInches}`;
      case "LOGOS":
        return `logo:${logoConfig.widthInches}:${logoConfig.heightInches}`;
      case "PRINT_SIGNS":
        return `print:${printConfig.widthInches}:${printConfig.heightInches}`;
      case "SIGN_POSTS":
        return `post:${signPostConfig.postHeight}:${signPostConfig.signWidthInches}:${signPostConfig.signHeightInches}:${signPostConfig.productType}`;
      case "LIGHT_BOX_SIGNS":
        return `lb:${lightBoxConfig.widthInches}:${lightBoxConfig.heightInches}:${lightBoxConfig.shape}`;
      case "BLADE_SIGNS":
        return `bl:${bladeConfig.widthInches}:${bladeConfig.heightInches}:${bladeConfig.shape}`;
      case "NEON_SIGNS":
        return `neon:${neonConfig.text}:${neonConfig.height}:${neonConfig.font}`;
      case "VINYL_BANNERS":
        return `banner:${bannerConfig.widthInches}:${bannerConfig.heightInches}`;
      default:
        return "unknown";
    }
  })();

  useEffect(() => {
    if (key === prevKey.current) return;
    prevKey.current = key;
    const timer = setTimeout(() => {
      bounds.refresh().fit();
    }, 150);
    return () => clearTimeout(timer);
  }, [key, bounds]);

  return null;
}

// ---------------------------------------------------------------------------
// Scene content: lighting, controls, shadows, sign
// ---------------------------------------------------------------------------

// Pre-allocated colors to avoid per-frame garbage
const _targetBg = new THREE.Color();

function SceneContent() {
  const sceneMode = useConfiguratorStore((s) => s.sceneMode);
  const target = sceneMode === "night" ? NIGHT_LIGHTING : DAY_LIGHTING;

  const ambientRef = useRef<THREE.AmbientLight>(null);
  const keyRef = useRef<THREE.DirectionalLight>(null);
  const fillRef = useRef<THREE.DirectionalLight>(null);
  const rimRef = useRef<THREE.DirectionalLight>(null);
  const bgRef = useRef(new THREE.Color(DAY_LIGHTING.backgroundColor));

  useFrame((state, delta) => {
    const speed = 3;

    if (ambientRef.current) {
      ambientRef.current.intensity = THREE.MathUtils.lerp(
        ambientRef.current.intensity,
        target.ambientIntensity,
        speed * delta
      );
    }

    if (keyRef.current) {
      keyRef.current.intensity = THREE.MathUtils.lerp(
        keyRef.current.intensity,
        target.directionalIntensity,
        speed * delta
      );
    }

    if (fillRef.current) {
      fillRef.current.intensity = THREE.MathUtils.lerp(
        fillRef.current.intensity,
        target.fillIntensity,
        speed * delta
      );
    }

    if (rimRef.current) {
      rimRef.current.intensity = THREE.MathUtils.lerp(
        rimRef.current.intensity,
        target.rimIntensity,
        speed * delta
      );
    }

    // Environment IBL intensity
    state.scene.environmentIntensity = THREE.MathUtils.lerp(
      state.scene.environmentIntensity,
      target.environmentIntensity,
      speed * delta
    );

    // Background color lerp (reuse pre-allocated color)
    _targetBg.set(target.backgroundColor);
    bgRef.current.lerp(_targetBg, speed * delta);
    state.scene.background = bgRef.current;
  });

  return (
    <>
      {/* Camera controls with damping for smooth feel */}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={15}
        maxDistance={200}
        enablePan={false}
        minPolarAngle={Math.PI * 0.2}
        maxPolarAngle={Math.PI * 0.75}
        minAzimuthAngle={-Math.PI * 0.45}
        maxAzimuthAngle={Math.PI * 0.45}
      />

      {/* --- Three-point studio lighting --- */}

      {/* Key light: main illumination from upper-right front */}
      <directionalLight
        ref={keyRef}
        position={[10, 14, 12]}
        intensity={DAY_LIGHTING.directionalIntensity}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={60}
        shadow-camera-bottom={-20}
        shadow-camera-near={0.5}
        shadow-camera-far={120}
        shadow-bias={-0.0002}
        shadow-normalBias={0.02}
      />

      {/* Fill light: softer, opposite side to reduce harsh shadows */}
      <directionalLight
        ref={fillRef}
        position={[-8, 6, 8]}
        intensity={DAY_LIGHTING.fillIntensity}
      />

      {/* Rim/back light: edge definition from behind */}
      <directionalLight
        ref={rimRef}
        position={[0, 8, -12]}
        intensity={DAY_LIGHTING.rimIntensity}
      />

      {/* Ambient fill for shadow areas */}
      <ambientLight
        ref={ambientRef}
        intensity={DAY_LIGHTING.ambientIntensity}
      />

      {/* Environment for metallic reflections (studio HDRI) */}
      <Environment preset="studio" />

      {/* Contact shadows for grounding the sign on the wall */}
      <ContactShadows
        position={[0, -1, 0]}
        opacity={0.35}
        scale={120}
        blur={2.5}
        far={40}
        resolution={512}
      />

      {/* Wall behind the letters -- outside Bounds so it doesn't affect auto-fit */}
      <WallPlane />

      {/* Sign content with auto-framing -- only the sign is inside Bounds */}
      <Bounds fit observe margin={1.8} maxDuration={0.5}>
        <AutoFit />
        <Center>
          <group ref={(ref) => { if (ref) setSignGroupRef(ref); }}>
            <SceneRouter />
          </group>
        </Center>
      </Bounds>

      {/* Bloom post-processing (active in both day AND night mode) */}
      <ImperativeBloom />
    </>
  );
}

// ---------------------------------------------------------------------------
// Canvas wrapper
// ---------------------------------------------------------------------------

export default function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 60], fov: 40 }}
      shadows
      gl={{
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.9,
        outputColorSpace: THREE.SRGBColorSpace,
      }}
      dpr={[1, 2]}
      className="h-full w-full"
    >
      <Suspense fallback={<Loader />}>
        <SceneContent />
      </Suspense>
    </Canvas>
  );
}
