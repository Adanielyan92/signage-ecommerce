# Phase 1: Core Platform Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the existing monolithic signage ecommerce app into a multi-tenant, schema-driven platform where products, options, and pricing formulas are defined via JSON schemas (not hardcoded), laying the foundation for B2B SaaS.

**Architecture:** Add a `Tenant` model to Prisma, scope all data by `tenantId`. Replace hardcoded product definitions with a JSON product schema system stored in the database. Build a preset formula pricing engine that evaluates JSON AST formulas. The existing D2C site becomes the "default tenant" consuming the same API.

**Tech Stack:** Next.js 16, Prisma 7 + PostgreSQL, Zustand, React Three Fiber, Zod, Jest, Stripe

**Reference:** Full spec at `docs/superpowers/specs/2026-04-04-signage-platform-design.md`

---

## File Structure

### New files to create

```
src/
├── lib/
│   └── tenant.ts                          # Tenant resolution (from header/domain/slug)
├── engine/
│   ├── schema-pricing.ts                  # Schema-driven pricing engine (evaluates AST formulas)
│   ├── formula-presets.ts                 # 12 preset formula AST definitions
│   ├── formula-types.ts                   # TypeScript types for formula AST nodes
│   └── __tests__/
│       ├── schema-pricing.test.ts         # Tests for AST formula evaluation
│       └── formula-presets.test.ts        # Tests for each preset formula template
├── types/
│   └── schema.ts                          # ProductSchema, OptionDef, RenderConfig, FormulaAST types
├── app/
│   └── api/
│       ├── v1/
│       │   ├── tenants/
│       │   │   └── route.ts               # Tenant CRUD
│       │   ├── products/
│       │   │   ├── route.ts               # Product list/create (tenant-scoped)
│       │   │   └── [productId]/
│       │   │       └── route.ts           # Product get/update/delete
│       │   ├── pricing/
│       │   │   └── calculate/
│       │   │       └── route.ts           # Schema-driven pricing calculation
│       │   ├── cart/
│       │   │   └── route.ts               # Cart operations (tenant-scoped)
│       │   └── checkout/
│       │       └── route.ts               # Stripe checkout session
│       └── webhooks/
│           └── stripe/
│               └── route.ts               # Stripe webhook handler
└── seed/
    └── default-tenant.ts                  # Seed script: creates default tenant + migrated products
```

### Files to modify

```
prisma/schema.prisma                       # Add Tenant, PricingFormula, RenderConfig models; add tenantId to all tables
src/types/product.ts                       # Add ProductSchema, FormulaType types
src/types/configurator.ts                  # Update PriceBreakdown to generic format
src/lib/prisma.ts                          # Add tenant-scoping middleware
src/stores/configurator-store.ts           # Consume product schema from API instead of hardcoded defs
src/app/api/pricing/calculate/route.ts     # Update to use schema-driven pricing
```

---

## Task 1: Formula AST Types

**Files:**
- Create: `src/engine/formula-types.ts`
- Create: `src/types/schema.ts`

These types define the JSON AST that represents pricing formulas and product schemas. Every other task depends on these.

- [ ] **Step 1: Create formula AST types**

```typescript
// src/engine/formula-types.ts

/** A node in the pricing formula AST */
export type FormulaNode =
  | VariableNode
  | LiteralNode
  | BinaryOpNode
  | UnaryFnNode
  | ConditionalNode
  | MultiplierChainNode;

export interface VariableNode {
  type: "variable";
  /** References a pricing variable: "height", "width", "letterCount", "sqft", etc. */
  name: string;
}

export interface LiteralNode {
  type: "literal";
  value: number;
}

export interface BinaryOpNode {
  type: "binaryOp";
  op: "+" | "-" | "*" | "/" | "min" | "max";
  left: FormulaNode;
  right: FormulaNode;
}

export interface UnaryFnNode {
  type: "unaryFn";
  fn: "round" | "ceil" | "floor" | "abs";
  arg: FormulaNode;
}

export interface ConditionalNode {
  type: "conditional";
  condition: ConditionExpr;
  then: FormulaNode;
  else: FormulaNode;
}

export interface MultiplierChainNode {
  type: "multiplierChain";
  base: FormulaNode;
  multipliers: ConditionalMultiplier[];
}

export interface ConditionalMultiplier {
  name: string;
  reason: string;
  factor: number;
  condition: ConditionExpr;
}

export type ConditionExpr =
  | CompareCondition
  | AndCondition
  | OrCondition;

export interface CompareCondition {
  type: "compare";
  left: FormulaNode;
  op: "==" | "!=" | ">" | "<" | ">=" | "<=";
  right: FormulaNode;
}

export interface AndCondition {
  type: "and";
  conditions: ConditionExpr[];
}

export interface OrCondition {
  type: "or";
  conditions: ConditionExpr[];
}

/** Complete pricing formula definition */
export interface FormulaDefinition {
  id: string;
  name: string;
  description: string;
  /** Variables this formula expects (for admin UI validation) */
  variables: FormulaVariable[];
  /** The main price calculation */
  formula: FormulaNode;
  /** Additional line items added to the subtotal */
  addOns: FormulaAddOn[];
  /** Minimum order price enforcement */
  minOrderPrice: FormulaNode | null;
}

export interface FormulaVariable {
  name: string;
  label: string;
  source: "option" | "dimension" | "computed" | "param";
  description: string;
}

export interface FormulaAddOn {
  name: string;
  label: string;
  formula: FormulaNode;
  /** Only include this add-on when condition is met */
  condition: ConditionExpr | null;
}
```

- [ ] **Step 2: Create product schema types**

```typescript
// src/types/schema.ts

import type { FormulaDefinition } from "@/engine/formula-types";

/** Option definition in a product schema */
export interface SchemaOptionDef {
  id: string;
  type: "text" | "number" | "select" | "color" | "multi-select" | "image-upload" | "toggle" | "range" | "font-picker" | "preset-gallery";
  label: string;
  required?: boolean;
  defaultValue?: string | number | boolean;
  /** For select/multi-select */
  values?: { value: string; label?: string }[];
  /** For number/range */
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  /** Conditional visibility/constraints */
  dependsOn?: Record<string, string[]>;
}

/** Rule that governs option interactions */
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

/** Render pipeline configuration */
export type RenderPipeline = "text-to-3d" | "part-assembly" | "flat-2d";

/** Mesh binding for 3D rendering */
export interface MeshBinding {
  meshName: string;
  materialPreset?: string;
  colorOption?: string;
  materialOption?: string;
  visibleWhen?: Record<string, string[] | boolean>;
  emissiveOption?: string;
}

/** Complete render configuration */
export interface RenderConfig {
  pipeline: RenderPipeline;
  meshBindings: Record<string, MeshBinding>;
  assemblyBindings?: Record<string, {
    visibleWhen?: Record<string, string[] | boolean>;
    typeOption?: string;
  }>;
}

/** Full product schema — the JSON blob stored in the DB */
export interface ProductSchema {
  name: string;
  slug: string;
  description: string;
  category: string;
  options: SchemaOptionDef[];
  rules: SchemaRule[];
  renderConfig: RenderConfig;
  /** ID of the pricing formula to use */
  pricingFormulaId: string;
  /** Parameter values to feed into the formula (base prices, thresholds, etc.) */
  pricingParams: Record<string, number>;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/engine/formula-types.ts src/types/schema.ts
git commit -m "feat: add formula AST and product schema type definitions"
```

---

## Task 2: Formula AST Evaluator

**Files:**
- Create: `src/engine/schema-pricing.ts`
- Create: `src/engine/__tests__/schema-pricing.test.ts`

The evaluator takes a FormulaDefinition + a variables map and returns a PriceBreakdown.

- [ ] **Step 1: Write failing tests for the AST evaluator**

