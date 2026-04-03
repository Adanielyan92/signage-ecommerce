"use client";

import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { useConfiguratorStore } from "@/stores/configurator-store";
import { useFrame } from "@react-three/fiber";
import { useFont } from "./hooks/use-font";
import { SignLetter } from "./sign-letter";
import { clearGeometryCache } from "./utils/geometry-cache";
import { Raceway, RacewayBox, BackgroundPanel, MountingStuds } from "./objects";
import { DAY_LIGHTING, NIGHT_LIGHTING } from "./utils/day-night-lighting";

const LED_COLORS: Record<string, string> = {
  "3000K": "#FFB46B",
  "3500K": "#FFC98E",
  "6000K": "#E3EEFF",
  "Red": "#FF0000",
  "Green": "#00FF00",
  "Blue": "#0066FF",
  RGB: "#FF0000",
};

const QUALITY_MAP: Record<string, number> = {
  low: 4,
  medium: 8,
  high: 12,
};

function getLetterMaterials(config: {
  productType: string;
  lit: string;
  led: string;
  painting: string;
}) {
  const ledColor = LED_COLORS[config.led] || "#FFFFFF";
  const isPainted = config.painting !== "-";
  const paintColor = isPainted ? "#2c3e50" : "#c0c0c0";

  switch (config.productType) {
    case "front-lit-trim-cap":
    case "trimless":
      return {
        face: new THREE.MeshPhysicalMaterial({
          color: "#ffffff",
          emissive: new THREE.Color(ledColor),
          emissiveIntensity: config.lit === "Lit" ? 1.5 : 0,
          transmission: 0.4,
          roughness: 0.15,
          metalness: 0,
          thickness: 0.25,
          ior: 1.49,
        }),
        sides: new THREE.MeshStandardMaterial({
          color: paintColor,
          metalness: 0.85,
          roughness: 0.3,
        }),
      };

    case "back-lit":
    case "halo-lit":
      return {
        face: new THREE.MeshStandardMaterial({
          color: paintColor,
          metalness: 0.85,
          roughness: 0.35,
        }),
        sides: new THREE.MeshStandardMaterial({
          color: "#c0c0c0",
          metalness: 0.9,
          roughness: 0.3,
        }),
      };

    case "marquee-letters":
      return {
        face: new THREE.MeshStandardMaterial({
          color: paintColor,
          metalness: 0.7,
          roughness: 0.4,
          transparent: true,
          opacity: 0.3,
        }),
        sides: new THREE.MeshStandardMaterial({
          color: paintColor,
          metalness: 0.8,
          roughness: 0.4,
        }),
      };

    case "non-lit":
    default:
      return {
        face: new THREE.MeshStandardMaterial({
          color: paintColor,
          metalness: 0.7,
          roughness: 0.4,
        }),
        sides: new THREE.MeshStandardMaterial({
          color: paintColor,
          metalness: 0.9,
          roughness: 0.3,
        }),
      };
  }
}

