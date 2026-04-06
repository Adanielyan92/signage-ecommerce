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
