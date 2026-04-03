import { z } from "zod";

// --- Union type enums ---

const channelLetterTypeSchema = z.enum([
  "front-lit-trim-cap",
  "trimless",
  "marquee-letters",
  "back-lit",
  "halo-lit",
  "non-lit",
]);

const litOptionSchema = z.enum(["Lit", "Non-Lit"]);

const ledColorSchema = z.enum(["3000K", "3500K", "6000K", "RGB"]);

const litSidesSchema = z.enum(["Face Lit", "Duo Lit"]);

const fontStyleSchema = z.enum([
  "Standard",
  "Curved",
  "Bebas Neue",
  "Montserrat",
  "Oswald",
  "Playfair Display",
  "Raleway",
  "Poppins",
  "Anton",
  "Permanent Marker",
  "Righteous",
  "Abril Fatface",
  "Passion One",
  "Russo One",
  "Black Ops One",
]);

const paintingOptionSchema = z.enum(["-", "Painted", "Painted Multicolor"]);

const racewayOptionSchema = z.enum(["-", "Raceway", "Raceway Box"]);

const vinylOptionSchema = z.enum(["-", "Regular", "Perforated"]);

// --- Sign Configuration ---

export const signConfigurationSchema = z.object({
  productType: channelLetterTypeSchema,
  text: z.string().min(1, "Text is required"),
  height: z.number().min(1).max(120),
  depth: z.number().optional(),
  lit: litOptionSchema,
  ledColor: ledColorSchema.optional(),
  litSides: litSidesSchema.optional(),
  fontStyle: fontStyleSchema,
  painting: paintingOptionSchema,
  paintColorCount: z.number().int().min(1).optional(),
  raceway: racewayOptionSchema,
  vinyl: vinylOptionSchema,
  hasBackground: z.boolean().optional(),
  backgroundColor: z.string().optional(),
  faceColor: z.string().optional(),
  returnsColor: z.string().optional(),
});

// --- Dimensions ---

export const dimensionsSchema = z.object({
  width: z.number().min(0),
  height: z.number().min(0),
  depth: z.number().min(0).optional(),
  sqft: z.number().min(0).optional(),
  letterCount: z.number().int().min(0).optional(),
});

// --- Pricing Request ---

export const pricingRequestSchema = z.object({
  config: signConfigurationSchema,
  dimensions: dimensionsSchema,
  clientPrice: z.number().optional(),
});

// --- Auth ---

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// --- Saved Design ---

export const savedDesignSchema = z.object({
  name: z.string().min(1, "Design name is required").max(100),
  configuration: signConfigurationSchema,
  dimensions: dimensionsSchema.optional(),
  thumbnail: z.string().optional(),
});

// --- Type exports ---

export type SignConfigurationInput = z.infer<typeof signConfigurationSchema>;
export type DimensionsInput = z.infer<typeof dimensionsSchema>;
export type PricingRequestInput = z.infer<typeof pricingRequestSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type SavedDesignInput = z.infer<typeof savedDesignSchema>;
