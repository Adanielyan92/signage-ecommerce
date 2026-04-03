import { restaurantTemplates } from "./restaurant";
import { salonTemplates } from "./salon";
import { autoTemplates } from "./auto";
import { retailTemplates } from "./retail";
import { professionalTemplates } from "./professional";
import { churchTemplates } from "./church";
import { genericTemplates } from "./generic";
import type { SignTemplate } from "@/types/templates";

export const allTemplates: SignTemplate[] = [
  ...restaurantTemplates,
  ...salonTemplates,
  ...autoTemplates,
  ...retailTemplates,
  ...professionalTemplates,
  ...churchTemplates,
  ...genericTemplates,
];

export function getTemplateById(id: string): SignTemplate | undefined {
  return allTemplates.find((t) => t.id === id);
}

export function getTemplatesByCategory(category: string): SignTemplate[] {
  return allTemplates.filter((t) => t.category === category);
}
