// src/types/stock-part.ts

export type StockPartCategory =
  | "MOUNTING"
  | "POSTS"
  | "CABINETS"
  | "LIGHTING"
  | "ACCESSORIES"
  | "BACKGROUNDS";

export interface StockPartData {
  id: string;
  tenantId: string | null;
  name: string;
  slug: string;
  category: StockPartCategory;
  description: string | null;
  previewImageUrl: string | null;
  glbUrl: string | null;
  metadata: StockPartMetadata | null;
  isActive: boolean;
}

export interface StockPartMetadata {
  widthInches?: number;
  heightInches?: number;
  depthInches?: number;
  polyCount?: number;
  configurableRegions?: ConfigurableRegion[];
  tags?: string[];
}

export interface ConfigurableRegion {
  meshName: string;
  role: "face" | "side" | "back" | "mount" | "frame" | "panel";
  configurableProps: ("material" | "color" | "visibility" | "texture")[];
}

export const STOCK_PART_CATEGORIES: {
  value: StockPartCategory;
  label: string;
  description: string;
}[] = [
  { value: "MOUNTING", label: "Mounting", description: "Raceways, standoffs, stud mounts" },
  { value: "POSTS", label: "Posts", description: "Single/double poles, monument bases, pylon frames" },
  { value: "CABINETS", label: "Cabinets", description: "Single/double face boxes, shaped shells" },
  { value: "LIGHTING", label: "Lighting", description: "LED modules, neon tubes, bulb arrays" },
  { value: "ACCESSORIES", label: "Accessories", description: "Chains, brackets, transformers" },
  { value: "BACKGROUNDS", label: "Backgrounds", description: "Flat panels, shaped backers, preview walls" },
];
