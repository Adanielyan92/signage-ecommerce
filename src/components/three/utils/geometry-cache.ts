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
