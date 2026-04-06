export interface OptionPricingRule {
  id: string;
  optionId: string;       // Which option (e.g., "lit", "led", "painting")
  optionValue: string;    // Which value triggers this rule (e.g., "Non-Lit", "RGB", "Painted")
  effectType: "multiplier" | "fixed_add" | "per_unit_add" | "per_sqft_add";
  effectValue: number;    // e.g., 0.75 for multiplier, 300 for fixed add
  label: string;          // Human readable: "Non-Lit Discount", "RGB LED Premium"
}

export interface PricingParams {
  basePricePerInch: number;
  largeSizeThreshold: number;
  largeSizePricePerInch: number;
  minHeightForPrice: number;
  minOrderPrice: number;
  rules?: OptionPricingRule[];
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
  | "ACCESSORIES"
  | "LIGHT_BOX_SIGNS"
  | "BLADE_SIGNS"
  | "NEON_SIGNS"
  | "VINYL_BANNERS"
  | "A_FRAME_SIGNS"
  | "YARD_SIGNS"
  | "PLAQUES"
  | "VINYL_GRAPHICS"
  | "WAYFINDING_SIGNS"
  | "PUSH_THROUGH_SIGNS";

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

export type PrintSignType = "acm-panel" | "coroplast" | "foam-board" | "pvc" | "dibond";

export type SignPostType = "single-post" | "double-post" | "monument-base";

export type LightBoxType = "light-box-single" | "light-box-double" | "light-box-push-through";
export type BladeSignType = "blade-rectangular" | "blade-round";
export type NeonSignType = "led-neon";
export type VinylBannerType = "vinyl-banner-13oz" | "vinyl-banner-15oz" | "mesh-banner";

export type AFrameType = "a-frame-standard" | "a-frame-metal" | "a-frame-plastic";
export type YardSignType = "yard-sign-coroplast" | "yard-sign-aluminum";
export type PlaqueType = "plaque-aluminum" | "plaque-acrylic" | "plaque-wood" | "plaque-brass";
export type VinylGraphicType = "vinyl-wall-graphic" | "vinyl-window-graphic" | "vinyl-floor-graphic" | "vinyl-vehicle-wrap";
export type WayfindingType = "wayfinding-ada" | "wayfinding-directional" | "wayfinding-room-id";
export type PushThroughType = "push-through-single" | "push-through-double";

export type ProductTypeSlug =
  | ChannelLetterType
  | LitShapeType
  | CabinetSignType
  | DimensionalLetterType
  | LogoType
  | PrintSignType
  | SignPostType
  | LightBoxType
  | BladeSignType
  | NeonSignType
  | VinylBannerType
  | AFrameType
  | YardSignType
  | PlaqueType
  | VinylGraphicType
  | WayfindingType
  | PushThroughType;

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
export type DepthOption = '3"' | '4"' | '5"';

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

export interface BladePricingParams {
  basePricePerSqft: number;
  litPricePerSqft: number;
  minSqft: number;
  minOrderPrice: number;
}

export interface NeonPricingParams {
  pricePerInch: number;
  minHeightForPrice: number;
  minOrderPrice: number;
  backerClearPerSqft: number;
  backerBlackPerSqft: number;
}

export interface BannerPricingParams {
  tiers: { maxSqft: number; pricePerSqft: number }[];
  minOrderPrice: number;
}

export type MountingType = "flush" | "standoff" | "stud" | "tape" | "wall" | "pole" | "roof";

export interface AFramePricingParams {
  basePricePerSqft: number;
  minOrderPrice: number;
}

export interface YardSignPricingParams {
  basePricePerSqft: number;
  minOrderPrice: number;
}

export interface PlaquePricingParams {
  basePricePerSqInch: number;
  minOrderPrice: number;
}

export interface VinylGraphicPricingParams {
  basePricePerSqft: number;
  minOrderPrice: number;
}

export interface WayfindingPricingParams {
  basePrice: number;
  pricePerCharacter: number;
  minOrderPrice: number;
}

export interface PushThroughPricingParams {
  cabinetPricePerSqft: number;
  letterPricePerInch: number;
  minOrderPrice: number;
}
