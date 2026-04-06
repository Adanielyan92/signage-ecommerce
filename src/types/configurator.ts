import type {
  ChannelLetterType,
  LEDColor,
  LitOption,
  LitSides,
  FontStyle,
  PaintingOption,
  RacewayOption,
  VinylOption,
  LitShapeType,
  CabinetSignType,
  DimensionalLetterType,
  LogoType,
  PrintSignType,
  SignPostType,
  LightBoxType,
  BladeSignType,
  NeonSignType,
  VinylBannerType,
  AFrameType,
  YardSignType,
  PlaqueType,
  VinylGraphicType,
  WayfindingType,
  PushThroughType,
  ProductCategory,
  ProductTypeSlug,
} from "./product";

export interface SignConfiguration {
  productType: ChannelLetterType;
  text: string;
  height: number;
  font: FontStyle;
  lit: LitOption;
  led: LEDColor;
  litSides: LitSides;
  sideDepth: string;
  painting: PaintingOption;
  paintingColors: number;
  raceway: RacewayOption;
  vinyl: VinylOption;
  background: string;
}

export interface Dimensions {
  totalWidthInches: number;
  heightInches: number;
  squareFeet: number;
  linearFeet: number;
  letterWidths: number[];
}

export interface PriceBreakdown {
  letterPrice: number;
  multipliers: MultiplierDetail[];
  priceAfterMultipliers: number;
  paintingExtra: number;
  racewayPrice: number;
  vinylPrice: number;
  subtotal: number;
  total: number;
  minOrderApplied: boolean;
}

export interface MultiplierDetail {
  name: string;
  value: number;
  reason: string;
}

export interface CartItemConfig {
  productType: ChannelLetterType;
  productName: string;
  configuration: SignConfiguration;
  dimensions: Dimensions;
  thumbnailUrl?: string;
  quantity: number;
  unitPrice: number;
}

// --- New per-category configuration interfaces ---

export interface LitShapeConfiguration {
  productCategory: "LIT_SHAPES";
  productType: LitShapeType;
  widthInches: number;
  heightInches: number;
  led: LEDColor;
  painting: PaintingOption;
  paintingColors: number;
  mounting: "flush" | "standoff";
  svgPath?: string;
}

export interface CabinetConfiguration {
  productCategory: "CABINET_SIGNS";
  productType: CabinetSignType;
  widthInches: number;
  heightInches: number;
  led: LEDColor;
  printedFace: boolean;
  mounting: "wall" | "pole" | "roof";
}

export interface DimensionalLetterConfiguration {
  productCategory: "DIMENSIONAL_LETTERS";
  productType: DimensionalLetterType;
  text: string;
  height: number;
  font: FontStyle;
  thickness: "0.25" | "0.5" | "0.75" | "1";
  painting: PaintingOption;
  paintingColors: number;
  mounting: "stud" | "tape" | "standoff";
}

export interface LogoConfiguration {
  productCategory: "LOGOS";
  productType: LogoType;
  widthInches: number;
  heightInches: number;
  led?: LEDColor;
  painting: PaintingOption;
  paintingColors: number;
  depth: string;
  svgPath?: string;
}

export interface PrintConfiguration {
  productCategory: "PRINT_SIGNS";
  productType: PrintSignType;
  widthInches: number;
  heightInches: number;
  grommets: "-" | "4 Corners" | "Each ft";
  laminated: boolean;
}

export interface SignPostConfiguration {
  productCategory: "SIGN_POSTS";
  productType: SignPostType;
  postHeight: number;
  signWidthInches: number;
  signHeightInches: number;
  doubleSided: boolean;
}

export interface LightBoxConfiguration {
  productCategory: "LIGHT_BOX_SIGNS";
  productType: LightBoxType;
  widthInches: number;
  heightInches: number;
  depth: "4" | "5" | "6";
  led: LEDColor;
  faceType: "translucent" | "push-through";
  shape: "rectangular" | "round";
  mounting: "wall" | "hanging";
}

export interface BladeSignConfiguration {
  productCategory: "BLADE_SIGNS";
  productType: BladeSignType;
  widthInches: number;
  heightInches: number;
  depth: "2" | "3" | "4";
  illuminated: boolean;
  led: LEDColor;
  doubleSided: boolean;
  shape: "rectangular" | "round";
}

