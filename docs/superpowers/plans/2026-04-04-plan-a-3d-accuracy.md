# Plan A: 3D Accuracy & Product Correctness

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans

**Goal:** Fix all 3D rendering accuracy issues, add missing geometries, validate dimensions, and ensure every product looks exactly like the real manufactured sign.

**Architecture:** Each renderer in `src/components/three/renderers/` is a self-contained React Three Fiber component that receives configuration props from the Zustand configurator-store via `SceneRouter`. The scene graph lives in `src/components/three/scene.tsx` with OrbitControls, bloom post-processing, and auto-fit camera framing. Geometry caching is handled by `src/components/three/utils/geometry-cache.ts`. Text-based products (channel letters, dimensional letters, neon) use opentype.js font parsing via `src/components/three/hooks/use-font.ts` and per-character `SignLetter` components. Panel-based products (cabinet, lightbox, blade, print, banner) use simple Three.js primitives. All renderers feed dimensions back to the store via `setDimensions()` for pricing. Screenshots are captured from the canvas via `src/lib/capture-screenshot.ts` for cart thumbnails.

**Tech Stack:** React Three Fiber, Three.js, @react-three/drei, opentype.js, postprocessing

---

## Task 1: SVG-to-3D Logo Renderer

**Current state:** `src/components/three/renderers/logo-renderer.tsx` renders a generic `<boxGeometry>` placeholder with a face plane overlay. No actual logo shape.

**Goal:** Accept an SVG string (from user upload or preset library), parse it into Three.js `ShapePath` geometry, and extrude it into 3D.

### Files to create/modify

**Create** `src/components/three/utils/svg-to-shapes.ts`:
```typescript
import * as THREE from "three";
import { SVGLoader } from "three/examples/jsm/loaders/SVGLoader.js";

export interface ParsedSvgShapes {
  shapes: THREE.Shape[];
  boundingBox: THREE.Box2;
  originalWidth: number;
  originalHeight: number;
}

/**
 * Parse an SVG string into Three.js Shape objects.
 * Handles <path>, <rect>, <circle>, <polygon>, <ellipse> elements.
 * Returns shapes normalized to center origin with bounding box info.
 */
export function parseSvgToShapes(svgString: string): ParsedSvgShapes {
  const loader = new SVGLoader();
  const svgData = loader.parse(svgString);

  const allShapes: THREE.Shape[] = [];
  const box = new THREE.Box2();

  for (const path of svgData.paths) {
    const shapes = SVGLoader.createShapes(path);
    for (const shape of shapes) {
      allShapes.push(shape);
      // Expand bounding box from shape points
      const pts = shape.getPoints(32);
      for (const pt of pts) {
        box.expandByPoint(pt);
      }
    }
  }

  const size = new THREE.Vector2();
  box.getSize(size);

  // Center all shapes at origin
  const center = new THREE.Vector2();
  box.getCenter(center);
  for (const shape of allShapes) {
    const pts = shape.getPoints();
    // We need to rebuild the shape centered
    // ShapePath approach: offset each shape's curves
    shape.curves.forEach((curve) => {
      if ("v1" in curve && curve.v1 instanceof THREE.Vector2) {
        curve.v1.sub(center);
      }
      if ("v2" in curve && curve.v2 instanceof THREE.Vector2) {
        curve.v2.sub(center);
      }
      if ("v" in curve && curve.v instanceof THREE.Vector2) {
        (curve as THREE.LineCurve).v1.sub(center);
        (curve as THREE.LineCurve).v2.sub(center);
      }
    });
    shape.currentPoint.sub(center);
  }

  return {
    shapes: allShapes,
    boundingBox: box,
    originalWidth: size.x,
    originalHeight: size.y,
  };
}

/**
 * Scale shapes to fit within target width/height (in inches).
 * Returns a new set of shapes (does not mutate originals).
 */
export function scaleShapesToFit(
  shapes: THREE.Shape[],
  originalWidth: number,
  originalHeight: number,
  targetWidth: number,
  targetHeight: number,
): THREE.Shape[] {
  const scaleX = targetWidth / originalWidth;
  const scaleY = targetHeight / originalHeight;
  const uniformScale = Math.min(scaleX, scaleY);

  return shapes.map((shape) => {
    const cloned = shape.clone();
    // Scale all points
    const pts = cloned.getPoints();
    // Rebuild shape from scaled points
    const scaled = new THREE.Shape();
    if (pts.length > 0) {
      scaled.moveTo(pts[0].x * uniformScale, pts[0].y * uniformScale);
      for (let i = 1; i < pts.length; i++) {
        scaled.lineTo(pts[i].x * uniformScale, pts[i].y * uniformScale);
      }
    }
    // Copy holes
    for (const hole of cloned.holes) {
      const holePts = hole.getPoints();
      const scaledHole = new THREE.Path();
      if (holePts.length > 0) {
        scaledHole.moveTo(holePts[0].x * uniformScale, holePts[0].y * uniformScale);
        for (let i = 1; i < holePts.length; i++) {
          scaledHole.lineTo(holePts[i].x * uniformScale, holePts[i].y * uniformScale);
        }
      }
      scaled.holes.push(scaledHole);
    }
    return scaled;
  });
}
```