export function SignAssembly() {
  const config = useConfiguratorStore((s) => s.config);
  const quality = useConfiguratorStore((s) => s.quality);
  const setDimensions = useConfiguratorStore((s) => s.setDimensions);
  const font = useFont(config.font);
  const prevFontName = useRef(config.font);

  const text = config.text || "";
  const textNoSpaces = text.replace(/\s+/g, "");
  const height = config.height;
  const depth = parseFloat(config.sideDepth) || 4;
  const curveSegments = QUALITY_MAP[quality] || 8;

  // Clear geometry cache when font changes
  useEffect(() => {
    if (prevFontName.current !== config.font) {
      clearGeometryCache();
      prevFontName.current = config.font;
    }
  }, [config.font]);

  const materials = useMemo(
    () => getLetterMaterials(config),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only these 4 fields affect materials
    [config.productType, config.lit, config.led, config.painting]
  );

  // Compute per-character positions using font metrics
  const letterPositions = useMemo(() => {
    if (!font || textNoSpaces.length === 0) return [];
    const scale = height / font.unitsPerEm;
    const positions: { char: string; x: number; width: number }[] = [];
    let x = 0;

    for (let i = 0; i < textNoSpaces.length; i++) {
      const glyph = font.charToGlyph(textNoSpaces[i]);
      const advanceWidth =
        (glyph.advanceWidth || font.unitsPerEm * 0.6) * scale;
      positions.push({ char: textNoSpaces[i], x, width: advanceWidth });
      x += advanceWidth;

      if (i < textNoSpaces.length - 1) {
        const nextGlyph = font.charToGlyph(textNoSpaces[i + 1]);
        x += font.getKerningValue(glyph, nextGlyph) * scale;
      }
    }
    return positions;
  }, [font, textNoSpaces, height]);

  // Feed dimensions back to the store for pricing
  const prevDimsRef = useRef("");
  useEffect(() => {
    if (letterPositions.length > 0) {
      const last = letterPositions[letterPositions.length - 1];
      const totalWidth = last.x + last.width;
      const dimsKey = `${totalWidth}:${height}`;
      if (dimsKey !== prevDimsRef.current) {
        prevDimsRef.current = dimsKey;
        setDimensions({
          totalWidthInches: totalWidth,
          heightInches: height,
          squareFeet: (totalWidth * height) / 144,
          linearFeet: ((totalWidth + height) * 2) / 12,
          letterWidths: letterPositions.map((p) => p.width),
        });
      }
    }
  }, [letterPositions, height, setDimensions]);

  const totalWidth =
    letterPositions.length > 0
      ? letterPositions[letterPositions.length - 1].x +
        letterPositions[letterPositions.length - 1].width
      : 0;
  const xOffset = -totalWidth / 2;

  // Dynamically adjust emissive intensity based on day/night mode
  const sceneMode = useConfiguratorStore((s) => s.sceneMode);
  useFrame((_state, delta) => {
    if ("emissiveIntensity" in materials.face) {
      const target =
        config.lit === "Lit"
          ? sceneMode === "night"
            ? 1.5 * NIGHT_LIGHTING.emissiveMultiplier
            : 1.5 * DAY_LIGHTING.emissiveMultiplier
          : 0;
      materials.face.emissiveIntensity = THREE.MathUtils.lerp(
        materials.face.emissiveIntensity,
        target,
        3 * delta
      );
    }
  });

  // RGB color cycling
  const rgbRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
  useFrame((state) => {
    if (config.led === "RGB" && config.lit === "Lit" && rgbRef.current) {
      const hue = (state.clock.elapsedTime * 0.1) % 1;
      rgbRef.current.emissive.setHSL(hue, 1, 0.5);
    }
  });

  useEffect(() => {
    if (
      config.led === "RGB" &&
      materials.face instanceof THREE.MeshPhysicalMaterial
    ) {
      rgbRef.current = materials.face;
    } else {
      rgbRef.current = null;
    }
  }, [config.led, materials.face]);

  const isBackLit =
    config.productType === "back-lit" || config.productType === "halo-lit";
  const ledColorHex = LED_COLORS[config.led] || "#FFFFFF";
  const bevelEnabled = config.productType === "front-lit-trim-cap";

  if (!font) return null;

  return (
    <group>
      {letterPositions.map((lp, i) => (
        <SignLetter
          key={`${lp.char}-${i}`}
          char={lp.char}
          font={font}
          fontSize={height}
          depth={depth}
          curveSegments={curveSegments}
          position={[lp.x + xOffset, 0, 0]}
          faceMaterial={materials.face}
          sidesMaterial={materials.sides}
          fontName={config.font}
          bevelEnabled={bevelEnabled}
        />
      ))}

      {/* Back-lit / Halo-lit: emissive glow plane behind each letter */}
      {isBackLit &&
        config.lit === "Lit" &&
        letterPositions.map((lp, i) => (
          <mesh
            key={`glow-${i}`}
            position={[
              lp.x + xOffset + lp.width / 2,
              height / 2,
              -(depth + 0.5),
            ]}
          >
            <planeGeometry args={[lp.width * 1.3, height * 1.3]} />
            <meshStandardMaterial
              color={ledColorHex}
              emissive={new THREE.Color(ledColorHex)}
              emissiveIntensity={2.0}
              transparent
              opacity={0.4}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}

      {/* Back light area light */}
      {isBackLit && config.lit === "Lit" && (
        <rectAreaLight
          position={[0, height / 2, -(depth + 1)]}
          width={totalWidth * 1.1}
          height={height * 1.2}
          color={ledColorHex}
          intensity={config.productType === "halo-lit" ? 5 : 3}
          rotation={[0, Math.PI, 0]}
        />
      )}

      {/* Raceway (linear) */}
      {config.raceway === "Raceway" && totalWidth > 0 && (
        <Raceway width={totalWidth} height={height} depth={depth} />
      )}

      {/* Raceway Box */}
      {config.raceway === "Raceway Box" && totalWidth > 0 && (
        <RacewayBox width={totalWidth} height={height} depth={depth} />
      )}

      {/* Background Panel */}
      {config.background === "Background" && totalWidth > 0 && (
        <BackgroundPanel width={totalWidth} height={height} depth={depth} />
      )}

      {/* Mounting Studs (always visible for non-lit, hidden for back-lit which has glow planes) */}
      {config.productType !== "back-lit" && config.productType !== "halo-lit" && letterPositions.length > 0 && (
        <MountingStuds
          letterPositions={letterPositions}
          height={height}
          depth={depth}
          xOffset={xOffset}
        />
      )}
    </group>
  );
}