export interface NeonSignConfiguration {
  productCategory: "NEON_SIGNS";
  productType: NeonSignType;
  text: string;
  height: number;
  font: FontStyle;
  neonColor: "warm-white" | "cool-white" | "pink" | "red" | "blue" | "green" | "rgb";
  backer: "clear-acrylic" | "black-acrylic" | "none";
  backerShape: "rectangular" | "contour";
}

export interface VinylBannerConfiguration {
  productCategory: "VINYL_BANNERS";
  productType: VinylBannerType;
  widthInches: number;
  heightInches: number;
  material: "13oz" | "15oz" | "mesh";
  finishing: "hem-grommets" | "pole-pockets" | "wind-slits";
  doubleSided: boolean;
}

export interface AFrameConfiguration {
  productCategory: "A_FRAME_SIGNS";
  productType: AFrameType;
  widthInches: number;
  heightInches: number;
  material: "corrugated-plastic" | "aluminum" | "steel";
  doubleSided: boolean;
  insertType: "printed-panel" | "chalkboard" | "dry-erase";
  baseWeight: "none" | "water-fill" | "sandbag";
}

export interface YardSignConfiguration {
  productCategory: "YARD_SIGNS";
  productType: YardSignType;
  widthInches: number;
  heightInches: number;
  material: "coroplast" | "aluminum";
  doubleSided: boolean;
  stakeType: "h-stake" | "spider-stake" | "none";
  quantity: number;
}

export interface PlaqueConfiguration {
  productCategory: "PLAQUES";
  productType: PlaqueType;
  widthInches: number;
  heightInches: number;
  material: "aluminum" | "acrylic" | "wood" | "brass";
  thickness: "1/8" | "1/4" | "3/8";
  mounting: "standoffs" | "flat" | "easel";
  finish: "brushed" | "polished" | "matte" | "painted";
  textEngraving: boolean;
}

export interface VinylGraphicConfiguration {
  productCategory: "VINYL_GRAPHICS";
  productType: VinylGraphicType;
  widthInches: number;
  heightInches: number;
  vinylType: "calendered" | "cast" | "reflective" | "perforated-window";
  lamination: "none" | "matte" | "gloss";
  applicationSurface: "wall" | "window" | "floor" | "vehicle";
  contourCut: boolean;
}

export interface WayfindingConfiguration {
  productCategory: "WAYFINDING_SIGNS";
  productType: WayfindingType;
  widthInches: number;
  heightInches: number;
  material: "acrylic" | "photopolymer" | "pvc";
  adaCompliant: boolean;
  text: string;
  pictogram: "arrow" | "restroom" | "exit" | "custom" | "none";
  mounting: "wall" | "projecting" | "ceiling-hung";
}

export interface PushThroughConfiguration {
  productCategory: "PUSH_THROUGH_SIGNS";
  productType: PushThroughType;
  widthInches: number;
  heightInches: number;
  depth: "3" | "4" | "5" | "6";
  faceMaterial: "acrylic-quarter" | "polycarbonate";
  text: string;
  font: FontStyle;
  letterHeight: number;
  led: LEDColor;
  frameFinish: "painted" | "brushed" | "raw";
}

// --- Union of all configuration types ---

export type AnySignConfiguration =
  | SignConfiguration
  | LitShapeConfiguration
  | CabinetConfiguration
  | DimensionalLetterConfiguration
  | LogoConfiguration
  | PrintConfiguration
  | SignPostConfiguration
  | LightBoxConfiguration
  | BladeSignConfiguration
  | NeonSignConfiguration
  | VinylBannerConfiguration
  | AFrameConfiguration
  | YardSignConfiguration
  | PlaqueConfiguration
  | VinylGraphicConfiguration
  | WayfindingConfiguration
  | PushThroughConfiguration;

// --- Unified cart item type ---

export interface UnifiedCartItem {
  productCategory: ProductCategory;
  productType: ProductTypeSlug;
  productName: string;
  configuration: AnySignConfiguration;
  dimensions: Dimensions;
  thumbnailUrl?: string;
  quantity: number;
  unitPrice: number;
}

// --- Scene mode ---

export type SceneMode = "day" | "night";