**Modify** `src/components/three/renderers/logo-renderer.tsx` -- full rewrite:
```typescript
"use client";

import * as THREE from "three";
import { useEffect, useMemo, useRef, useState } from "react";
import { useConfiguratorStore } from "@/stores/configurator-store";
import { getLedColor } from "../utils/led-colors";
import {
  parseSvgToShapes,
  scaleShapesToFit,
  type ParsedSvgShapes,
} from "../utils/svg-to-shapes";

// Preset logo SVGs for demo (star, arrow, shield)
const PRESET_LOGOS: Record<string, string> = {
  star: `<svg viewBox="0 0 100 100"><polygon points="50,5 63,38 98,38 70,60 80,95 50,73 20,95 30,60 2,38 37,38" /></svg>`,
  shield: `<svg viewBox="0 0 100 120"><path d="M50,5 L95,25 L95,60 Q95,95 50,115 Q5,95 5,60 L5,25 Z" /></svg>`,
  circle: `<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" /></svg>`,
};

interface LogoRendererProps {
  width: number;
  height: number;
  depth?: number;
  led?: string;
  painting: string;
  svgString?: string;
  presetShape?: string;
}

export function LogoRenderer({
  width,
  height,
  depth = 3,
  led,
  painting,
  svgString,
  presetShape = "shield",
}: LogoRendererProps) {
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

  const isLit = !!led && led !== "-";
  const ledColor = isLit ? getLedColor(led!) : "#000000";
  const isPainted = painting !== "-";

  // Parse SVG into shapes
  const parsed = useMemo<ParsedSvgShapes | null>(() => {
    const svg = svgString || PRESET_LOGOS[presetShape] || PRESET_LOGOS.shield;
    try {
      return parseSvgToShapes(svg);
    } catch (e) {
      console.error("Failed to parse SVG:", e);
      return null;
    }
  }, [svgString, presetShape]);

  // Scale and extrude
  const geometry = useMemo(() => {
    if (!parsed || parsed.shapes.length === 0) return null;

    const scaled = scaleShapesToFit(
      parsed.shapes,
      parsed.originalWidth,
      parsed.originalHeight,
      width,
      height,
    );

    const extrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth,
      bevelEnabled: true,
      bevelThickness: 0.2,
      bevelSize: 0.15,
      bevelSegments: 3,
      curveSegments: 12,
    };

    const geo = new THREE.ExtrudeGeometry(scaled, extrudeSettings);
    geo.center();
    geo.computeVertexNormals();
    return geo;
  }, [parsed, width, height, depth]);

  const bodyMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: isPainted ? "#2c3e50" : "#c0c0c0",
        metalness: 0.85,
        roughness: 0.3,
      }),
    [isPainted],
  );

  const faceMaterial = useMemo(() => {
    if (isLit) {
      return new THREE.MeshPhysicalMaterial({
        color: "#ffffff",
        emissive: new THREE.Color(ledColor),
        emissiveIntensity: 1.5,
        transmission: 0.35,
        roughness: 0.15,
        thickness: 0.3,
        ior: 1.49,
      });
    }
    return new THREE.MeshStandardMaterial({
      color: isPainted ? "#2c3e50" : "#b0b0b0",
      metalness: 0.7,
      roughness: 0.4,
    });
  }, [isLit, ledColor, isPainted]);

  // Fallback: if SVG parsing fails, render a box like before
  if (!geometry) {
    return (
      <group>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[width, height, depth]} />
          <primitive object={bodyMaterial} attach="material" />
        </mesh>
      </group>
    );
  }

  // Extruded geometry has face indices: 0..N for front, then sides, then back.
  // We apply multi-material: [sides/back material, face material]
  const materials = [bodyMaterial, faceMaterial];

  return (
    <group>
      <mesh
        geometry={geometry}
        material={materials}
        castShadow
        receiveShadow
      />

      {/* Back glow for lit logos */}
      {isLit && (
        <rectAreaLight
          position={[0, 0, -(depth / 2 + 0.5)]}
          width={width * 0.8}
          height={height * 0.8}
          color={ledColor}
          intensity={3}
          rotation={[0, Math.PI, 0]}
        />
      )}
    </group>
  );
}
```

**Modify** `src/components/three/scene-router.tsx` -- update LogoRenderer usage to pass `presetShape`:
```typescript
// In the LOGOS case, add presetShape prop:
case "LOGOS":
  return (
    <LogoRenderer
      width={logoConfig.widthInches}
      height={logoConfig.heightInches}
      led={logoConfig.productType === "lit-logo" ? logoConfig.led : undefined}
      painting={logoConfig.painting}
      presetShape="shield"
    />
  );
```

### Commit message
```
feat: replace placeholder logo renderer with SVG-to-3D extrusion

Add svg-to-shapes utility that parses SVG strings via Three.js SVGLoader
and extrudes them into 3D geometry. LogoRenderer now renders actual shaped
geometry with proper face/sides materials instead of a generic box.
```

---

## Task 2: Lit Shape Renderer with Proper Geometry

**Current state:** `src/components/three/renderers/lit-shape-renderer.tsx` renders a generic `<boxGeometry>` for all lit shape types (cloud sign, logo shape). No actual cloud or custom shape geometry.

**Goal:** Render a cloud silhouette for `cloud-sign` product type and use SVG extrusion for `logo-shape`. The cloud shape should use a predefined bezier curve path.

### Files to modify

**Modify** `src/components/three/renderers/lit-shape-renderer.tsx` -- full rewrite:
```typescript
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

  return (
    <group>
      {/* Extruded shape body with multi-material [sides, face] */}
      <mesh geometry={geometry} castShadow receiveShadow>
        <primitive object={bodyMaterial} attach="material" />
      </mesh>

      {/* Lit face overlay -- uses a slightly smaller version of the shape */}
      <mesh position={[0, 0, depth / 2 + 0.1]}>
        <primitive object={faceMaterial} attach="material" />
        <planeGeometry args={[width * 0.9, height * 0.9]} />
      </mesh>
    </group>
  );
}
```

### Commit message
```
feat: add cloud shape geometry to lit shape renderer

