import * as THREE from "three";

type CacheKey = string;

function makeKey(
  fontName: string,
  charCode: number,
  depth: number,
  curveSegments: number
): CacheKey {
  return `${fontName}:${charCode}:${depth}:${curveSegments}`;
}

const cache = new Map<CacheKey, THREE.ExtrudeGeometry | null>();

export function getCachedGeometry(
  fontName: string,
  charCode: number,
  depth: number,
  curveSegments: number
): THREE.ExtrudeGeometry | null | undefined {
  const key = makeKey(fontName, charCode, depth, curveSegments);
  if (cache.has(key)) return cache.get(key)!;
  return undefined; // cache miss
}

export function setCachedGeometry(
  fontName: string,
  charCode: number,
  depth: number,
  curveSegments: number,
  geometry: THREE.ExtrudeGeometry | null
): void {
  const key = makeKey(fontName, charCode, depth, curveSegments);
  cache.set(key, geometry);
}

export function clearGeometryCache(): void {
  cache.forEach((geo) => geo?.dispose());
  cache.clear();
}
