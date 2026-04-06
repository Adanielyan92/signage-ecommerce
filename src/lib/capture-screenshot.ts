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
