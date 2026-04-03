"use client";

import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Environment,
  Bounds,
  useBounds,
  Center,
  Text,
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
import { SignAssembly } from "./sign-assembly";
import { DAY_LIGHTING, NIGHT_LIGHTING } from "./utils/day-night-lighting";

/**
 * Imperative bloom post-processing.
 *
 * Creates the EffectComposer, RenderPass, and BloomEffect directly from the
 * `postprocessing` library instead of using `@react-three/postprocessing` JSX
 * wrappers. This avoids R3F's reconciler (and Next.js Turbopack HMR) trying to
 * JSON.stringify the effect objects, which fails because KawaseBlurPass contains
 * circular references (resolution <-> resizable).
 */
function ImperativeBloom() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const sceneMode = useConfiguratorStore((s) => s.sceneMode);
  const target = sceneMode === "night" ? NIGHT_LIGHTING : DAY_LIGHTING;

  const composerRef = useRef<PMEffectComposer | null>(null);
  const bloomRef = useRef<BloomEffect | null>(null);

  // Set up the effect composer once, rebuild when gl/scene/camera change
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

  // Keep composer in sync with canvas size
  useEffect(() => {
    composerRef.current?.setSize(size.width, size.height);
  }, [size]);

  // Render through the bloom compositor. In night mode, skip the bloom
  // but still render the scene manually since priority > 0 disables R3F's
  // default render. The HalfFloat FBOs used by the bloom fail to blit to
  // screen on some GPU/driver combos, producing a black screen in dark scenes.
  useFrame((_state, delta) => {
    const bloom = bloomRef.current;
    const composer = composerRef.current;

    if (sceneMode === "night") {
      gl.render(scene, camera);
      return;
    }

    if (!bloom || !composer) return;

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

/**
 * Auto-fits the camera to the sign content whenever text, height, or font changes.
 * Must be a child of <Bounds>.
 */
function AutoFit() {
  const bounds = useBounds();
  const config = useConfiguratorStore((s) => s.config);
  const text = config.text.replace(/\s+/g, "");
  const height = config.height;
  const font = config.font;
  const depth = config.sideDepth;
  const prevKey = useRef("");

  useEffect(() => {
    const key = `${text}:${height}:${font}:${depth}`;
    if (key === prevKey.current) return;
    prevKey.current = key;

    const timer = setTimeout(() => {
      bounds.refresh().fit();
    }, 120);
    return () => clearTimeout(timer);
  }, [text, height, font, depth, bounds]);

  return null;
}

function SceneContent() {
  const config = useConfiguratorStore((s) => s.config);
  const sceneMode = useConfiguratorStore((s) => s.sceneMode);
  const hasText = config.text.replace(/\s+/g, "").length > 0;

  const target = sceneMode === "night" ? NIGHT_LIGHTING : DAY_LIGHTING;

  const ambientRef = useRef<THREE.AmbientLight>(null);
  const dirRef = useRef<THREE.DirectionalLight>(null);
  const fillRef = useRef<THREE.DirectionalLight>(null);
  const bgRef = useRef<THREE.Color>(
    new THREE.Color(DAY_LIGHTING.backgroundColor)
  );

  useFrame((state, delta) => {
    const speed = 3;

    if (ambientRef.current) {
      ambientRef.current.intensity = THREE.MathUtils.lerp(
        ambientRef.current.intensity,
        target.ambientIntensity,
        speed * delta
      );
    }

    if (dirRef.current) {
      dirRef.current.intensity = THREE.MathUtils.lerp(
        dirRef.current.intensity,
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

    // Environment IBL intensity
    state.scene.environmentIntensity = THREE.MathUtils.lerp(
      state.scene.environmentIntensity,
      target.environmentIntensity,
      speed * delta
    );

    // Background color lerp
    const targetBg = new THREE.Color(target.backgroundColor);
    bgRef.current.lerp(targetBg, speed * delta);
    state.scene.background = bgRef.current;
  });

  return (
    <>
      <OrbitControls
        makeDefault
        minDistance={15}
        maxDistance={200}
        enablePan={false}
        minPolarAngle={Math.PI * 0.3}
        maxPolarAngle={Math.PI * 0.7}
        minAzimuthAngle={-Math.PI * 0.35}
        maxAzimuthAngle={Math.PI * 0.35}
      />

      {/* Lighting */}
      <ambientLight ref={ambientRef} intensity={DAY_LIGHTING.ambientIntensity} />
      <directionalLight
        ref={dirRef}
        position={[8, 12, 15]}
        intensity={DAY_LIGHTING.directionalIntensity}
        castShadow
      />
      <directionalLight
        ref={fillRef}
        position={[-6, 4, 8]}
        intensity={DAY_LIGHTING.fillIntensity}
      />

      {/* Environment for metallic reflections */}
      <Environment preset="studio" />

      {/* Wall behind the letters — outside Bounds so it doesn't affect auto-fit */}
      <WallPlane />

      {/* Sign assembly with auto-framing — only the sign is inside Bounds */}
      <Bounds fit observe margin={1.8} maxDuration={0.5}>
        <AutoFit />
        {hasText ? (
          <Center>
            <SignAssembly />
          </Center>
        ) : (
          <Center>
            <Text
              fontSize={8}
              color="#9ca3af"
              anchorX="center"
              anchorY="middle"
              fillOpacity={0.2}
              font="/fonts/Montserrat-Regular.ttf"
            >
              YOUR TEXT
            </Text>
          </Center>
        )}
      </Bounds>

      {/* Imperative bloom — avoids R3F reconciler serialization of circular refs */}
      <ImperativeBloom />
    </>
  );
}

export default function Scene() {
  return (
    <Canvas
      camera={{ position: [0, 0, 60], fov: 40 }}
      gl={{
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.9,
      }}
      dpr={[1, 2]}
      className="h-full w-full"
    >
      <Suspense fallback={null}>
        <SceneContent />
      </Suspense>
    </Canvas>
  );
}
