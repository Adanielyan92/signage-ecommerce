// src/types/material-preset.ts

export type ThreeMaterialType =
  | "MeshPhysicalMaterial"
  | "MeshStandardMaterial"
  | "MeshBasicMaterial";

export interface MaterialProperties {
  color?: string;             // hex color "#RRGGBB"
  metalness?: number;         // 0-1
  roughness?: number;         // 0-1
  transmission?: number;      // 0-1 (for MeshPhysicalMaterial, translucent acrylic)
  thickness?: number;         // for transmission
  emissive?: string;          // hex emissive color
  emissiveIntensity?: number; // 0+
  opacity?: number;           // 0-1
  transparent?: boolean;
  normalMapUrl?: string;      // URL to normal map texture
  mapUrl?: string;            // URL to diffuse/albedo texture
  roughnessMapUrl?: string;   // URL to roughness texture
  envMapIntensity?: number;   // 0+
  clearcoat?: number;         // 0-1 (MeshPhysicalMaterial)
  clearcoatRoughness?: number; // 0-1
  side?: "front" | "back" | "double"; // THREE.FrontSide, BackSide, DoubleSide
}

export interface MaterialPresetData {
  id: string;
  tenantId: string | null;
  name: string;
  slug: string;
  description: string | null;
  materialType: ThreeMaterialType;
  properties: MaterialProperties;
  previewImageUrl: string | null;
  isActive: boolean;
}

/** Platform-shipped material preset definitions (seed data) */
export const PLATFORM_MATERIAL_PRESETS: Omit<MaterialPresetData, "id" | "isActive">[] = [
  {
    tenantId: null,
    name: "Brushed Aluminum",
    slug: "brushed-aluminum",
    description: "Metallic brushed aluminum finish for channel letter returns",
    materialType: "MeshPhysicalMaterial",
    properties: {
      color: "#D4D4D8",
      metalness: 0.85,
      roughness: 0.3,
    },
    previewImageUrl: null,
  },
  {
    tenantId: null,
    name: "Painted Metal",
    slug: "painted-metal",
    description: "Configurable painted metal surface",
    materialType: "MeshStandardMaterial",
    properties: {
      color: "#FFFFFF",
      metalness: 0.5,
      roughness: 0.4,
    },
    previewImageUrl: null,
  },
  {
    tenantId: null,
    name: "Translucent Acrylic",
    slug: "translucent-acrylic",
    description: "Translucent acrylic face for front-lit channel letters",
    materialType: "MeshPhysicalMaterial",
    properties: {
      color: "#FFFFFF",
      transmission: 0.8,
      thickness: 0.15,
      roughness: 0.1,
      metalness: 0,
    },
    previewImageUrl: null,
  },
  {
    tenantId: null,
    name: "Opaque Acrylic",
    slug: "opaque-acrylic",
    description: "Solid opaque acrylic with smooth finish",
    materialType: "MeshStandardMaterial",
    properties: {
      color: "#FFFFFF",
      roughness: 0.1,
      metalness: 0,
    },
    previewImageUrl: null,
  },
  {
    tenantId: null,
    name: "Neon Tube",
    slug: "neon-tube",
    description: "Self-illuminating neon tube with bloom-compatible emissive",
    materialType: "MeshBasicMaterial",
    properties: {
      color: "#FF4444",
      emissive: "#FF4444",
      emissiveIntensity: 2.0,
    },
    previewImageUrl: null,
  },
  {
    tenantId: null,
    name: "Vinyl Print",
    slug: "vinyl-print",
    description: "Printable vinyl surface that accepts texture maps",
    materialType: "MeshStandardMaterial",
    properties: {
      color: "#FFFFFF",
      roughness: 0.3,
      metalness: 0,
    },
    previewImageUrl: null,
  },
  {
    tenantId: null,
    name: "Wood",
    slug: "wood",
    description: "Natural wood grain finish",
    materialType: "MeshStandardMaterial",
    properties: {
      color: "#8B6914",
      roughness: 0.7,
      metalness: 0,
    },
    previewImageUrl: null,
  },
  {
    tenantId: null,
    name: "Concrete/Stone",
    slug: "concrete-stone",
    description: "Rough stone or concrete surface",
    materialType: "MeshStandardMaterial",
    properties: {
      color: "#9E9E9E",
      roughness: 0.9,
      metalness: 0,
    },
    previewImageUrl: null,
  },
];