```typescript
// src/engine/__tests__/schema-pricing.test.ts

import { evaluateFormula, evaluateFormulaDefinition } from "../schema-pricing";
import type { FormulaNode, FormulaDefinition, ConditionExpr } from "../formula-types";

describe("evaluateFormula", () => {
  const vars = {
    height: 12,
    letterCount: 5,
    pricePerInch: 16,
    largePricePerInch: 18,
    largeSizeThreshold: 36,
    minHeightForPrice: 12,
    sqft: 5,
    width: 60,
  };

  it("evaluates a literal", () => {
    const node: FormulaNode = { type: "literal", value: 42 };
    expect(evaluateFormula(node, vars)).toBe(42);
  });

  it("evaluates a variable", () => {
    const node: FormulaNode = { type: "variable", name: "height" };
    expect(evaluateFormula(node, vars)).toBe(12);
  });

  it("evaluates binary operations", () => {
    const node: FormulaNode = {
      type: "binaryOp",
      op: "*",
      left: { type: "variable", name: "letterCount" },
      right: { type: "variable", name: "pricePerInch" },
    };
    expect(evaluateFormula(node, vars)).toBe(80);
  });

  it("evaluates nested binary operations", () => {
    // letterCount * height * pricePerInch = 5 * 12 * 16 = 960
    const node: FormulaNode = {
      type: "binaryOp",
      op: "*",
      left: {
        type: "binaryOp",
        op: "*",
        left: { type: "variable", name: "letterCount" },
        right: { type: "variable", name: "height" },
      },
      right: { type: "variable", name: "pricePerInch" },
    };
    expect(evaluateFormula(node, vars)).toBe(960);
  });

  it("evaluates min/max binary ops", () => {
    const node: FormulaNode = {
      type: "binaryOp",
      op: "max",
      left: { type: "variable", name: "height" },
      right: { type: "variable", name: "minHeightForPrice" },
    };
    expect(evaluateFormula(node, vars)).toBe(12);
  });

  it("evaluates unary functions", () => {
    const node: FormulaNode = {
      type: "unaryFn",
      fn: "round",
      arg: { type: "literal", value: 3.7 },
    };
    expect(evaluateFormula(node, vars)).toBe(4);
  });

  it("evaluates conditionals", () => {
    // if height > 36 then largePricePerInch else pricePerInch
    const node: FormulaNode = {
      type: "conditional",
      condition: {
        type: "compare",
        left: { type: "variable", name: "height" },
        op: ">",
        right: { type: "variable", name: "largeSizeThreshold" },
      },
      then: { type: "variable", name: "largePricePerInch" },
      else: { type: "variable", name: "pricePerInch" },
    };
    expect(evaluateFormula(node, vars)).toBe(16); // 12 is not > 36
    expect(evaluateFormula(node, { ...vars, height: 48 })).toBe(18);
  });

  it("evaluates multiplier chains", () => {
    const node: FormulaNode = {
      type: "multiplierChain",
      base: { type: "literal", value: 100 },
      multipliers: [
        {
          name: "Discount",
          reason: "test",
          factor: 0.75,
          condition: {
            type: "compare",
            left: { type: "variable", name: "height" },
            op: "==",
            right: { type: "literal", value: 12 },
          },
        },
      ],
    };
    // condition is true (height==12), so 100 * 0.75 = 75
    expect(evaluateFormula(node, vars)).toBe(75);
  });
});

describe("evaluateFormulaDefinition", () => {
  it("returns a full price breakdown", () => {
    const def: FormulaDefinition = {
      id: "test",
      name: "Test Formula",
      description: "test",
      variables: [],
      formula: {
        type: "binaryOp",
        op: "*",
        left: { type: "variable", name: "letterCount" },
        right: { type: "variable", name: "pricePerInch" },
      },
      addOns: [
        {
          name: "Raceway",
          label: "Raceway",
          formula: {
            type: "binaryOp",
            op: "*",
            left: { type: "variable", name: "width" },
            right: { type: "literal", value: 4.17 },
          },
          condition: {
            type: "compare",
            left: { type: "variable", name: "hasRaceway" },
            op: "==",
            right: { type: "literal", value: 1 },
          },
        },
      ],
      minOrderPrice: { type: "literal", value: 1360 },
    };

    const vars = { letterCount: 5, pricePerInch: 16, width: 60, hasRaceway: 1 };
    const result = evaluateFormulaDefinition(def, vars);

    expect(result.basePrice).toBe(80); // 5 * 16
    expect(result.lineItems).toHaveLength(1);
    expect(result.lineItems[0].name).toBe("Raceway");
    expect(result.lineItems[0].amount).toBeCloseTo(250.2);
    expect(result.subtotal).toBeCloseTo(330.2);
    expect(result.total).toBe(1360); // min order applied
    expect(result.minOrderApplied).toBe(true);
  });

  it("does not apply add-on when condition is false", () => {
    const def: FormulaDefinition = {
      id: "test",
      name: "Test",
      description: "test",
      variables: [],
      formula: { type: "literal", value: 2000 },
      addOns: [
        {
          name: "Extra",
          label: "Extra",
          formula: { type: "literal", value: 500 },
          condition: {
            type: "compare",
            left: { type: "variable", name: "hasExtra" },
            op: "==",
            right: { type: "literal", value: 1 },
          },
        },
      ],
      minOrderPrice: null,
    };

    const result = evaluateFormulaDefinition(def, { hasExtra: 0 });
    expect(result.lineItems).toHaveLength(0);
    expect(result.total).toBe(2000);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest src/engine/__tests__/schema-pricing.test.ts --no-cache
```

Expected: FAIL — `evaluateFormula` and `evaluateFormulaDefinition` not found.

- [ ] **Step 3: Implement the AST evaluator**

```typescript
// src/engine/schema-pricing.ts

import type {
  FormulaNode,
  FormulaDefinition,
  ConditionExpr,
  ConditionalMultiplier,
} from "./formula-types";

export interface SchemaPriceBreakdown {
  basePrice: number;
  appliedMultipliers: { name: string; reason: string; factor: number }[];
  priceAfterMultipliers: number;
  lineItems: { name: string; label: string; amount: number }[];
  subtotal: number;
  total: number;
  minOrderApplied: boolean;
}

/** Variable map: variable name → numeric value */
export type VariableMap = Record<string, number>;

/**
 * Evaluate a single formula node against a set of variables.
 * Pure function, no side effects.
 */
export function evaluateFormula(node: FormulaNode, vars: VariableMap): number {
  switch (node.type) {
    case "literal":
      return node.value;

    case "variable":
      return vars[node.name] ?? 0;

    case "binaryOp": {
      const left = evaluateFormula(node.left, vars);
      const right = evaluateFormula(node.right, vars);
      switch (node.op) {
        case "+": return left + right;
        case "-": return left - right;
        case "*": return left * right;
        case "/": return right === 0 ? 0 : left / right;
        case "min": return Math.min(left, right);
        case "max": return Math.max(left, right);
      }
      break;
    }

    case "unaryFn": {
      const val = evaluateFormula(node.arg, vars);
      switch (node.fn) {
        case "round": return Math.round(val);
        case "ceil": return Math.ceil(val);
        case "floor": return Math.floor(val);
        case "abs": return Math.abs(val);
      }
      break;
    }

    case "conditional": {
      const condResult = evaluateCondition(node.condition, vars);
      return condResult
        ? evaluateFormula(node.then, vars)
        : evaluateFormula(node.else, vars);
    }

    case "multiplierChain": {
      const base = evaluateFormula(node.base, vars);
      let result = base;
      for (const m of node.multipliers) {
        if (evaluateCondition(m.condition, vars)) {
          result *= m.factor;
        }
      }
      return result;
    }
  }

  return 0;
}

/**
 * Evaluate a condition expression.
 */
export function evaluateCondition(cond: ConditionExpr, vars: VariableMap): boolean {
  switch (cond.type) {
    case "compare": {
      const left = evaluateFormula(cond.left, vars);
      const right = evaluateFormula(cond.right, vars);
      switch (cond.op) {
        case "==": return left === right;
        case "!=": return left !== right;
        case ">": return left > right;
        case "<": return left < right;
        case ">=": return left >= right;
        case "<=": return left <= right;
      }
      break;
    }
    case "and":
      return cond.conditions.every((c) => evaluateCondition(c, vars));
    case "or":
      return cond.conditions.some((c) => evaluateCondition(c, vars));
  }
  return false;
}

/**
 * Evaluate a complete FormulaDefinition and return a full price breakdown.
 */
export function evaluateFormulaDefinition(
  def: FormulaDefinition,
  vars: VariableMap,
): SchemaPriceBreakdown {
  // 1. Evaluate base formula
  const basePrice = evaluateFormula(def.formula, vars);

  // 2. Collect applied multipliers (if formula uses multiplierChain, extract them)
  const appliedMultipliers = extractAppliedMultipliers(def.formula, vars);
  const priceAfterMultipliers = basePrice; // Already applied in the formula evaluation

  // 3. Evaluate add-on line items
  const lineItems: { name: string; label: string; amount: number }[] = [];
  for (const addOn of def.addOns) {
    if (addOn.condition === null || evaluateCondition(addOn.condition, vars)) {
      const amount = evaluateFormula(addOn.formula, vars);
      if (amount > 0) {
        lineItems.push({ name: addOn.name, label: addOn.label, amount });
      }
    }
  }

  // 4. Sum
  const addOnTotal = lineItems.reduce((sum, li) => sum + li.amount, 0);
  const subtotal = round(basePrice + addOnTotal);

  // 5. Enforce minimum order price
  const minPrice = def.minOrderPrice ? evaluateFormula(def.minOrderPrice, vars) : 0;
  const total = round(Math.max(subtotal, minPrice));
  const minOrderApplied = subtotal < minPrice;

  return {
    basePrice: round(basePrice),
    appliedMultipliers,
    priceAfterMultipliers: round(priceAfterMultipliers),
    lineItems,
    subtotal,
    total,
    minOrderApplied,
  };
}

function extractAppliedMultipliers(
  node: FormulaNode,
  vars: VariableMap,
): { name: string; reason: string; factor: number }[] {
  if (node.type === "multiplierChain") {
    return node.multipliers
      .filter((m) => evaluateCondition(m.condition, vars))
      .map((m) => ({ name: m.name, reason: m.reason, factor: m.factor }));
  }
  return [];
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/engine/__tests__/schema-pricing.test.ts --no-cache
```

Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/schema-pricing.ts src/engine/__tests__/schema-pricing.test.ts
git commit -m "feat: add formula AST evaluator with tests"
```

---

## Task 3: Preset Formula Templates

**Files:**
- Create: `src/engine/formula-presets.ts`
- Create: `src/engine/__tests__/formula-presets.test.ts`

Build the 12 preset formula ASTs that cover 80% of signage pricing.

- [ ] **Step 1: Write failing tests for presets**

```typescript
// src/engine/__tests__/formula-presets.test.ts

