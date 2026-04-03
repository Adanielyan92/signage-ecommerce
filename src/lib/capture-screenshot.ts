/**
 * Capture a screenshot of the Three.js canvas element.
 * Returns a WebP data URL string, or null if no canvas is found.
 *
 * Note: The Three.js renderer must have `preserveDrawingBuffer: true`
 * set on the WebGLRenderer for this to work reliably.
 */
export function captureCanvasScreenshot(): string | null {
  if (typeof document === "undefined") {
    return null;
  }

  const canvas = document.querySelector("canvas");

  if (!canvas) {
    console.warn("No canvas element found for screenshot capture");
    return null;
  }

  try {
    const dataUrl = canvas.toDataURL("image/webp", 0.8);
    return dataUrl;
  } catch (error) {
    // This can happen if the canvas is tainted (e.g., cross-origin textures)
    console.error("Failed to capture canvas screenshot:", error);

    // Fall back to PNG if WebP fails
    try {
      const dataUrl = canvas.toDataURL("image/png");
      return dataUrl;
    } catch (fallbackError) {
      console.error("Fallback PNG capture also failed:", fallbackError);
      return null;
    }
  }
}
