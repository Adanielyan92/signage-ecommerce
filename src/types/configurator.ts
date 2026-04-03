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
  thickness: "0.5" | "1" | "1.5" | "2";
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

// --- Union of all configuration types ---

export type AnySignConfiguration =
  | SignConfiguration
  | LitShapeConfiguration
  | CabinetConfiguration
  | DimensionalLetterConfiguration
  | LogoConfiguration
  | PrintConfiguration
  | SignPostConfiguration;

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