import { getPresetFormula, PRESET_IDS } from "../formula-presets";
import { evaluateFormulaDefinition } from "../schema-pricing";

describe("preset: per-inch-letter", () => {
  const def = getPresetFormula(PRESET_IDS.PER_INCH_LETTER);

  it("calculates base price: 5 letters * 12in * $16/in = $960", () => {
    const result = evaluateFormulaDefinition(def, {
      letterCount: 5,
      height: 12,
      basePricePerInch: 16,
      largeSizePricePerInch: 18,
      largeSizeThreshold: 36,
      minHeightForPrice: 12,
      minOrderPrice: 1360,
    });
    expect(result.basePrice).toBe(960);
    expect(result.total).toBe(1360); // min order applied
    expect(result.minOrderApplied).toBe(true);
  });

  it("uses large size price above threshold", () => {
    const result = evaluateFormulaDefinition(def, {
      letterCount: 3,
      height: 48,
      basePricePerInch: 16,
      largeSizePricePerInch: 18,
      largeSizeThreshold: 36,
      minHeightForPrice: 12,
      minOrderPrice: 1360,
    });
    // 3 * 48 * 18 = 2592
    expect(result.basePrice).toBe(2592);
  });

  it("uses minHeightForPrice when height is below it", () => {
    const result = evaluateFormulaDefinition(def, {
      letterCount: 5,
      height: 8,
      basePricePerInch: 16,
      largeSizePricePerInch: 18,
      largeSizeThreshold: 36,
      minHeightForPrice: 12,
      minOrderPrice: 1360,
    });
    // 5 * max(8, 12) * 16 = 5 * 12 * 16 = 960
    expect(result.basePrice).toBe(960);
  });
});

describe("preset: per-sqft", () => {
  const def = getPresetFormula(PRESET_IDS.PER_SQFT);

  it("calculates: 48x36 panel at $75/sqft = $900", () => {
    const result = evaluateFormulaDefinition(def, {
      widthInches: 48,
      heightInches: 36,
      basePricePerSqft: 75,
      minSqft: 6,
      minOrderPrice: 1500,
    });
    // sqft = 48*36/144 = 12, max(12, 6) * 75 = 900
    expect(result.basePrice).toBe(900);
    expect(result.total).toBe(1500); // min order applied
  });
});

describe("preset: flat-rate", () => {
  const def = getPresetFormula(PRESET_IDS.FLAT_RATE);

  it("returns fixed price", () => {
    const result = evaluateFormulaDefinition(def, {
      fixedPrice: 250,
      minOrderPrice: 0,
    });
    expect(result.total).toBe(250);
  });
});

describe("preset: per-character", () => {
  const def = getPresetFormula(PRESET_IDS.PER_CHARACTER);

  it("calculates: 8 chars * $50/char = $400", () => {
    const result = evaluateFormulaDefinition(def, {
      charCount: 8,
      pricePerChar: 50,
      minOrderPrice: 300,
    });
    expect(result.basePrice).toBe(400);
    expect(result.total).toBe(400);
  });
});

