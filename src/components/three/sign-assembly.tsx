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
import { getLedColor } from "./utils/led-colors";
import { computeLetterPositions, getTotalWidth, getTotalHeight } from "./utils/letter-layout";

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
  const ledColor = getLedColor(config.led);
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
  const sceneMode = useConfiguratorStore((s) => s.sceneMode);
  const font = useFont(config.font);
  const prevFontName = useRef(config.font);

  const text = config.text || "";
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

  // Materials with proper disposal via effect cleanup
  const materials = useMemo(
    () => getLetterMaterials(config),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only these 4 fields affect materials
    [config.productType, config.lit, config.led, config.painting]
  );

  useEffect(() => {
    return () => {
      materials.face.dispose();
      materials.sides.dispose();
    };
  }, [materials]);

  // Compute per-character positions using shared helper
  const letterPositions = useMemo(() => {
    if (!font) return [];
    return computeLetterPositions(font, text, height);
  }, [font, text, height]);

  // Feed dimensions back to the store for pricing
  const prevDimsRef = useRef("");
  useEffect(() => {
    if (letterPositions.length > 0) {
      const totalWidth = getTotalWidth(letterPositions);
      const totalHeight = getTotalHeight(letterPositions, height);
      const dimsKey = `${totalWidth}:${totalHeight}`;
      if (dimsKey !== prevDimsRef.current) {
        prevDimsRef.current = dimsKey;
        setDimensions({
          totalWidthInches: totalWidth,
          heightInches: totalHeight,
          squareFeet: (totalWidth * totalHeight) / 144,
          linearFeet: ((totalWidth + totalHeight) * 2) / 12,
          letterWidths: letterPositions.map((p) => p.width),
        });
      }
    }
  }, [letterPositions, height, setDimensions]);

  const totalWidth = getTotalWidth(letterPositions);
  const totalHeight = getTotalHeight(letterPositions, height);
  const xOffset = 0; // Already centered by layout engine

  // Dynamically adjust emissive intensity based on day/night mode
  useFrame((_state, delta) => {
    if ("emissiveIntensity" in materials.face) {
      const emissiveTarget =
        config.lit === "Lit"
          ? sceneMode === "night"
            ? 1.5 * NIGHT_LIGHTING.emissiveMultiplier
            : 1.5 * DAY_LIGHTING.emissiveMultiplier
          : 0;
      materials.face.emissiveIntensity = THREE.MathUtils.lerp(
        materials.face.emissiveIntensity,
        emissiveTarget,
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
  const isTrimCap = config.productType === "front-lit-trim-cap";
  const isMarquee = config.productType === "marquee-letters";
  const ledColorHex = getLedColor(config.led);
  const bevelEnabled = isTrimCap;

  // Trim cap border material (aluminum edge ring)
  const trimCapMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#c0c0c0",
        metalness: 0.85,
        roughness: 0.3,
      }),
    []
  );

  // Marquee bulb material (warm emissive spheres)
  const bulbMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        emissive: new THREE.Color(ledColorHex),
        emissiveIntensity: config.lit === "Lit" ? 2.5 : 0,
      }),
    [ledColorHex, config.lit]
  );

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
          position={[lp.x, lp.y, 0]}
          faceMaterial={materials.face}
          sidesMaterial={materials.sides}
          fontName={config.font}
          bevelEnabled={bevelEnabled}
        />
      ))}

      {/* Trim cap: aluminum border around each letter (slightly larger outline) */}
      {isTrimCap &&
        letterPositions.map((lp, i) => (
          <mesh
            key={`trim-${i}`}
            position={[
              lp.x + lp.width / 2,
              lp.y + height / 2,
              depth / 2 + 0.01,
            ]}
          >
            <planeGeometry args={[lp.width + 0.3, height + 0.3]} />
            <primitive object={trimCapMaterial} attach="material" />
          </mesh>
        ))}

      {/* Marquee bulbs: emissive spheres along each letter perimeter */}
      {isMarquee &&
        letterPositions.map((lp, i) => {
          // Place bulbs evenly along top and bottom of each letter
          const bulbs: [number, number, number][] = [];
          const bulbSpacing = 1.5; // inches between bulbs
          const numBulbsH = Math.max(2, Math.floor(lp.width / bulbSpacing));
          const numBulbsV = Math.max(2, Math.floor(height / bulbSpacing));

          // Top and bottom rows
          for (let b = 0; b <= numBulbsH; b++) {
            const bx = lp.x + (lp.width * b) / numBulbsH;
            bulbs.push([bx, lp.y, depth / 2 + 0.3]);
            bulbs.push([bx, lp.y + height, depth / 2 + 0.3]);
          }
          // Left and right columns
          for (let b = 1; b < numBulbsV; b++) {
            const by = lp.y + (height * b) / numBulbsV;
            bulbs.push([lp.x, by, depth / 2 + 0.3]);
            bulbs.push([lp.x + lp.width, by, depth / 2 + 0.3]);
          }

          return bulbs.map((pos, j) => (
            <mesh key={`bulb-${i}-${j}`} position={pos}>
              <sphereGeometry args={[0.3, 8, 8]} />
              <primitive object={bulbMaterial} attach="material" />
            </mesh>
          ));
        })}

      {/* Back-lit / Halo-lit: emissive glow plane behind each letter */}
      {isBackLit &&
        config.lit === "Lit" &&
        letterPositions.map((lp, i) => (
          <mesh
            key={`glow-${i}`}
            position={[
              lp.x + lp.width / 2,
              lp.y + height / 2,
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
          position={[0, 0, -(depth + 1)]}
          width={totalWidth * 1.1}
          height={totalHeight * 1.2}
          color={ledColorHex}
          intensity={config.productType === "halo-lit" ? 5 : 3}
          rotation={[0, Math.PI, 0]}
        />
      )}

      {/* Raceway (linear) */}
      {config.raceway === "Raceway" && totalWidth > 0 && (
        <Raceway width={totalWidth} height={totalHeight} depth={depth} />
      )}

      {/* Raceway Box */}
      {config.raceway === "Raceway Box" && totalWidth > 0 && (
        <RacewayBox width={totalWidth} height={totalHeight} depth={depth} />
      )}

      {/* Background Panel */}
      {config.background === "Background" && totalWidth > 0 && (
        <BackgroundPanel width={totalWidth} height={totalHeight} depth={depth} />
      )}

      {/* Mounting Studs */}
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
