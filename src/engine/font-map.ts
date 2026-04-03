/**
 * Shared font file mapping. Used by both:
 * - Server: letter-measurement.ts (file path loading)
 * - Client: font-loader.ts (HTTP URL loading)
 *
 * Must be isomorphic -- no DOM, no Node deps.
 */
export const FONT_FILE_MAP: Record<string, string> = {
  Standard: "Roboto-Regular.ttf",
  Curved: "Lobster-Regular.ttf",
  "Bebas Neue": "BebasNeue-Regular.ttf",
  Montserrat: "Montserrat-Regular.ttf",
  Oswald: "Oswald-Regular.ttf",
  "Playfair Display": "PlayfairDisplay-Regular.ttf",
  Raleway: "Raleway-Regular.ttf",
  Poppins: "Poppins-Regular.ttf",
  Anton: "Anton-Regular.ttf",
  "Permanent Marker": "PermanentMarker-Regular.ttf",
  Righteous: "Righteous-Regular.ttf",
  "Abril Fatface": "AbrilFatface-Regular.ttf",
  "Passion One": "PassionOne-Regular.ttf",
  "Russo One": "RussoOne-Regular.ttf",
  "Black Ops One": "BlackOpsOne-Regular.ttf",
};

/** Fonts that incur the curved/decorative fabrication multiplier (1.2x) */
export const CURVED_FONTS: Set<string> = new Set([
  "Curved",
  "Permanent Marker",
  "Righteous",
  "Abril Fatface",
  "Passion One",
]);

/** CSS font-family name for font preview in the UI */
export const FONT_CSS_MAP: Record<string, string> = {
  Standard: "'Sign-Roboto', sans-serif",
  Curved: "'Sign-Lobster', cursive",
  "Bebas Neue": "'Sign-BebasNeue', sans-serif",
  Montserrat: "'Sign-Montserrat', sans-serif",
  Oswald: "'Sign-Oswald', sans-serif",
  "Playfair Display": "'Sign-PlayfairDisplay', serif",
  Raleway: "'Sign-Raleway', sans-serif",
  Poppins: "'Sign-Poppins', sans-serif",
  Anton: "'Sign-Anton', sans-serif",
  "Permanent Marker": "'Sign-PermanentMarker', cursive",
  Righteous: "'Sign-Righteous', cursive",
  "Abril Fatface": "'Sign-AbrilFatface', serif",
  "Passion One": "'Sign-PassionOne', sans-serif",
  "Russo One": "'Sign-RussoOne', sans-serif",
  "Black Ops One": "'Sign-BlackOpsOne', sans-serif",
};
