export interface PricingParams {
  basePricePerInch: number;
  largeSizeThreshold: number;
  largeSizePricePerInch: number;
  minHeightForPrice: number;
  minOrderPrice: number;
}

export interface ProductOption {
  id: string;
  optionKey: string;
  label: string;
  inputType: "select" | "number" | "text" | "checkbox";
  defaultValue?: string;
  possibleValues?: { value: string; label?: string }[];
  dependsOn?: Record<string, string[]>;
  isRequired?: boolean;
  isReadonly?: boolean;
}

export interface Product {
  id: string;
  slug: string;
  name: string;
  description?: string;
  category: ProductCategory;
  imageUrl?: string;
  isActive: boolean;
  pricingParams: PricingParams;
  options: ProductOption[];
}

export type ProductCategory =
  | "CHANNEL_LETTERS"
  | "LIT_SHAPES"
  | "CABINET_SIGNS"
  | "DIMENSIONAL_LETTERS"
  | "LOGOS"
  | "PRINT_SIGNS"
  | "SIGN_POSTS"
  | "ACCESSORIES";

export type ChannelLetterType =
  | "front-lit-trim-cap"
  | "trimless"
  | "marquee-letters"
  | "back-lit"
  | "halo-lit"
  | "non-lit";

export type LitShapeType = "cloud-sign" | "logo-shape";

export type CabinetSignType =
  | "single-face-squared"
  | "double-face-squared"
  | "single-face-shaped"
  | "double-face-shaped";

export type DimensionalLetterType =
  | "acrylic"
  | "painted-metal"
  | "brushed-metal"
  | "flat-cut-aluminum";

export type LogoType = "lit-logo" | "non-lit-logo";

export type PrintSignType = "acm-panel" | "coroplast" | "foam-board";

export type SignPostType = "single-post" | "double-post" | "monument-base";

export type ProductTypeSlug =
  | ChannelLetterType
  | LitShapeType
  | CabinetSignType
  | DimensionalLetterType
  | LogoType
  | PrintSignType
  | SignPostType;

export type LitOption = "Lit" | "Non-Lit";
export type LEDColor = "3000K" | "3500K" | "6000K" | "Red" | "Green" | "Blue" | "RGB";
export type LitSides = "Face Lit" | "Duo Lit";
export type FontStyle =
  | "Standard"
  | "Curved"
  | "Bebas Neue"
  | "Montserrat"
  | "Oswald"
  | "Playfair Display"
  | "Raleway"
  | "Poppins"
  | "Anton"
  | "Permanent Marker"
  | "Righteous"
  | "Abril Fatface"
  | "Passion One"
  | "Russo One"
  | "Black Ops One";
export type PaintingOption = "-" | "Painted" | "Painted Multicolor";
export type RacewayOption = "-" | "Raceway" | "Raceway Box";
export type VinylOption = "-" | "Regular" | "Perforated";
export type DepthOption = '4"' | '5"';

export interface SqftPricingParams {
  basePricePerSqft: number;
  minSqft: number;
  minOrderPrice: number;
}

export interface LogoPricingParams {
  basePricePerSqInch: number;
  minDimension: number;
  minOrderPrice: number;
}

export interface FixedPriceParams {
  basePrice: number;
}

export interface PrintPricingParams {
  basePricePerSqft: number;
  minSqft: number;
  minOrderPrice: number;
}

export interface SignPostPricingParams {
  basePrice: number;
  pricePerSqftSign: number;
  minOrderPrice: number;
}

export type MountingType = "flush" | "standoff" | "stud" | "tape" | "wall" | "pole" | "roof";
