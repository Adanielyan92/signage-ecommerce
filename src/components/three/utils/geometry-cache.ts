import * as THREE from "three";

type CacheKey = string;

function makeKey(
  fontName: string,
  charCode: number,
  depth: number,
  curveSegments: number,
  bevel: boolean = false,
): CacheKey {
  return `${fontName}:${charCode}:${depth}:${curveSegments}:${bevel ? 1 : 0}`;
}

const cache = new Map<CacheKey, THREE.ExtrudeGeometry | null>();

export function getCachedGeometry(
  fontName: string,
  charCode: number,
  depth: number,
  curveSegments: number,
  bevel: boolean = false,
): THREE.ExtrudeGeometry | null | undefined {
  const key = makeKey(fontName, charCode, depth, curveSegments, bevel);
  if (cache.has(key)) return cache.get(key)!;
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
  cache.set(key, geometry);
}

export function clearGeometryCache(): void {
  cache.forEach((geo) => geo?.dispose());
  cache.clear();
}