Replace placeholder box with proper cloud silhouette using bezier curves
and ExtrudeGeometry. Logo-shape variant uses a rounded rectangle extrusion.
Both get proper face/sides material separation.
```

---

## Task 3: Double-Sided Product Flip Controls

**Current state:** Cabinet, lightbox, blade, and sign post renderers support `doubleSided`/`doubleFace` prop and render a back face plane. However, OrbitControls in `scene.tsx` restrict azimuth rotation to +/-45 degrees (`minAzimuthAngle={-Math.PI * 0.45}`, `maxAzimuthAngle={Math.PI * 0.45}`), preventing users from seeing the back. There is no flip button.

**Goal:** When a double-sided product is active, unlock full 360-degree horizontal orbit AND add a "Flip to Back" button overlay on the 3D viewport.

### Files to modify

**Modify** `src/components/three/scene.tsx` -- make OrbitControls aware of double-sided state:

In `SceneContent`, read the double-sided flag from the store and conditionally set azimuth limits:
```typescript
// Add at top of SceneContent:
const productCategory = useConfiguratorStore((s) => s.productCategory);
const cabinetConfig = useConfiguratorStore((s) => s.cabinetConfig);
const bladeConfig = useConfiguratorStore((s) => s.bladeConfig);
const signPostConfig = useConfiguratorStore((s) => s.signPostConfig);
const lightBoxConfig = useConfiguratorStore((s) => s.lightBoxConfig);
const bannerConfig = useConfiguratorStore((s) => s.bannerConfig);

const isDoubleSided = useMemo(() => {
  switch (productCategory) {
    case "CABINET_SIGNS":
      return cabinetConfig.productType.startsWith("double");
    case "BLADE_SIGNS":
      return bladeConfig.doubleSided;
    case "SIGN_POSTS":
      return signPostConfig.doubleSided;
    case "LIGHT_BOX_SIGNS":
      return lightBoxConfig.productType === "light-box-double";
    case "VINYL_BANNERS":
      return bannerConfig.doubleSided;
    default:
      return false;
  }
}, [productCategory, cabinetConfig, bladeConfig, signPostConfig, lightBoxConfig, bannerConfig]);
```

Update OrbitControls:
```typescript
<OrbitControls
  makeDefault
  enableDamping
  dampingFactor={0.08}
  minDistance={15}
  maxDistance={200}
  enablePan={false}
  minPolarAngle={Math.PI * 0.2}
  maxPolarAngle={Math.PI * 0.75}
  minAzimuthAngle={isDoubleSided ? -Infinity : -Math.PI * 0.45}
  maxAzimuthAngle={isDoubleSided ? Infinity : Math.PI * 0.45}
/>
```

**Modify** `src/components/configurator/configurator-layout.tsx` -- add flip button:

Add a "Flip View" button next to the DayNightToggle inside the 3D viewport area:
```typescript
// Add import
import { RotateCw } from "lucide-react";

// Add state for flip
const [isFlipped, setIsFlipped] = useState(false);

// Add flip button in the viewport overlay area (after DayNightToggle):
{isDoubleSided && (
  <button
    onClick={() => setIsFlipped(!isFlipped)}
    className="absolute right-4 top-14 flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-sm font-medium text-neutral-700 shadow-sm backdrop-blur-sm transition hover:bg-white"
  >
    <RotateCw className="h-4 w-4" />
    {isFlipped ? "Front View" : "Back View"}
  </button>
)}
```

The flip action should programmatically rotate the OrbitControls target azimuth by PI. This requires accessing the controls ref. An alternative simpler approach: rotate the sign group itself by PI on Y when flipped:

```typescript
// In the scene, expose a flip state. Add to configurator-store:
// isFlipped: boolean, toggleFlip: () => void
```

### Commit message
```
feat: add full 360 orbit and flip button for double-sided products

Unlock unrestricted azimuth rotation when a double-sided product is
selected. Add a "Flip View" overlay button in the 3D viewport that
rotates the camera to the back face.
```

---

## Task 4: Neon Backer Contour Shape

**Current state:** `src/components/three/renderers/neon-assembly.tsx` renders only a rectangular `<planeGeometry>` backer panel regardless of the `backerShape` prop. When `backerShape === "contour"`, the backer should follow the text outline.

**Goal:** When `backerShape` is `"contour"`, compute a convex hull (or padded bounding path) around all letter positions and render the backer as an extruded contour shape instead of a rectangle.

### Files to modify

**Create** `src/components/three/utils/contour-backer.ts`:
```typescript
import * as THREE from "three";

interface LetterBounds {
  x: number;
  width: number;
  height: number;
}

/**
 * Create a contour-following backer shape around text.
 * Uses a rounded rectangle that tightly follows the text bounding box
 * with per-character top/bottom padding for a natural contour feel.
 *
 * For a true text-outline contour, you'd need the actual glyph outlines,
 * but this "pill" approach is what most neon sign makers use.
 */