describe("preset: base-plus-sqft", () => {
  const def = getPresetFormula(PRESET_IDS.BASE_PLUS_SQFT);

  it("calculates: $1200 base + 20sqft * $30/sqft = $1800", () => {
    const result = evaluateFormulaDefinition(def, {
      basePrice: 1200,
      sqft: 20,
      pricePerSqft: 30,
      minOrderPrice: 1500,
    });
    expect(result.basePrice).toBe(1800);
    expect(result.total).toBe(1800);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx jest src/engine/__tests__/formula-presets.test.ts --no-cache
```

Expected: FAIL — `getPresetFormula` not found.

- [ ] **Step 3: Implement preset formula definitions**

```typescript
// src/engine/formula-presets.ts

import type { FormulaDefinition, FormulaNode } from "./formula-types";

export const PRESET_IDS = {
  PER_INCH_LETTER: "preset-per-inch-letter",
  PER_SQFT: "preset-per-sqft",
  PER_SQINCH: "preset-per-sqinch",
  PER_UNIT_SIZE_TIER: "preset-per-unit-size-tier",
  BASE_PLUS_LINEAR_FT: "preset-base-plus-linear-ft",
  BASE_PLUS_SQFT: "preset-base-plus-sqft",
  FLAT_RATE: "preset-flat-rate",
  PER_CHARACTER: "preset-per-character",
  TIERED_VOLUME: "preset-tiered-volume",
  WEIGHT_BASED: "preset-weight-based",
  RUSH_SURCHARGE: "preset-rush-surcharge",
  COMPOSITE: "preset-composite",
} as const;

// Helper to reduce boilerplate
const v = (name: string): FormulaNode => ({ type: "variable", name });
const lit = (value: number): FormulaNode => ({ type: "literal", value });
const mul = (left: FormulaNode, right: FormulaNode): FormulaNode => ({
  type: "binaryOp", op: "*", left, right,
});
const add = (left: FormulaNode, right: FormulaNode): FormulaNode => ({
  type: "binaryOp", op: "+", left, right,
});
const div = (left: FormulaNode, right: FormulaNode): FormulaNode => ({
  type: "binaryOp", op: "/", left, right,
});
const max = (left: FormulaNode, right: FormulaNode): FormulaNode => ({
  type: "binaryOp", op: "max", left, right,
});

const presets: Record<string, FormulaDefinition> = {
  [PRESET_IDS.PER_INCH_LETTER]: {
    id: PRESET_IDS.PER_INCH_LETTER,
    name: "Per-Inch Letter",
    description: "letterCount * max(height, minHeight) * pricePerInch. Switches to largeSizePrice above threshold.",
    variables: [
      { name: "letterCount", label: "Letter Count", source: "computed", description: "Number of non-space characters" },
      { name: "height", label: "Height (inches)", source: "option", description: "Letter height" },
      { name: "basePricePerInch", label: "Base $/inch", source: "param", description: "Price per inch for standard sizes" },
      { name: "largeSizePricePerInch", label: "Large $/inch", source: "param", description: "Price per inch above threshold" },
      { name: "largeSizeThreshold", label: "Large Size Threshold", source: "param", description: "Height threshold for large pricing" },
      { name: "minHeightForPrice", label: "Min Height for Price", source: "param", description: "Minimum height used in calculation" },
      { name: "minOrderPrice", label: "Min Order Price", source: "param", description: "Minimum order total" },
    ],
    formula: mul(
      v("letterCount"),
      mul(
        max(v("height"), v("minHeightForPrice")),
        {
          type: "conditional",
          condition: {
            type: "compare",
            left: v("height"),
            op: ">",
            right: v("largeSizeThreshold"),
          },
          then: v("largeSizePricePerInch"),
          else: v("basePricePerInch"),
        },
      ),
    ),
    addOns: [],
    minOrderPrice: v("minOrderPrice"),
  },

  [PRESET_IDS.PER_SQFT]: {
    id: PRESET_IDS.PER_SQFT,
    name: "Per Square Foot",
    description: "max(widthInches * heightInches / 144, minSqft) * basePricePerSqft",
    variables: [
      { name: "widthInches", label: "Width (inches)", source: "option", description: "Panel width" },
      { name: "heightInches", label: "Height (inches)", source: "option", description: "Panel height" },
      { name: "basePricePerSqft", label: "$/sqft", source: "param", description: "Price per square foot" },
      { name: "minSqft", label: "Min Sqft", source: "param", description: "Minimum sqft for pricing" },
      { name: "minOrderPrice", label: "Min Order Price", source: "param", description: "Minimum order total" },
    ],
    formula: mul(
      max(
        div(mul(v("widthInches"), v("heightInches")), lit(144)),
        v("minSqft"),
      ),
      v("basePricePerSqft"),
    ),
    addOns: [],
    minOrderPrice: v("minOrderPrice"),
  },

  [PRESET_IDS.PER_SQINCH]: {
    id: PRESET_IDS.PER_SQINCH,
    name: "Per Square Inch",
    description: "max(width, minDimension) * max(height, minDimension) * pricePerSqInch",
    variables: [
      { name: "widthInches", label: "Width", source: "option", description: "Width in inches" },
      { name: "heightInches", label: "Height", source: "option", description: "Height in inches" },
      { name: "basePricePerSqInch", label: "$/sqin", source: "param", description: "Price per square inch" },
      { name: "minDimension", label: "Min Dimension", source: "param", description: "Minimum dimension for pricing" },
      { name: "minOrderPrice", label: "Min Order Price", source: "param", description: "Minimum order total" },
    ],
    formula: mul(
      mul(
        max(v("widthInches"), v("minDimension")),
        max(v("heightInches"), v("minDimension")),
      ),
      v("basePricePerSqInch"),
    ),
    addOns: [],
    minOrderPrice: v("minOrderPrice"),
  },

  [PRESET_IDS.FLAT_RATE]: {
    id: PRESET_IDS.FLAT_RATE,
    name: "Flat Rate",
    description: "Fixed price regardless of configuration",
    variables: [
      { name: "fixedPrice", label: "Fixed Price", source: "param", description: "The flat rate price" },
      { name: "minOrderPrice", label: "Min Order Price", source: "param", description: "Minimum order total" },
    ],
    formula: v("fixedPrice"),
    addOns: [],
    minOrderPrice: v("minOrderPrice"),
  },

  [PRESET_IDS.PER_CHARACTER]: {
    id: PRESET_IDS.PER_CHARACTER,
    name: "Per Character",
    description: "charCount * pricePerChar",
    variables: [
      { name: "charCount", label: "Character Count", source: "computed", description: "Number of characters" },
      { name: "pricePerChar", label: "$/character", source: "param", description: "Price per character" },
      { name: "minOrderPrice", label: "Min Order Price", source: "param", description: "Minimum order total" },
    ],
    formula: mul(v("charCount"), v("pricePerChar")),
    addOns: [],
    minOrderPrice: v("minOrderPrice"),
  },

  [PRESET_IDS.BASE_PLUS_SQFT]: {
    id: PRESET_IDS.BASE_PLUS_SQFT,
    name: "Base + Square Footage",
    description: "basePrice + sqft * pricePerSqft",
    variables: [
      { name: "basePrice", label: "Base Price", source: "param", description: "Fixed base price" },
      { name: "sqft", label: "Square Feet", source: "computed", description: "Sign area in sqft" },
      { name: "pricePerSqft", label: "$/sqft", source: "param", description: "Additional price per sqft" },
      { name: "minOrderPrice", label: "Min Order Price", source: "param", description: "Minimum order total" },
    ],
    formula: add(v("basePrice"), mul(v("sqft"), v("pricePerSqft"))),
    addOns: [],
    minOrderPrice: v("minOrderPrice"),
  },

  [PRESET_IDS.BASE_PLUS_LINEAR_FT]: {
    id: PRESET_IDS.BASE_PLUS_LINEAR_FT,
    name: "Base + Linear Foot",
    description: "basePrice + (widthInches / 12) * pricePerFt",
    variables: [
      { name: "basePrice", label: "Base Price", source: "param", description: "Fixed base price" },
      { name: "widthInches", label: "Width (inches)", source: "option", description: "Width in inches" },
      { name: "pricePerFt", label: "$/linear ft", source: "param", description: "Price per linear foot" },
      { name: "minOrderPrice", label: "Min Order Price", source: "param", description: "Minimum order total" },
    ],
    formula: add(v("basePrice"), mul(div(v("widthInches"), lit(12)), v("pricePerFt"))),
    addOns: [],
    minOrderPrice: v("minOrderPrice"),
  },

  [PRESET_IDS.PER_UNIT_SIZE_TIER]: {
    id: PRESET_IDS.PER_UNIT_SIZE_TIER,
    name: "Per Unit (Size Tiered)",
    description: "unitPrice * quantity, where unitPrice depends on size",
    variables: [
      { name: "quantity", label: "Quantity", source: "option", description: "Number of units" },
      { name: "smallUnitPrice", label: "Small Unit Price", source: "param", description: "Price for small size" },
      { name: "largeUnitPrice", label: "Large Unit Price", source: "param", description: "Price for large size" },
      { name: "sizeThreshold", label: "Size Threshold", source: "param", description: "Height threshold" },
      { name: "height", label: "Height", source: "option", description: "Height in inches" },
      { name: "minOrderPrice", label: "Min Order Price", source: "param", description: "Minimum order total" },
    ],
    formula: mul(
      v("quantity"),
      {
        type: "conditional",
        condition: {
          type: "compare",
          left: v("height"),
          op: ">",
          right: v("sizeThreshold"),
        },
        then: v("largeUnitPrice"),
        else: v("smallUnitPrice"),
      },
    ),
    addOns: [],
    minOrderPrice: v("minOrderPrice"),
  },

  [PRESET_IDS.TIERED_VOLUME]: {
    id: PRESET_IDS.TIERED_VOLUME,
    name: "Tiered Volume",
    description: "Price per unit decreases at quantity thresholds",
    variables: [
      { name: "quantity", label: "Quantity", source: "option", description: "Number of units" },
      { name: "tier1Price", label: "Tier 1 Price (1-9)", source: "param", description: "Price for 1-9 units" },
      { name: "tier2Price", label: "Tier 2 Price (10-49)", source: "param", description: "Price for 10-49 units" },
      { name: "tier3Price", label: "Tier 3 Price (50+)", source: "param", description: "Price for 50+ units" },
      { name: "minOrderPrice", label: "Min Order Price", source: "param", description: "Minimum order total" },
    ],
    formula: mul(
      v("quantity"),
      {
        type: "conditional",
        condition: { type: "compare", left: v("quantity"), op: ">=", right: lit(50) },
        then: v("tier3Price"),
        else: {
          type: "conditional",
          condition: { type: "compare", left: v("quantity"), op: ">=", right: lit(10) },
          then: v("tier2Price"),
          else: v("tier1Price"),
        },
      },
    ),
    addOns: [],
    minOrderPrice: v("minOrderPrice"),
  },

  [PRESET_IDS.WEIGHT_BASED]: {
    id: PRESET_IDS.WEIGHT_BASED,
    name: "Weight-Based",
    description: "weight * pricePerLb + shippingBase",
    variables: [
      { name: "weight", label: "Weight (lbs)", source: "computed", description: "Estimated weight" },
      { name: "pricePerLb", label: "$/lb", source: "param", description: "Price per pound" },
      { name: "shippingBase", label: "Shipping Base", source: "param", description: "Base shipping cost" },
      { name: "minOrderPrice", label: "Min Order Price", source: "param", description: "Minimum order total" },
    ],
    formula: add(mul(v("weight"), v("pricePerLb")), v("shippingBase")),
    addOns: [],
    minOrderPrice: v("minOrderPrice"),
  },

  [PRESET_IDS.RUSH_SURCHARGE]: {
    id: PRESET_IDS.RUSH_SURCHARGE,
    name: "Rush Surcharge",
    description: "subtotal * rushMultiplier",
    variables: [
      { name: "subtotal", label: "Subtotal", source: "computed", description: "Pre-rush subtotal" },
      { name: "rushMultiplier", label: "Rush Multiplier", source: "param", description: "e.g. 1.5 for 50% rush fee" },
      { name: "minOrderPrice", label: "Min Order Price", source: "param", description: "Minimum order total" },
    ],
    formula: mul(v("subtotal"), v("rushMultiplier")),
    addOns: [],
    minOrderPrice: v("minOrderPrice"),
  },

  [PRESET_IDS.COMPOSITE]: {
    id: PRESET_IDS.COMPOSITE,
    name: "Composite",
    description: "Sum of multiple sub-calculations: letterPrice + racewayPrice + vinylPrice",
    variables: [
      { name: "letterPrice", label: "Letter Sub-total", source: "computed", description: "From letter formula" },
      { name: "racewayPrice", label: "Raceway Sub-total", source: "computed", description: "From raceway formula" },
      { name: "vinylPrice", label: "Vinyl Sub-total", source: "computed", description: "From vinyl formula" },
      { name: "minOrderPrice", label: "Min Order Price", source: "param", description: "Minimum order total" },
    ],
    formula: add(add(v("letterPrice"), v("racewayPrice")), v("vinylPrice")),
    addOns: [],
    minOrderPrice: v("minOrderPrice"),
  },
};

export function getPresetFormula(id: string): FormulaDefinition {
  const preset = presets[id];
  if (!preset) throw new Error(`Unknown preset formula: ${id}`);
  return preset;
}

export function getAllPresetFormulas(): FormulaDefinition[] {
  return Object.values(presets);
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx jest src/engine/__tests__/formula-presets.test.ts --no-cache
```

Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/engine/formula-presets.ts src/engine/__tests__/formula-presets.test.ts
git commit -m "feat: add 12 preset pricing formula templates with tests"
```

---

## Task 4: Backward-Compatibility Test — Existing Pricing Through New Engine

**Files:**
- Create: `src/engine/__tests__/schema-pricing-compat.test.ts`

Prove that the new AST engine produces identical results to the existing hardcoded `calculateChannelLetterPrice` for all existing test cases.

- [ ] **Step 1: Write compatibility tests**

```typescript
// src/engine/__tests__/schema-pricing-compat.test.ts

import { calculateChannelLetterPrice } from "../channel-letter-pricing";
import { evaluateFormulaDefinition } from "../schema-pricing";
import { getPresetFormula, PRESET_IDS } from "../formula-presets";
import type { PricingParams } from "@/types/product";
import type { SignConfiguration, Dimensions } from "@/types/configurator";

/**
 * These tests verify that the new schema-driven pricing engine produces
 * the same base prices as the original hardcoded engine.
 *
 * Note: multipliers and add-ons (raceway, vinyl, painting) are handled
 * as add-ons in the schema engine, tested separately. This test focuses
 * on the core per-inch-letter formula.
 */

const defaultParams: PricingParams = {
  basePricePerInch: 16,
  largeSizeThreshold: 36,
  largeSizePricePerInch: 18,
  minHeightForPrice: 12,
  minOrderPrice: 1360,
};

const presetDef = getPresetFormula(PRESET_IDS.PER_INCH_LETTER);

function makeVars(text: string, height: number, params: PricingParams) {
  const letterCount = text.replace(/\s+/g, "").length;
  return {
    letterCount,
    height,
    basePricePerInch: params.basePricePerInch,
    largeSizePricePerInch: params.largeSizePricePerInch,
    largeSizeThreshold: params.largeSizeThreshold,
    minHeightForPrice: params.minHeightForPrice,
    minOrderPrice: params.minOrderPrice,
  };
}

describe("schema pricing produces same base prices as hardcoded engine", () => {
  const cases = [
    { text: "HELLO", height: 12, expectedBase: 960 },
    { text: "HELLO", height: 48, expectedBase: 4320 }, // above threshold: 5*48*18
    { text: "HELLO", height: 8, expectedBase: 960 },   // below min: uses 12
    { text: "A", height: 24, expectedBase: 384 },       // 1*24*16
    { text: "ABCDEFGHIJ", height: 12, expectedBase: 1920 }, // 10*12*16
  ];

  test.each(cases)(
    "$text at $height inches → base $expectedBase",
    ({ text, height, expectedBase }) => {
      const vars = makeVars(text, height, defaultParams);
      const schemaResult = evaluateFormulaDefinition(presetDef, vars);
      expect(schemaResult.basePrice).toBe(expectedBase);
    },
  );

  it("enforces minimum order price same as original", () => {
    const vars = makeVars("HELLO", 12, defaultParams);
    const schemaResult = evaluateFormulaDefinition(presetDef, vars);
    // 960 < 1360 minimum → total should be 1360
    expect(schemaResult.total).toBe(1360);
    expect(schemaResult.minOrderApplied).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npx jest src/engine/__tests__/schema-pricing-compat.test.ts --no-cache
```

Expected: ALL PASS

- [ ] **Step 3: Commit**

```bash
git add src/engine/__tests__/schema-pricing-compat.test.ts
git commit -m "test: verify schema pricing backward-compatibility with hardcoded engine"
```

---

## Task 5: Multi-Tenant Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`

Add `Tenant` model, `PricingFormula` model, and `tenantId` to all existing tables.

- [ ] **Step 1: Update the Prisma schema**

Add the following to `prisma/schema.prisma`. The full updated file content is shown for the new/modified models only — do NOT remove existing models, only add `tenantId` fields and the new models.

Add **Tenant model** after the `VerificationToken` model:

```prisma
// ─── Tenants ────────────────────────────────────

model Tenant {
  id          String   @id @default(cuid())
  slug        String   @unique
  name        String
  plan        TenantPlan @default(FREE)
  
  // Branding
  logoUrl     String?
  primaryColor String?
  accentColor  String?
  customDomain String?  @unique
  
  // Settings
  currency    String   @default("USD")
  locale      String   @default("en-US")
  
  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  products        Product[]
  pricingFormulas PricingFormula[]
  orders          Order[]
  cartItems       CartItem[]
  savedDesigns    SavedDesign[]
  apiKeys         ApiKey[]
}

enum TenantPlan {
  FREE
  PRO
  ENTERPRISE
}

model ApiKey {
  id        String   @id @default(cuid())
  tenantId  String
  key       String   @unique
  name      String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())

  tenant Tenant @relation(fields: [tenantId], references: [id], onDelete: Cascade)
}

// ─── Pricing Formulas ───────────────────────────

model PricingFormula {
  id          String   @id @default(cuid())
  tenantId    String
  name        String
  description String?
  type        FormulaType @default(PRESET)
  presetId    String?
  formulaAst  Json?
  scriptBody  String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  tenant   Tenant    @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  products Product[]

  @@unique([tenantId, name])
}

enum FormulaType {
  PRESET
  VISUAL
  SCRIPT
}
```

Add `tenantId` and `pricingFormulaId` to the **Product** model:

```prisma
model Product {
  id          String          @id @default(cuid())
  tenantId    String
  slug        String
  name        String
  description String?
  category    String
  imageUrl    String?
  isActive    Boolean         @default(true)
  sortOrder   Int             @default(0)
  
  // Schema-driven fields
  productSchema   Json?       // Full ProductSchema JSON
  pricingParams   Json?       // Parameter values for the formula
  renderConfig    Json?       // 3D rendering configuration
  
  pricingFormulaId String?
  
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  tenant          Tenant           @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  pricingFormula  PricingFormula?  @relation(fields: [pricingFormulaId], references: [id])
  orderItems      OrderItem[]
  cartItems       CartItem[]
  savedDesigns    SavedDesign[]

  @@unique([tenantId, slug])
}
```

Add `tenantId` to **Order**, **CartItem**, and **SavedDesign** models. Add `configSnapshot` to **OrderItem**.

Update the `ProductCategory` enum to just be a `String` field on Product (since categories are now dynamic per tenant). Remove the old `ProductCategory` enum, `ProductPricingParams` model, and `ProductOptionDef` model — these are replaced by the JSON `productSchema` field.

- [ ] **Step 2: Generate Prisma client**

```bash
npx prisma generate
```

Expected: Prisma client regenerated in `src/generated/prisma/`

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma src/generated/prisma/
git commit -m "feat: add Tenant, PricingFormula models; add tenantId to all tables"
```

---

## Task 6: Tenant Resolution Middleware

**Files:**
- Create: `src/lib/tenant.ts`
- Modify: `src/lib/prisma.ts`

- [ ] **Step 1: Create tenant resolution utility**

```typescript
// src/lib/tenant.ts

import { prisma } from "./prisma";

const DEFAULT_TENANT_SLUG = "gatsoft";

export interface ResolvedTenant {
  id: string;
  slug: string;
  name: string;
  plan: string;
}

/**
 * Resolve the tenant from a request.
 * Priority: X-Tenant-Slug header > API key > custom domain > default tenant.
 */
export async function resolveTenant(request: Request): Promise<ResolvedTenant | null> {
  // 1. Check X-Tenant-Slug header (for widget/API consumers)
  const slugHeader = request.headers.get("x-tenant-slug");
  if (slugHeader) {
    return findTenantBySlug(slugHeader);
  }

  // 2. Check X-API-Key header (for widget embed)
  const apiKey = request.headers.get("x-api-key");
  if (apiKey) {
    return findTenantByApiKey(apiKey);
  }

  // 3. Default tenant (D2C storefront)
  return findTenantBySlug(DEFAULT_TENANT_SLUG);
}

async function findTenantBySlug(slug: string): Promise<ResolvedTenant | null> {
  const tenant = await prisma.tenant.findUnique({
    where: { slug, isActive: true },
    select: { id: true, slug: true, name: true, plan: true },
  });
  return tenant;
}

async function findTenantByApiKey(key: string): Promise<ResolvedTenant | null> {
  const apiKeyRecord = await prisma.apiKey.findUnique({
    where: { key, isActive: true },
    include: {
      tenant: {
        select: { id: true, slug: true, name: true, plan: true },
      },
    },
  });
  if (!apiKeyRecord?.tenant?.isActive) return null;
  return apiKeyRecord.tenant;
}

export { DEFAULT_TENANT_SLUG };
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/tenant.ts
git commit -m "feat: add tenant resolution from request headers"
```

---

## Task 7: Schema-Driven Pricing API Route

**Files:**
- Create: `src/app/api/v1/pricing/calculate/route.ts`

This new v1 route uses the schema-driven pricing engine. The old route at `/api/pricing/calculate` stays for backward compatibility.

- [ ] **Step 1: Create the new pricing API route**

```typescript
// src/app/api/v1/pricing/calculate/route.ts

import { NextRequest, NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { evaluateFormulaDefinition } from "@/engine/schema-pricing";
import { getPresetFormula } from "@/engine/formula-presets";
import type { FormulaDefinition } from "@/engine/formula-types";
import type { ProductSchema } from "@/types/schema";

export async function POST(request: NextRequest) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const body = await request.json();
    const { productId, optionValues, dimensions } = body;

    if (!productId || !optionValues) {
      return NextResponse.json(
        { error: "productId and optionValues are required" },
        { status: 400 },
      );
    }

    // Fetch product with its pricing formula
    const product = await prisma.product.findUnique({
      where: { id: productId, tenantId: tenant.id },
      include: { pricingFormula: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Resolve the formula definition
    let formulaDef: FormulaDefinition;
    if (product.pricingFormula?.type === "PRESET" && product.pricingFormula.presetId) {
      formulaDef = getPresetFormula(product.pricingFormula.presetId);
    } else if (product.pricingFormula?.formulaAst) {
      formulaDef = product.pricingFormula.formulaAst as unknown as FormulaDefinition;
    } else {
      return NextResponse.json(
        { error: "Product has no pricing formula configured" },
        { status: 400 },
      );
    }

    // Build the variable map from option values, dimensions, and pricing params
    const pricingParams = (product.pricingParams as Record<string, number>) ?? {};
    const schema = product.productSchema as unknown as ProductSchema | null;

    // Compute derived variables
    const text = (optionValues.text as string) ?? "";
    const letterCount = text.replace(/\s+/g, "").length;
    const widthInches = dimensions?.widthInches ?? optionValues.widthInches ?? 0;
    const heightInches = dimensions?.heightInches ?? optionValues.height ?? optionValues.heightInches ?? 0;
    const sqft = widthInches && heightInches ? (widthInches * heightInches) / 144 : 0;

    const vars: Record<string, number> = {
      // From option values (convert string options to numeric flags for conditions)
      ...flattenOptionValues(optionValues),
      // From dimensions
      widthInches,
      heightInches,
      sqft,
      letterCount,
      charCount: letterCount,
      // From pricing params (admin-configured numbers)
      ...pricingParams,
    };

    const breakdown = evaluateFormulaDefinition(formulaDef, vars);

    return NextResponse.json({ breakdown });
  } catch (error) {
    console.error("Schema pricing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

/**
 * Flatten option values into numeric variables for the formula engine.
 * String options become 1/0 flags: e.g., { lit: "Lit" } → { lit_Lit: 1, lit_NonLit: 0 }
 * Numeric options pass through directly.
 */
function flattenOptionValues(opts: Record<string, unknown>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(opts)) {
    if (typeof value === "number") {
      result[key] = value;
    } else if (typeof value === "boolean") {
      result[key] = value ? 1 : 0;
    } else if (typeof value === "string") {
      // Pass as-is for formula variable resolution (height as string → number)
      const num = parseFloat(value);
      if (!isNaN(num)) {
        result[key] = num;
      }
    }
  }
  return result;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/v1/pricing/calculate/route.ts
git commit -m "feat: add schema-driven pricing API route (v1)"
```

---

## Task 8: Product CRUD API Routes

**Files:**
- Create: `src/app/api/v1/products/route.ts`
- Create: `src/app/api/v1/products/[productId]/route.ts`

- [ ] **Step 1: Create product list/create route**

```typescript
// src/app/api/v1/products/route.ts

import { NextRequest, NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const tenant = await resolveTenant(request);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const activeOnly = searchParams.get("active") !== "false";

  const products = await prisma.product.findMany({
    where: {
      tenantId: tenant.id,
      ...(category ? { category } : {}),
      ...(activeOnly ? { isActive: true } : {}),
    },
    include: { pricingFormula: true },
    orderBy: { sortOrder: "asc" },
  });

  // Return products with their schemas (but strip internal IDs for public API)
  const result = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    description: p.description,
    category: p.category,
    imageUrl: p.imageUrl,
    isActive: p.isActive,
    productSchema: p.productSchema,
    pricingParams: p.pricingParams,
    renderConfig: p.renderConfig,
    pricingFormula: p.pricingFormula
      ? { id: p.pricingFormula.id, name: p.pricingFormula.name, type: p.pricingFormula.type }
      : null,
  }));

  return NextResponse.json({ products: result });
}

export async function POST(request: NextRequest) {
  const tenant = await resolveTenant(request);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const body = await request.json();
  const { name, slug, description, category, productSchema, pricingParams, renderConfig, pricingFormulaId } = body;

  if (!name || !slug || !category) {
    return NextResponse.json(
      { error: "name, slug, and category are required" },
      { status: 400 },
    );
  }

  const product = await prisma.product.create({
    data: {
      tenantId: tenant.id,
      name,
      slug,
      description,
      category,
      productSchema: productSchema ?? undefined,
      pricingParams: pricingParams ?? undefined,
      renderConfig: renderConfig ?? undefined,
      pricingFormulaId: pricingFormulaId ?? undefined,
    },
  });

  return NextResponse.json({ product }, { status: 201 });
}
```

- [ ] **Step 2: Create product detail route**

```typescript
// src/app/api/v1/products/[productId]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  const tenant = await resolveTenant(request);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const { productId } = await params;

  const product = await prisma.product.findUnique({
    where: { id: productId, tenantId: tenant.id },
    include: { pricingFormula: true },
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({ product });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  const tenant = await resolveTenant(request);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const { productId } = await params;
  const body = await request.json();

  const product = await prisma.product.update({
    where: { id: productId, tenantId: tenant.id },
    data: body,
  });

  return NextResponse.json({ product });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> },
) {
  const tenant = await resolveTenant(request);
  if (!tenant) {
    return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
  }

  const { productId } = await params;

  await prisma.product.delete({
    where: { id: productId, tenantId: tenant.id },
  });

  return NextResponse.json({ success: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v1/products/
git commit -m "feat: add tenant-scoped product CRUD API routes"
```

---

## Task 9: Seed Script — Migrate Existing Products to Schema Format

**Files:**
- Create: `src/seed/default-tenant.ts`

This script creates the default GatSoft tenant, creates pricing formulas from presets, and migrates all existing hardcoded product definitions into schema-driven DB records.

- [ ] **Step 1: Create the seed script**

```typescript
// src/seed/default-tenant.ts

import { PrismaClient } from "@/generated/prisma";
import { PRESET_IDS } from "@/engine/formula-presets";
import { channelLetterProducts, litShapeProducts, cabinetProducts, dimensionalProducts, logoProducts, printProducts, signPostProducts } from "@/engine/product-definitions";

const prisma = new PrismaClient();

async function seed() {
  console.log("Seeding default tenant...");

  // 1. Create default tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: "gatsoft" },
    update: {},
    create: {
      slug: "gatsoft",
      name: "GatSoft Signs",
      plan: "ENTERPRISE",
      currency: "USD",
      locale: "en-US",
    },
  });

  console.log(`Tenant: ${tenant.name} (${tenant.id})`);

  // 2. Create pricing formulas from presets
  const perInchFormula = await prisma.pricingFormula.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Per-Inch Channel Letter" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Per-Inch Channel Letter",
      description: "Standard channel letter pricing: letterCount * height * pricePerInch",
      type: "PRESET",
      presetId: PRESET_IDS.PER_INCH_LETTER,
    },
  });

  const perSqftFormula = await prisma.pricingFormula.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Per Square Foot" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Per Square Foot",
      description: "Price by square footage",
      type: "PRESET",
      presetId: PRESET_IDS.PER_SQFT,
    },
  });

  const perSqInchFormula = await prisma.pricingFormula.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Per Square Inch" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Per Square Inch",
      description: "Price by square inch for logos",
      type: "PRESET",
      presetId: PRESET_IDS.PER_SQINCH,
    },
  });

  const basePlusSqftFormula = await prisma.pricingFormula.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Base + Square Foot" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Base + Square Foot",
      description: "Base price plus per-sqft for sign posts/monuments",
      type: "PRESET",
      presetId: PRESET_IDS.BASE_PLUS_SQFT,
    },
  });

  const flatRateFormula = await prisma.pricingFormula.upsert({
    where: { tenantId_name: { tenantId: tenant.id, name: "Flat Rate" } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: "Flat Rate",
      description: "Fixed price product",
      type: "PRESET",
      presetId: PRESET_IDS.FLAT_RATE,
    },
  });

  // 3. Migrate channel letter products
  for (const p of channelLetterProducts) {
    await prisma.product.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: p.slug } },
      update: {},
      create: {
        tenantId: tenant.id,
        slug: p.slug,
        name: p.name,
        description: p.description,
        category: "CHANNEL_LETTERS",
        pricingFormulaId: perInchFormula.id,
        pricingParams: {
          basePricePerInch: p.pricingParams.basePricePerInch,
          largeSizePricePerInch: p.pricingParams.largeSizePricePerInch,
          largeSizeThreshold: p.pricingParams.largeSizeThreshold,
          minHeightForPrice: p.pricingParams.minHeightForPrice,
          minOrderPrice: p.pricingParams.minOrderPrice,
        },
        productSchema: {
          name: p.name,
          slug: p.slug,
          description: p.description,
          category: "CHANNEL_LETTERS",
          options: p.options.map((o) => ({
            id: o.id,
            type: o.inputType === "checkbox" ? "toggle" : o.inputType,
            label: o.label,
            required: o.isRequired ?? false,
            defaultValue: o.defaultValue,
            values: o.possibleValues,
            dependsOn: o.dependsOn,
          })),
          rules: [],
          renderConfig: {
            pipeline: "text-to-3d" as const,
            meshBindings: {},
          },
          pricingFormulaId: perInchFormula.id,
          pricingParams: p.pricingParams,
        },
      },
    });
    console.log(`  Product: ${p.name}`);
  }

  // 4. Migrate sqft-based products (lit shapes, cabinets)
  for (const p of [...litShapeProducts, ...cabinetProducts]) {
    await prisma.product.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: p.slug } },
      update: {},
      create: {
        tenantId: tenant.id,
        slug: p.slug,
        name: p.name,
        description: p.description,
        category: p.category,
        pricingFormulaId: perSqftFormula.id,
        pricingParams: p.pricingParams,
        productSchema: {
          name: p.name,
          slug: p.slug,
          description: p.description,
          category: p.category,
          options: [],
          rules: [],
          renderConfig: { pipeline: "part-assembly" as const, meshBindings: {} },
          pricingFormulaId: perSqftFormula.id,
          pricingParams: p.pricingParams,
        },
      },
    });
    console.log(`  Product: ${p.name}`);
  }

  // 5. Migrate dimensional letter products (per-inch)
  for (const p of dimensionalProducts) {
    await prisma.product.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: p.slug } },
      update: {},
      create: {
        tenantId: tenant.id,
        slug: p.slug,
        name: p.name,
        description: p.description,
        category: p.category,
        pricingFormulaId: perInchFormula.id,
        pricingParams: p.pricingParams,
        productSchema: {
          name: p.name,
          slug: p.slug,
          description: p.description,
          category: p.category,
          options: [],
          rules: [],
          renderConfig: { pipeline: "text-to-3d" as const, meshBindings: {} },
          pricingFormulaId: perInchFormula.id,
          pricingParams: p.pricingParams,
        },
      },
    });
    console.log(`  Product: ${p.name}`);
  }

  // 6. Migrate logo products (per-sqinch)
  for (const p of logoProducts) {
    await prisma.product.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: p.slug } },
      update: {},
      create: {
        tenantId: tenant.id,
        slug: p.slug,
        name: p.name,
        description: p.description,
        category: p.category,
        pricingFormulaId: perSqInchFormula.id,
        pricingParams: p.pricingParams,
        productSchema: {
          name: p.name,
          slug: p.slug,
          description: p.description,
          category: p.category,
          options: [],
          rules: [],
          renderConfig: { pipeline: "part-assembly" as const, meshBindings: {} },
          pricingFormulaId: perSqInchFormula.id,
          pricingParams: p.pricingParams,
        },
      },
    });
    console.log(`  Product: ${p.name}`);
  }

  // 7. Migrate print products (per-sqft)
  for (const p of printProducts) {
    await prisma.product.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: p.slug } },
      update: {},
      create: {
        tenantId: tenant.id,
        slug: p.slug,
        name: p.name,
        description: p.description,
        category: p.category,
        pricingFormulaId: perSqftFormula.id,
        pricingParams: p.pricingParams,
        productSchema: {
          name: p.name,
          slug: p.slug,
          description: p.description,
          category: p.category,
          options: [],
          rules: [],
          renderConfig: { pipeline: "flat-2d" as const, meshBindings: {} },
          pricingFormulaId: perSqftFormula.id,
          pricingParams: p.pricingParams,
        },
      },
    });
    console.log(`  Product: ${p.name}`);
  }

  // 8. Migrate sign post products (base + sqft)
  for (const p of signPostProducts) {
    await prisma.product.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: p.slug } },
      update: {},
      create: {
        tenantId: tenant.id,
        slug: p.slug,
        name: p.name,
        description: p.description,
        category: p.category,
        pricingFormulaId: basePlusSqftFormula.id,
        pricingParams: {
          basePrice: p.pricingParams.basePrice,
          pricePerSqft: p.pricingParams.pricePerSqftSign,
          minOrderPrice: p.pricingParams.minOrderPrice,
        },
        productSchema: {
          name: p.name,
          slug: p.slug,
          description: p.description,
          category: p.category,
          options: [],
          rules: [],
          renderConfig: { pipeline: "part-assembly" as const, meshBindings: {} },
          pricingFormulaId: basePlusSqftFormula.id,
          pricingParams: p.pricingParams,
        },
      },
    });
    console.log(`  Product: ${p.name}`);
  }

  console.log("\nSeed complete!");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

