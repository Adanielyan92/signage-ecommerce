// src/lib/ar-export.ts
/**
 * Export the current Three.js scene to GLB (Android) or USDZ (iOS) for AR preview.
 *
 * Uses Three.js GLTFExporter and USDZExporter.
 * These are imported dynamically to avoid adding to the main bundle.
 */

import type { Scene, Object3D } from "three";

export type ArFormat = "glb" | "usdz";

export function detectArSupport(): {
  webxr: boolean;
  arQuickLook: boolean;
  preferredFormat: ArFormat | null;
} {
  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

  const arQuickLook = isIOS; // iOS Safari supports AR Quick Look via <a rel="ar">
  const webxr = "xr" in navigator;

  return {
    webxr,
    arQuickLook,
    preferredFormat: arQuickLook ? "usdz" : webxr ? "glb" : null,
  };
}

/**
 * Export a Three.js Object3D (typically the sign group) to a GLB blob.
 */
export async function exportToGlb(object: Object3D): Promise<Blob> {
  const { GLTFExporter } = await import("three/examples/jsm/exporters/GLTFExporter.js");

  const exporter = new GLTFExporter();

  return new Promise<Blob>((resolve, reject) => {
    exporter.parse(
      object,
      (result) => {
        if (result instanceof ArrayBuffer) {
          resolve(new Blob([result], { type: "model/gltf-binary" }));
        } else {
          // JSON result -- convert to JSON blob
          const json = JSON.stringify(result);
          resolve(new Blob([json], { type: "model/gltf+json" }));
        }
      },
      (error) => reject(error),
      { binary: true },
    );
  });
}

/**
 * Export a Three.js Object3D to USDZ (for iOS AR Quick Look).
 */
export async function exportToUsdz(object: Object3D): Promise<Blob> {
  const { USDZExporter } = await import("three/examples/jsm/exporters/USDZExporter.js");

  const exporter = new USDZExporter();
  const arrayBuffer = await exporter.parse(object as unknown as Scene);
  return new Blob([arrayBuffer], { type: "model/vnd.usdz+zip" });
}

/**
 * Trigger AR Quick Look on iOS by creating a temporary <a rel="ar"> link.
 */
export function openArQuickLook(usdzBlob: Blob): void {
  const url = URL.createObjectURL(usdzBlob);
  const anchor = document.createElement("a");
  anchor.setAttribute("rel", "ar");
  anchor.setAttribute("href", url);
  // AR Quick Look requires a child <img> element
  const img = document.createElement("img");
  img.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  anchor.appendChild(img);
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Clean up blob URL after a delay
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Start a WebXR AR session (Android Chrome).
 * Uses the Scene Viewer intent approach.
 */
export async function startWebXrArSession(glbBlob: Blob): Promise<boolean> {
  const url = URL.createObjectURL(glbBlob);

  // Android Chrome supports intent-based AR via scene-viewer
  const intentUrl =
    `intent://arvr.google.com/scene-viewer/1.0?file=${encodeURIComponent(url)}&mode=ar_preferred#Intent;scheme=https;package=com.google.android.googlequicksearchbox;action=android.intent.action.VIEW;end;`;

  const anchor = document.createElement("a");
  anchor.href = intentUrl;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}
