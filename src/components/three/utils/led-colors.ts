/**
 * Shared LED color map used across all renderers.
 * Maps LED temperature/color names to hex values for emissive materials.
 */
export const LED_COLORS: Record<string, string> = {
  "3000K": "#FFB46B",
  "3500K": "#FFC98E",
  "6000K": "#E3EEFF",
  "Red": "#FF0000",
  "Green": "#00FF00",
  "Blue": "#0066FF",
  RGB: "#FF0000",
};

export function getLedColor(led: string): string {
  return LED_COLORS[led] || "#FFFFFF";
}