- [ ] **Step 2: Add seed script to package.json**

Add to the `"scripts"` section of `package.json`:

```json
"seed": "npx ts-node --compiler-options '{\"module\":\"commonjs\"}' src/seed/default-tenant.ts"
```

- [ ] **Step 3: Commit**

```bash
git add src/seed/default-tenant.ts package.json
git commit -m "feat: add seed script to migrate existing products to schema-driven format"
```

---

## Task 10: Stripe Checkout API Route

**Files:**
- Create: `src/app/api/v1/checkout/route.ts`
- Create: `src/app/api/webhooks/stripe/route.ts`

- [ ] **Step 1: Create checkout session route**

```typescript
// src/app/api/v1/checkout/route.ts

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { resolveTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { evaluateFormulaDefinition } from "@/engine/schema-pricing";
import { getPresetFormula } from "@/engine/formula-presets";
import type { FormulaDefinition } from "@/engine/formula-types";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(request: NextRequest) {
  try {
    const tenant = await resolveTenant(request);
    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const body = await request.json();
    const { items, customerEmail, successUrl, cancelUrl } = body;

    if (!items?.length || !successUrl || !cancelUrl) {
      return NextResponse.json(
        { error: "items, successUrl, and cancelUrl are required" },
        { status: 400 },
      );
    }

    // Validate each item's price server-side
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    const orderItems: Array<{
      productId: string;
      configuration: Record<string, unknown>;
      quantity: number;
      unitPrice: number;
    }> = [];

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId, tenantId: tenant.id },
        include: { pricingFormula: true },
      });

      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${item.productId}` },
          { status: 400 },
        );
      }

      // Re-calculate price server-side (never trust client)
      let formulaDef: FormulaDefinition;
      if (product.pricingFormula?.type === "PRESET" && product.pricingFormula.presetId) {
        formulaDef = getPresetFormula(product.pricingFormula.presetId);
      } else if (product.pricingFormula?.formulaAst) {
        formulaDef = product.pricingFormula.formulaAst as unknown as FormulaDefinition;
      } else {
        return NextResponse.json(
          { error: `No pricing formula for product: ${product.name}` },
          { status: 400 },
        );
      }

      const pricingParams = (product.pricingParams as Record<string, number>) ?? {};
      const vars: Record<string, number> = {
        ...flattenNumericValues(item.optionValues ?? {}),
        ...pricingParams,
      };

      const breakdown = evaluateFormulaDefinition(formulaDef, vars);

      // Validate client price within 1% tolerance
      if (item.clientPrice !== undefined) {
        const diff = Math.abs(item.clientPrice - breakdown.total);
        if (diff > breakdown.total * 0.01) {
          return NextResponse.json(
            {
              error: "Price mismatch",
              clientPrice: item.clientPrice,
              serverPrice: breakdown.total,
            },
            { status: 400 },
          );
        }
      }

      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: `${product.name} - Custom Configuration`,
            description: item.description ?? product.description ?? undefined,
          },
          unit_amount: Math.round(breakdown.total * 100), // Stripe uses cents
        },
        quantity: item.quantity ?? 1,
      });

      orderItems.push({
        productId: product.id,
        configuration: item.optionValues ?? {},
        quantity: item.quantity ?? 1,
        unitPrice: breakdown.total,
      });
    }

    // Generate order number
    const orderCount = await prisma.order.count({ where: { tenantId: tenant.id } });
    const orderNumber = `GS-${new Date().getFullYear()}${String(orderCount + 1).padStart(4, "0")}`;

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
      metadata: {
        tenantId: tenant.id,
        orderNumber,
        orderItems: JSON.stringify(orderItems),
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
      orderNumber,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function flattenNumericValues(obj: Record<string, unknown>): Record<string, number> {
  const result: Record<string, number> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "number") result[key] = value;
    else if (typeof value === "string") {
      const num = parseFloat(value);
      if (!isNaN(num)) result[key] = num;
    } else if (typeof value === "boolean") {
      result[key] = value ? 1 : 0;
    }
  }
  return result;
}
```

- [ ] **Step 2: Create Stripe webhook handler**

```typescript
// src/app/api/webhooks/stripe/route.ts

