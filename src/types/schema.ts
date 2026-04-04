import type { FormulaDefinition } from "@/engine/formula-types";

export interface SchemaOptionDef {
  id: string;
  type: "text" | "number" | "select" | "color" | "multi-select" | "image-upload" | "toggle" | "range" | "font-picker" | "preset-gallery";
  label: string;
  required?: boolean;
  defaultValue?: string | number | boolean;
  values?: { value: string; label?: string }[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  dependsOn?: Record<string, string[]>;
}

export interface SchemaRule {
  type: "visibility" | "constraint" | "validation" | "pricing_trigger" | "3d_binding";
  when: {
    option: string;
    equals?: string;
    notEquals?: string;
    greaterThan?: number;
    lessThan?: number;
  };
  then: Record<string, unknown>;
}

export type RenderPipeline = "text-to-3d" | "part-assembly" | "flat-2d";

export interface MeshBinding {
  meshName: string;
  materialPreset?: string;
  colorOption?: string;
  materialOption?: string;
  visibleWhen?: Record<string, string[] | boolean>;
  emissiveOption?: string;
}

export interface RenderConfig {
  pipeline: RenderPipeline;
  meshBindings: Record<string, MeshBinding>;
  assemblyBindings?: Record<string, {
    visibleWhen?: Record<string, string[] | boolean>;
    typeOption?: string;
  }>;
}

export interface ProductSchema {
  name: string;
  slug: string;
  description: string;
  category: string;
  options: SchemaOptionDef[];
  rules: SchemaRule[];
  renderConfig: RenderConfig;
  pricingFormulaId: string;
  pricingParams: Record<string, number>;
}