export function createContourBackerShape(
  letters: LetterBounds[],
  textHeight: number,
  padding: number,
): THREE.Shape {
  if (letters.length === 0) {
    return new THREE.Shape();
  }

  const firstX = letters[0].x - padding;
  const lastLetter = letters[letters.length - 1];
  const lastX = lastLetter.x + lastLetter.width + padding;
  const totalWidth = lastX - firstX;
  const totalHeight = textHeight + padding * 2;

  const cornerRadius = Math.min(totalHeight * 0.4, totalWidth * 0.15, padding * 1.5);
  const r = cornerRadius;

  // Rounded rectangle (pill shape) centered on text
  const shape = new THREE.Shape();
  const x0 = firstX;
  const y0 = -padding;
  const x1 = lastX;
  const y1 = textHeight + padding;

  shape.moveTo(x0 + r, y0);
  shape.lineTo(x1 - r, y0);
  shape.quadraticCurveTo(x1, y0, x1, y0 + r);
  shape.lineTo(x1, y1 - r);
  shape.quadraticCurveTo(x1, y1, x1 - r, y1);
  shape.lineTo(x0 + r, y1);
  shape.quadraticCurveTo(x0, y1, x0, y1 - r);
  shape.lineTo(x0, y0 + r);
  shape.quadraticCurveTo(x0, y0, x0 + r, y0);

  return shape;
}
```

**Modify** `src/components/three/renderers/neon-assembly.tsx`:

Replace the backer rendering section (lines 189-195) with:
```typescript
import { createContourBackerShape } from "../utils/contour-backer";

// Inside the component, compute contour backer geometry:
const contourBackerGeometry = useMemo(() => {
  if (backerShape !== "contour" || letterPositions.length === 0) return null;
  const contourShape = createContourBackerShape(
    letterPositions.map((lp) => ({
      x: lp.x + xOffset,
      width: lp.width,
      height,
    })),
    height,
    BACKER_PADDING,
  );
  const geo = new THREE.ShapeGeometry(contourShape, 16);
  return geo;
}, [backerShape, letterPositions, height, xOffset]);

// Replace the backer JSX:
{backer !== "none" && backerMaterial && totalWidth > 0 && (
  backerShape === "contour" && contourBackerGeometry ? (
    <mesh
      geometry={contourBackerGeometry}
      position={[0, 0, -(NEON_DEPTH + 0.5)]}
    >
      <primitive object={backerMaterial} attach="material" />
    </mesh>
  ) : (
    <mesh position={[0, height / 2, -(NEON_DEPTH + 0.5)]}>
      <planeGeometry args={[backerWidth, backerHeight]} />
      <primitive object={backerMaterial} attach="material" />
    </mesh>
  )
)}
```

### Commit message
```
feat: add contour backer shape for neon signs

When backerShape is "contour", render a rounded pill shape that follows
the text bounding box instead of a plain rectangle. Uses a bezier-curved
ShapeGeometry with per-letter bounds for natural contour feel.
```

---

## Task 5: Geometry Cache LRU Eviction

**Current state:** `src/components/three/utils/geometry-cache.ts` uses an unbounded `Map<CacheKey, ExtrudeGeometry>`. With many font/size/depth combinations, memory grows indefinitely.

**Goal:** Implement an LRU eviction strategy with a configurable max size (default 200 entries). When the limit is reached, dispose and remove the least recently accessed geometry.

### Files to modify

**Modify** `src/components/three/utils/geometry-cache.ts` -- full rewrite:
```typescript
import * as THREE from "three";

type CacheKey = string;

const MAX_CACHE_SIZE = 200;

interface CacheEntry {
  geometry: THREE.ExtrudeGeometry | null;
  lastAccessed: number;
}

function makeKey(
  fontName: string,
  charCode: number,
  depth: number,
  curveSegments: number,
  bevel: boolean = false,
): CacheKey {
  return `${fontName}:${charCode}:${depth}:${curveSegments}:${bevel ? 1 : 0}`;
}

const cache = new Map<CacheKey, CacheEntry>();
let accessCounter = 0;

function evictLeastRecentlyUsed(): void {
  if (cache.size <= MAX_CACHE_SIZE) return;

  const entriesToEvict = cache.size - MAX_CACHE_SIZE;
  // Sort entries by lastAccessed ascending (oldest first)
  const sorted = [...cache.entries()].sort(
    (a, b) => a[1].lastAccessed - b[1].lastAccessed,
  );

  for (let i = 0; i < entriesToEvict; i++) {
    const [key, entry] = sorted[i];
    entry.geometry?.dispose();
    cache.delete(key);
  }
}

export function getCachedGeometry(
  fontName: string,
  charCode: number,
  depth: number,
  curveSegments: number,
  bevel: boolean = false,
): THREE.ExtrudeGeometry | null | undefined {
  const key = makeKey(fontName, charCode, depth, curveSegments, bevel);
  const entry = cache.get(key);
  if (entry) {
    entry.lastAccessed = ++accessCounter;
    return entry.geometry;
  }
  return undefined; // cache miss
}

export function setCachedGeometry(
  fontName: string,
  charCode: number,
  depth: number,
  curveSegments: number,
  geometry: THREE.ExtrudeGeometry | null,
  bevel: boolean = false,
): void {
  const key = makeKey(fontName, charCode, depth, curveSegments, bevel);
  cache.set(key, { geometry, lastAccessed: ++accessCounter });
  evictLeastRecentlyUsed();
}

