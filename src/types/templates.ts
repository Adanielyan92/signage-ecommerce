import type { SignConfiguration } from "./configurator";

export type TemplateCategory =
  | "restaurant"
  | "salon"
  | "auto"
  | "retail"
  | "professional"
  | "church"
  | "generic";

export interface SignTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  configuration: SignConfiguration;
}

export const TEMPLATE_CATEGORIES: {
  value: TemplateCategory;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: "restaurant",
    label: "Restaurant & Bar",
    description: "Restaurants, cafes, bars, and food service",
    icon: "🍕",
  },
  {
    value: "salon",
    label: "Salon & Spa",
    description: "Hair salons, nail salons, and spas",
    icon: "💅",
  },
  {
    value: "auto",
    label: "Auto & Service",
    description: "Auto shops, dealerships, and car washes",
    icon: "🚗",
  },
  {
    value: "retail",
    label: "Retail & Shopping",
    description: "Retail stores, boutiques, and shops",
    icon: "🛍️",
  },
  {
    value: "professional",
    label: "Professional & Office",
    description: "Law firms, medical offices, and consulting",
    icon: "💼",
  },
  {
    value: "church",
    label: "Church & Non-Profit",
    description: "Churches, temples, and community centers",
    icon: "⛪",
  },
  {
    value: "generic",
    label: "General Business",
    description: "Universal business signage templates",
    icon: "🏢",
  },
];
