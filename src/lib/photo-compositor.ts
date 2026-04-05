// src/lib/photo-compositor.ts
/**
 * Composite a sign rendering onto a customer's building photo.
 * Pure Canvas 2D API -- no DOM dependencies beyond the canvas element.
 */

export interface CompositeOptions {
  /** The customer's building photo (loaded Image element) */
  backgroundImage: HTMLImageElement;
  /** The sign render from the 3D scene (loaded Image element or canvas snapshot) */
  signImage: HTMLImageElement | HTMLCanvasElement;
  /** X position of sign center on the background, as fraction 0-1 */
  signX: number;
  /** Y position of sign center on the background, as fraction 0-1 */
  signY: number;
  /** Scale of the sign relative to background width. 0.3 = 30% of photo width */
  signScale: number;
  /** Output canvas width in pixels */
  outputWidth: number;
  /** Output canvas height in pixels */
  outputHeight: number;
}

export interface CompositeResult {
  canvas: HTMLCanvasElement;
  dataUrl: string;
  blob: Blob;
}

/**
 * Composite the sign onto the building photo and return the result.
 */
export async function compositeSignOnPhoto(
  options: CompositeOptions
): Promise<CompositeResult> {
  const { backgroundImage, signImage, signX, signY, signScale, outputWidth, outputHeight } =
    options;

  const canvas = document.createElement("canvas");
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext("2d")!;

  // Draw background photo, scaled to fill canvas
  ctx.drawImage(backgroundImage, 0, 0, outputWidth, outputHeight);

  // Calculate sign dimensions
  const signWidth = outputWidth * signScale;
  const signSourceWidth =
    signImage instanceof HTMLCanvasElement ? signImage.width : signImage.naturalWidth;
  const signSourceHeight =
    signImage instanceof HTMLCanvasElement ? signImage.height : signImage.naturalHeight;
  const signAspect = signSourceWidth / signSourceHeight;
  const signHeight = signWidth / signAspect;

  // Position sign (signX/signY are center point as fractions)
  const drawX = signX * outputWidth - signWidth / 2;
  const drawY = signY * outputHeight - signHeight / 2;

  // Add subtle drop shadow for realism
  ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
  ctx.shadowBlur = 20;
  ctx.shadowOffsetX = 5;
  ctx.shadowOffsetY = 8;

  // Draw sign
  ctx.drawImage(signImage, drawX, drawY, signWidth, signHeight);

  // Reset shadow
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // Get blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Failed to create blob"))),
      "image/png"
    );
  });

  return {
    canvas,
    dataUrl: canvas.toDataURL("image/png"),
    blob,
  };
}

/**
 * Load an image from a File (user upload) into an HTMLImageElement.
 */
export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };
    img.src = url;
  });
}

/**
 * Capture the current 3D scene as an HTMLImageElement.
 * Pass the Three.js renderer's DOM element (canvas).
 */
export function captureSceneAsImage(threeCanvas: HTMLCanvasElement): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const dataUrl = threeCanvas.toDataURL("image/png");
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to capture scene"));
    img.src = dataUrl;
  });
}