export function clearGeometryCache(): void {
  cache.forEach((entry) => entry.geometry?.dispose());
  cache.clear();
  accessCounter = 0;
}

export function getCacheSize(): number {
  return cache.size;
}
```

### Commit message
```
fix: add LRU eviction to geometry cache (max 200 entries)

The geometry cache previously grew unbounded. Now tracks access order
and evicts least recently used entries when the cache exceeds 200 items,
properly disposing Three.js geometry to prevent memory leaks.
```

---

## Task 6: Form Validation for Configurators

**Current state:** All configurator option panels accept any numeric input including 0 and negative values for dimensions. Text fields have no minimum length validation at submission time.

**Goal:** Add validation to all configurator inputs: minimum dimension values (e.g., 6" height, 4" width), non-empty text for text-based products, and clear error messages.

### Files to create/modify

**Create** `src/lib/validation.ts`:
```typescript
export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

const MIN_HEIGHT_INCHES = 6;
const MIN_WIDTH_INCHES = 4;
const MAX_HEIGHT_INCHES = 120;
const MAX_WIDTH_INCHES = 240;
const MIN_TEXT_LENGTH = 1;
const MAX_TEXT_LENGTH = 50;

export function validateTextInput(text: string, fieldName = "text"): ValidationError[] {
  const errors: ValidationError[] = [];
  const stripped = text.replace(/\s+/g, "");
  if (stripped.length < MIN_TEXT_LENGTH) {
    errors.push({ field: fieldName, message: "Enter at least 1 character" });
  }
  if (stripped.length > MAX_TEXT_LENGTH) {
    errors.push({ field: fieldName, message: `Maximum ${MAX_TEXT_LENGTH} characters` });
  }
  return errors;
}

export function validateDimension(
  value: number,
  fieldName: string,
  min = MIN_WIDTH_INCHES,
  max = MAX_WIDTH_INCHES,
): ValidationError[] {
  const errors: ValidationError[] = [];
  if (!value || value <= 0) {
    errors.push({ field: fieldName, message: `${fieldName} must be greater than 0` });
  } else if (value < min) {
    errors.push({ field: fieldName, message: `Minimum ${min}" for ${fieldName}` });
  } else if (value > max) {
    errors.push({ field: fieldName, message: `Maximum ${max}" for ${fieldName}` });
  }
  return errors;
}

export function validateHeight(value: number): ValidationError[] {
  return validateDimension(value, "height", MIN_HEIGHT_INCHES, MAX_HEIGHT_INCHES);
}

export function validateWidth(value: number): ValidationError[] {
  return validateDimension(value, "width", MIN_WIDTH_INCHES, MAX_WIDTH_INCHES);
}

export function validateChannelLetterConfig(config: {
  text: string;
  height: number;
}): ValidationResult {
  const errors = [
    ...validateTextInput(config.text),
    ...validateHeight(config.height),
  ];
  return { valid: errors.length === 0, errors };
}

export function validatePanelConfig(config: {
  widthInches: number;
  heightInches: number;
}): ValidationResult {
  const errors = [
    ...validateWidth(config.widthInches),
    ...validateHeight(config.heightInches),
  ];
  return { valid: errors.length === 0, errors };
}
```

**Modify** `src/components/configurator/options/channel-letter-options.tsx`:

Add validation feedback below the text input and height slider:
```typescript
import { validateTextInput, validateHeight } from "@/lib/validation";

// Inside the component, compute validation:
const textErrors = localText.length > 0 ? validateTextInput(localText) : [];
const heightErrors = validateHeight(config.height);

// Below the text input, add:
{textErrors.length > 0 && (
  <p className="mt-1 text-xs text-red-500">{textErrors[0].message}</p>
)}

// Below the height slider, add:
{heightErrors.length > 0 && (
  <p className="mt-1 text-xs text-red-500">{heightErrors[0].message}</p>
)}
```

Apply the same pattern to all other option panels:
- `src/components/configurator/options/cabinet-options.tsx` -- validate widthInches, heightInches
- `src/components/configurator/options/lit-shape-options.tsx` -- validate widthInches, heightInches
- `src/components/configurator/options/logo-options.tsx` -- validate widthInches, heightInches
- `src/components/configurator/options/print-options.tsx` -- validate widthInches, heightInches
- `src/components/configurator/options/sign-post-options.tsx` -- validate signWidthInches, signHeightInches, postHeight
- `src/components/configurator/options/light-box-options.tsx` -- validate widthInches, heightInches
- `src/components/configurator/options/blade-options.tsx` -- validate widthInches, heightInches
- `src/components/configurator/options/neon-options.tsx` -- validate text, height
- `src/components/configurator/options/banner-options.tsx` -- validate widthInches, heightInches
- `src/components/configurator/options/dimensional-options.tsx` -- validate text, height

**Modify** `src/components/configurator/configurator-layout.tsx`:

Update `canAddToCart` to also check validation:
```typescript
import { validateChannelLetterConfig, validatePanelConfig } from "@/lib/validation";