import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const { tenantId, orderNumber, orderItems } = session.metadata ?? {};

    if (!tenantId || !orderNumber || !orderItems) {
      console.error("Missing metadata in checkout session");
      return NextResponse.json({ received: true });
    }

    const items = JSON.parse(orderItems) as Array<{
      productId: string;
      configuration: Record<string, unknown>;
      quantity: number;
      unitPrice: number;
    }>;

    const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);

    // Create order in database
    await prisma.order.create({
      data: {
        tenantId,
        orderNumber,
        userId: session.customer_email ?? "guest",
        status: "PAYMENT_RECEIVED",
        subtotal,
        total: subtotal,
        stripePaymentId: session.payment_intent as string,
        stripeSessionId: session.id,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            configuration: item.configuration,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.unitPrice * item.quantity,
          })),
        },
      },
    });

    console.log(`Order ${orderNumber} created for tenant ${tenantId}`);
  }

  return NextResponse.json({ received: true });
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/v1/checkout/route.ts src/app/api/webhooks/stripe/route.ts
git commit -m "feat: add Stripe checkout session and webhook handler"
```

---

## Task 11: Update Existing Tests — Ensure Nothing Breaks

**Files:**
- Modify: `src/engine/__tests__/channel-letter-pricing.test.ts` (if needed)

- [ ] **Step 1: Run all existing tests**

```bash
npx jest --no-cache
```

Expected: All 20 existing tests pass. The new schema-driven engine is additive — it does not modify any existing code.

- [ ] **Step 2: If any tests fail, fix them**

The only likely breakage is if the Prisma schema changes cause import issues. If so, regenerate:

```bash
npx prisma generate
```

- [ ] **Step 3: Run tests again to confirm**

```bash
npx jest --no-cache
```

Expected: ALL PASS (existing 20 + new schema pricing tests + preset tests + compat tests)

- [ ] **Step 4: Commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve test issues after schema migration"
```

---

## Summary

| Task | What It Builds | Tests |
|---|---|---|
| 1 | Formula AST + Product Schema types | (type-only, no tests needed) |
| 2 | AST evaluator | 9 unit tests |
| 3 | 12 preset formula templates | 5 preset tests |
| 4 | Backward-compatibility proof | 6 compat tests |
| 5 | Multi-tenant Prisma schema | Schema only |
| 6 | Tenant resolution middleware | — |
| 7 | Schema-driven pricing API (v1) | — |
| 8 | Product CRUD API (v1) | — |
| 9 | Seed script (migrate existing products) | — |
| 10 | Stripe checkout + webhook | — |
| 11 | Verify existing tests still pass | 20 existing tests |

**Total new tests:** ~20
**Total files created:** ~14
**Total files modified:** ~3
