export type WallTexture =
  | "red-brick"
  | "white-brick"
  | "brown-brick"
  | "cream-stucco"
  | "gray-stucco"
  | "white-stucco"
  | "glass-storefront"
  | "concrete"
  | "wood-siding"
  | "stone";

export interface InstallationRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RealWorldDimensions {
  widthFt: number;
  heightFt: number;
}