// Replace the canAddToCart logic:
const canAddToCart = (() => {
  if (!hasRequiredInput || breakdown.total <= 0) return false;
  if (productCategory === "CHANNEL_LETTERS") {
    return validateChannelLetterConfig(config).valid;
  }
  if (productCategory === "DIMENSIONAL_LETTERS" || productCategory === "NEON_SIGNS") {
    const active = getActiveConfig();
    if ("text" in active && "height" in active) {
      return validateChannelLetterConfig(active as { text: string; height: number }).valid;
    }
  }
  // Panel-based: check dimensions are valid
  if (dimensions.totalWidthInches >= 4 && dimensions.heightInches >= 6) {
    return true;
  }
  return false;
})();
```

### Commit message
```
feat: add form validation for all configurator inputs

Add validation library with min/max dimension checks and text length
validation. Display inline error messages below inputs. Block Add to
Cart when validation fails. Covers all 11 product configurators.
```

---

## Task 7: Dimension Accuracy Audit & Standardization

**Current state:** All renderers use raw prop values (inches) directly as Three.js unit arguments. For example, `<boxGeometry args={[width, height, depth]} />` where width/height are in inches. This is consistent (1 inch = 1 Three.js unit) but not verified across all renderers. Some renderers use hardcoded offsets that may not match inch scale.

**Goal:** Audit every renderer to verify consistent 1:1 inch-to-unit mapping, fix any discrepancies, and add a constant + comment documenting the convention.

### Files to modify

**Create** `src/components/three/utils/constants.ts`:
```typescript
/**
 * Three.js unit scale convention:
 * 1 Three.js unit = 1 inch
 *
 * All renderers MUST use this convention.
 * Input dimensions from the configurator store are always in inches.
 * The camera starts at z=60 (60 inches away) with auto-fit framing.
 */
export const INCHES_PER_UNIT = 1;

/**
 * Standard material properties for real-world signage materials.
 * Use these constants in all renderers for consistency.
 */
export const MATERIALS = {
  ALUMINUM: {
    metalness: 0.85,
    roughness: 0.3,
    color: "#c0c0c0",
  },
  ALUMINUM_PAINTED: {
    metalness: 0.55,
    roughness: 0.5,
  },
  ACRYLIC_TRANSLUCENT: {
    transmission: 0.8,
    ior: 1.49,
    roughness: 0.1,
  },
  ACRYLIC_OPAQUE: {
    metalness: 0.0,
    roughness: 0.15,
    ior: 1.49,
  },
  NEON_TUBE: {
    emissiveIntensity: 3.0,
    roughness: 0.15,
    transmission: 0.1,
  },
  PAINTED_METAL: {
    metalness: 0.55,
    roughness: 0.5,
  },
  CONCRETE: {
    metalness: 0.0,
    roughness: 0.9,
    color: "#808080",
  },
} as const;

/** Standard bevel settings for channel letter trim caps */
export const TRIM_CAP_BEVEL = {
  bevelEnabled: true,
  bevelThickness: 0.15,
  bevelSize: 0.1,
  bevelSegments: 3,
} as const;

/** Standard face overlay offset from body surface */
export const FACE_OVERLAY_OFFSET = 0.05;
```

**Audit and fix these files** (verify args match inch scale, update material constants):
- `src/components/three/renderers/cabinet-renderer.tsx` -- body material `metalness: 0.7` should be `0.85` per aluminum spec. Update.
- `src/components/three/renderers/lit-shape-renderer.tsx` -- body material same fix.
- `src/components/three/renderers/logo-renderer.tsx` -- already uses 0.85 after Task 1.
- `src/components/three/renderers/print-sign-renderer.tsx` -- ACM panel metalness 0.6 is correct for aluminum composite (different from raw aluminum).
- `src/components/three/renderers/sign-post-renderer.tsx` -- post material metalness 0.85 correct. Monument material `metalness: 0.6` is wrong for concrete -- should be 0.0. Fix.
- `src/components/three/renderers/light-box-renderer.tsx` -- body metalness 0.75, should be 0.85.
- `src/components/three/renderers/blade-renderer.tsx` -- sign body metalness 0.7, should be 0.85 for aluminum frame.
- `src/components/three/renderers/neon-assembly.tsx` -- neon emissiveIntensity is 3.0, correct per spec.
- `src/components/three/renderers/dimensional-assembly.tsx` -- flat-cut aluminum metalness 0.85 correct, acrylic IOR 1.49 correct.

Import `MATERIALS` constant in each file and use it for material creation.

### Commit message
```
fix: standardize material properties and document dimension convention

Add shared constants file defining 1:1 inch-to-unit mapping and
canonical material properties. Fix metalness values: cabinet and
lightbox aluminum now 0.85 (was 0.7-0.75), monument base now non-metal
(was 0.6). All renderers import from shared constants.
```

---

## Task 8: Missing Visual Elements -- Trim Cap, Marquee Bulbs, Raceway

**Current state:**
- Channel letters use a simple bevel on ExtrudeGeometry for the trim cap edge. Real trim caps are an aluminum U-channel wrapped around the letter perimeter, creating a visible metallic border.
- Marquee letters currently show LED glow via emissive materials but no individual bulb spheres.
- The raceway option adds pricing but no visual representation in the 3D scene.

**Goal:** Add visual representations for trim cap borders, marquee bulb spheres, and raceway mounting channel.

### Files to modify

**Modify** `src/components/three/sign-letter.tsx` (or equivalent per-character component):

For trim cap: when the product type is `front-lit-trim-cap`, add a slightly larger extruded outline with aluminum material that sits behind the letter face, creating the visible metal border effect. This can be achieved by:
1. Extruding the same shape at a slightly larger scale (offset outward by 0.15 inches)
2. Using a thin depth (0.3 inches) positioned at the front face
3. Aluminum material (metalness 0.85, roughness 0.3)

For marquee bulbs: when the product type is `marquee-letters`, add sphere meshes spaced evenly around each letter's perimeter. Use `shape.getSpacedPoints(N)` to get evenly spaced points along the letter outline, then place small emissive spheres (radius 0.3 inches) at each point.

**Create** `src/components/three/renderers/raceway-renderer.tsx`:
```typescript
"use client";

import * as THREE from "three";
import { useMemo } from "react";

interface RacewayRendererProps {
  width: number; // total sign width in inches
  raceType: "linear" | "box";
  heightOffset: number; // Y position (typically below the letters)
}

/**
 * Raceway: a metal channel mounted below channel letters that hides wiring.
 * Linear: narrow U-channel running the width of the sign.
 * Box: wider rectangular enclosure for larger installations.
 */
export function RacewayRenderer({
  width,
  raceType,
  heightOffset,
}: RacewayRendererProps) {
  const raceHeight = raceType === "box" ? 4 : 2; // inches
  const raceDepth = raceType === "box" ? 4 : 2.5; // inches

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#909090",
        metalness: 0.85,
        roughness: 0.3,
      }),
    [],
  );

  // Wire channel groove on the back
  const grooveMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#404040",
        metalness: 0.5,
        roughness: 0.6,
      }),
    [],
  );

  return (
    <group position={[0, heightOffset - raceHeight / 2, 0]}>
      {/* Main raceway body */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[width, raceHeight, raceDepth]} />
        <primitive object={material} attach="material" />
      </mesh>

      {/* Wire channel groove (back face indent) */}
      <mesh position={[0, 0, -(raceDepth / 2 + 0.01)]}>
        <planeGeometry args={[width * 0.85, raceHeight * 0.6]} />
        <primitive object={grooveMaterial} attach="material" />
      </mesh>

      {/* Mounting holes (decorative circles on front) */}
      {[-width / 3, 0, width / 3].map((x, i) => (
        <mesh key={i} position={[x, 0, raceDepth / 2 + 0.02]}>
          <circleGeometry args={[0.25, 16]} />
          <primitive object={grooveMaterial} attach="material" />
        </mesh>
      ))}
    </group>
  );
}
```

**Modify** `src/components/three/sign-assembly.tsx` to conditionally render `<RacewayRenderer>` when `config.raceway !== "-"`.

### Commit message
```
feat: add trim cap edge, marquee bulbs, and raceway visuals

Channel letters with trim cap now show an aluminum border ring around
each letter. Marquee letters render evenly-spaced emissive sphere bulbs
along the letter perimeter. Raceway option renders a metal mounting
channel below the sign with wire grooves and mounting holes.
```

---

## Task 9: Monument Sign Texture & Pylon Structure

**Current state:**
- Monument sign in `sign-post-renderer.tsx` uses a plain gray `MeshStandardMaterial` with `metalness: 0.6`. Real monument signs have stone, concrete, or textured masonry bases.
- There is no pylon sign product type, but the sign post renderer could support it. The roadmap mentions pylon signs under "missing visual elements."

**Goal:** Add a concrete/stone texture to monument base and add a tall pylon pole structure option.

### Files to modify

**Modify** `src/components/three/renderers/sign-post-renderer.tsx`:

Update the monument material to simulate concrete/stone:
```typescript
const monumentMaterial = useMemo(
  () =>
    new THREE.MeshStandardMaterial({
      color: "#7a7a72",
      metalness: 0.0,
      roughness: 0.9,
      // Add subtle texture variation via bump
    }),
  [],
);
```

Add a `"pylon"` post type case in the rendering logic:
```typescript
// After the isMonument case, add:
const isPylon = postType === "pylon";

// In the JSX, add pylon rendering:
{isPylon && (
  <>
    {/* Tall narrow pylon pole */}
    <mesh position={[0, postHeight / 2, 0]} castShadow>
      <boxGeometry args={[POST_RECT_WIDTH, postHeight, POST_RECT_DEPTH]} />
      <primitive object={postMaterial} attach="material" />
    </mesh>
    {/* Flared base for pylon */}
    <mesh position={[0, 2, 0]} castShadow>
      <boxGeometry args={[POST_RECT_WIDTH * 2, 4, POST_RECT_DEPTH * 2]} />
      <primitive object={monumentMaterial} attach="material" />
    </mesh>
  </>
)}
```

For the monument base, add a subtle stone-like cap on top:
```typescript
{isMonument && (
  <>
    {/* Stone/concrete base */}
    <mesh position={[0, postHeight / 2, 0]} castShadow receiveShadow>
      <boxGeometry
        args={[
          signWidth + MONUMENT_WIDTH_PAD * 2,
          postHeight,
          POST_RECT_DEPTH * 2,
        ]}
      />
      <primitive object={monumentMaterial} attach="material" />
    </mesh>
    {/* Cap stone on top of monument */}
    <mesh position={[0, postHeight + 0.75, 0]} castShadow>
      <boxGeometry
        args={[
          signWidth + MONUMENT_WIDTH_PAD * 2 + 2,
          1.5,
          POST_RECT_DEPTH * 2 + 1,
        ]}
      />
      <primitive object={monumentMaterial} attach="material" />
    </mesh>
  </>
)}
```

### Commit message
```
feat: add stone texture to monument base and pylon pole structure

Monument sign base now uses non-metallic concrete material (roughness
0.9, metalness 0.0) with a decorative cap stone. Add pylon post type
with tall narrow pole and flared base.
```

---

## Task 10: Screenshot Capture Fix

**Current state:** `src/lib/capture-screenshot.ts` grabs the first `<canvas>` element on the page via `document.querySelector("canvas")` and calls `toDataURL()`. The Three.js renderer has `preserveDrawingBuffer: true` set in `scene.tsx`. However, the screenshot may capture an empty/black frame if:
1. The canvas hasn't rendered the current frame yet (race condition).
2. Multiple canvases exist on the page.
3. The canvas is obscured or has zero dimensions.

**Goal:** Make screenshot capture reliable by targeting the specific Three.js canvas and ensuring a frame has rendered.

### Files to modify

**Modify** `src/lib/capture-screenshot.ts`:
```typescript
/**
 * Capture a screenshot of the Three.js canvas element.
 * Returns a WebP data URL string, or null if no canvas is found.
 *
 * Targets the specific R3F canvas by looking inside the scene container.
 * The Three.js renderer must have `preserveDrawingBuffer: true`.
 */
export function captureCanvasScreenshot(
  maxWidth = 400,
  quality = 0.8,
): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  // Target the R3F canvas specifically -- it's inside the scene container div
  // which has the class "h-full w-full" set in scene.tsx
  const canvas = document.querySelector<HTMLCanvasElement>(
    ".bg-neutral-100 canvas, [data-r3f-canvas] canvas, canvas[data-engine]"
  ) ?? document.querySelector<HTMLCanvasElement>("canvas");

  if (!canvas) {
    console.warn("No canvas element found for screenshot capture");
    return null;
  }

  // Verify canvas has non-zero dimensions
  if (canvas.width === 0 || canvas.height === 0) {
    console.warn("Canvas has zero dimensions");
    return null;
  }

  try {
    // If the canvas is very large, downscale for thumbnail
    if (canvas.width > maxWidth) {
      const scale = maxWidth / canvas.width;
      const offscreen = document.createElement("canvas");
      offscreen.width = Math.round(canvas.width * scale);
      offscreen.height = Math.round(canvas.height * scale);
      const ctx = offscreen.getContext("2d");
      if (ctx) {
        ctx.drawImage(canvas, 0, 0, offscreen.width, offscreen.height);
        return offscreen.toDataURL("image/webp", quality);
      }
    }

    return canvas.toDataURL("image/webp", quality);
  } catch (error) {
    console.error("Failed to capture canvas screenshot:", error);

    // Fall back to PNG if WebP fails
    try {
      return canvas.toDataURL("image/png");
    } catch (fallbackError) {
      console.error("Fallback PNG capture also failed:", fallbackError);
      return null;
    }
  }
}

/**
 * Capture with a brief delay to ensure the current frame has rendered.
 * Use this when capturing immediately after a state change.
 */
export function captureCanvasScreenshotAsync(
  maxWidth = 400,
  quality = 0.8,
): Promise<string | null> {
  return new Promise((resolve) => {
    // Wait 2 frames for R3F to render the current state
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        resolve(captureCanvasScreenshot(maxWidth, quality));
      });
    });
  });
}
```

**Modify** `src/components/configurator/configurator-layout.tsx`:

Update the `handleAddToCart` function to use the async version:
```typescript
import { captureCanvasScreenshotAsync } from "@/lib/capture-screenshot";

const handleAddToCart = async () => {
  if (!canAddToCart) return;

  const activeConfig = getActiveConfig();
  // Capture with async to ensure frame is rendered
  const thumbnailUrl = await captureCanvasScreenshotAsync() ?? undefined;

  addItem({
    productCategory,
    productType: product.slug as UnifiedCartItem["productType"],
    productName: product.name,
    configuration: { ...activeConfig },
    dimensions: { ...dimensions },
    thumbnailUrl,
    quantity: 1,
    unitPrice: breakdown.total,
  });

  toast.success("Added to cart");
};
```

Also update `handleSaveDesign` similarly.

### Commit message
```
fix: improve screenshot capture reliability for cart thumbnails

Add smarter canvas targeting, dimension verification, and thumbnail
downscaling. New async variant waits for 2 animation frames before
capture to prevent black/empty screenshots after state changes.
```

---

## Execution Order

Tasks are largely independent and can be parallelized. Recommended grouping:

**Batch 1** (no dependencies):
- Task 5: Geometry Cache LRU (small, isolated utility)
- Task 6: Form Validation (new file + small edits to each options panel)
- Task 7: Dimension Accuracy Audit (material constant changes)
- Task 10: Screenshot Capture Fix (isolated utility)

**Batch 2** (depends on Task 7 constants):
- Task 1: SVG-to-3D Logo Renderer
- Task 2: Lit Shape Renderer
- Task 4: Neon Backer Contour
- Task 9: Monument Texture & Pylon

**Batch 3** (may touch overlapping files):
- Task 3: Double-Sided Flip Controls (modifies scene.tsx + configurator-layout.tsx)
- Task 8: Trim Cap, Marquee Bulbs, Raceway (modifies sign-assembly.tsx + sign-letter.tsx)

**Verification after each task:**
1. `npm run build` -- no TypeScript errors
2. `npm run lint` -- no new lint warnings
3. `npx jest` -- all 20 pricing tests still pass
4. Manual check: open the configurator for the affected product type and verify the 3D render
