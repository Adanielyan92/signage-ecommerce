import { evaluateFormula, evaluateCondition, evaluateFormulaDefinition } from "../schema-pricing";
import type {
  FormulaNode,
  FormulaDefinition,
  ConditionExpr,
} from "../formula-types";

// --- evaluateFormula ---

describe("evaluateFormula - literals and variables", () => {
  it("evaluates a literal node", () => {
    const node: FormulaNode = { type: "literal", value: 42 };
    expect(evaluateFormula(node, {})).toBe(42);
  });

  it("evaluates a variable node from the map", () => {
    const node: FormulaNode = { type: "variable", name: "height" };
    expect(evaluateFormula(node, { height: 24 })).toBe(24);
  });

  it("returns 0 for an unknown variable", () => {
    const node: FormulaNode = { type: "variable", name: "missing" };
    expect(evaluateFormula(node, {})).toBe(0);
  });
});

describe("evaluateFormula - binary operations", () => {
  const lit = (v: number): FormulaNode => ({ type: "literal", value: v });

  it("adds two literals", () => {
    const node: FormulaNode = { type: "binaryOp", op: "+", left: lit(10), right: lit(5) };
    expect(evaluateFormula(node, {})).toBe(15);
  });

  it("subtracts two literals", () => {
    const node: FormulaNode = { type: "binaryOp", op: "-", left: lit(10), right: lit(3) };
    expect(evaluateFormula(node, {})).toBe(7);
  });

  it("multiplies two literals", () => {
    const node: FormulaNode = { type: "binaryOp", op: "*", left: lit(4), right: lit(5) };
    expect(evaluateFormula(node, {})).toBe(20);
  });

  it("divides two literals", () => {
    const node: FormulaNode = { type: "binaryOp", op: "/", left: lit(10), right: lit(4) };
    expect(evaluateFormula(node, {})).toBe(2.5);
  });

  it("returns 0 for division by zero", () => {
    const node: FormulaNode = { type: "binaryOp", op: "/", left: lit(10), right: lit(0) };
    expect(evaluateFormula(node, {})).toBe(0);
  });

  it("returns min of two values", () => {
    const node: FormulaNode = { type: "binaryOp", op: "min", left: lit(3), right: lit(7) };
    expect(evaluateFormula(node, {})).toBe(3);
  });

  it("returns max of two values", () => {
    const node: FormulaNode = { type: "binaryOp", op: "max", left: lit(3), right: lit(7) };
    expect(evaluateFormula(node, {})).toBe(7);
  });

  it("evaluates nested binary ops", () => {
    // (2 + 3) * 4 = 20
    const node: FormulaNode = {
      type: "binaryOp",
      op: "*",
      left: { type: "binaryOp", op: "+", left: lit(2), right: lit(3) },
      right: lit(4),
    };
    expect(evaluateFormula(node, {})).toBe(20);
  });

  it("uses variable in binary op", () => {
    // height * pricePerInch
    const node: FormulaNode = {
      type: "binaryOp",
      op: "*",
      left: { type: "variable", name: "height" },
      right: { type: "variable", name: "pricePerInch" },
    };
    expect(evaluateFormula(node, { height: 24, pricePerInch: 16 })).toBe(384);
  });
});

describe("evaluateFormula - unary functions", () => {
  it("rounds a value", () => {
    const node: FormulaNode = { type: "unaryFn", fn: "round", arg: { type: "literal", value: 2.567 } };
    expect(evaluateFormula(node, {})).toBe(3);
  });

  it("ceils a value", () => {
    const node: FormulaNode = { type: "unaryFn", fn: "ceil", arg: { type: "literal", value: 2.1 } };
    expect(evaluateFormula(node, {})).toBe(3);
  });

  it("floors a value", () => {
    const node: FormulaNode = { type: "unaryFn", fn: "floor", arg: { type: "literal", value: 2.9 } };
    expect(evaluateFormula(node, {})).toBe(2);
  });

  it("takes absolute value", () => {
    const node: FormulaNode = { type: "unaryFn", fn: "abs", arg: { type: "literal", value: -5 } };
    expect(evaluateFormula(node, {})).toBe(5);
  });
});

describe("evaluateFormula - conditionals", () => {
  const lit = (v: number): FormulaNode => ({ type: "literal", value: v });

  it("returns then-branch when condition is true", () => {
    const node: FormulaNode = {
      type: "conditional",
      condition: { type: "compare", left: lit(5), op: ">", right: lit(3) },
      then: lit(100),
      else: lit(200),
    };
    expect(evaluateFormula(node, {})).toBe(100);
  });

  it("returns else-branch when condition is false", () => {
    const node: FormulaNode = {
      type: "conditional",
      condition: { type: "compare", left: lit(1), op: ">", right: lit(3) },
      then: lit(100),
      else: lit(200),
    };
    expect(evaluateFormula(node, {})).toBe(200);
  });
});

describe("evaluateFormula - multiplier chain", () => {
  const lit = (v: number): FormulaNode => ({ type: "literal", value: v });

  it("applies no multipliers when all conditions are false", () => {
    const node: FormulaNode = {
      type: "multiplierChain",
      base: lit(1000),
      multipliers: [
        {
          name: "rgb",
          reason: "RGB LED",
          factor: 1.1,
          condition: { type: "compare", left: { type: "variable", name: "isRgb" }, op: "==", right: lit(1) },
        },
      ],
    };
    expect(evaluateFormula(node, { isRgb: 0 })).toBe(1000);
  });

  it("applies a single multiplier when condition is true", () => {
    const node: FormulaNode = {
      type: "multiplierChain",
      base: lit(1000),
      multipliers: [
        {
          name: "rgb",
          reason: "RGB LED",
          factor: 1.1,
          condition: { type: "compare", left: { type: "variable", name: "isRgb" }, op: "==", right: lit(1) },
        },
      ],
    };
    expect(evaluateFormula(node, { isRgb: 1 })).toBeCloseTo(1100, 5);
  });

  it("applies multiple multipliers multiplicatively", () => {
    // 1000 * 1.1 * 1.2 = 1320
    const node: FormulaNode = {
      type: "multiplierChain",
      base: lit(1000),
      multipliers: [
        {
          name: "rgb",
          reason: "RGB LED",
          factor: 1.1,
          condition: { type: "compare", left: { type: "variable", name: "isRgb" }, op: "==", right: lit(1) },
        },
        {
          name: "curved",
          reason: "Curved font",
          factor: 1.2,
          condition: { type: "compare", left: { type: "variable", name: "isCurved" }, op: "==", right: lit(1) },
        },
      ],
    };
    expect(evaluateFormula(node, { isRgb: 1, isCurved: 1 })).toBeCloseTo(1320, 5);
  });
});

// --- evaluateCondition ---

describe("evaluateCondition", () => {
  const lit = (v: number): FormulaNode => ({ type: "literal", value: v });

  it("evaluates == comparison (true)", () => {
    const cond: ConditionExpr = { type: "compare", left: lit(5), op: "==", right: lit(5) };
    expect(evaluateCondition(cond, {})).toBe(true);
  });

  it("evaluates == comparison (false)", () => {
    const cond: ConditionExpr = { type: "compare", left: lit(5), op: "==", right: lit(6) };
    expect(evaluateCondition(cond, {})).toBe(false);
  });

  it("evaluates != comparison", () => {
    const cond: ConditionExpr = { type: "compare", left: lit(5), op: "!=", right: lit(6) };
    expect(evaluateCondition(cond, {})).toBe(true);
  });

  it("evaluates > comparison", () => {
    const cond: ConditionExpr = { type: "compare", left: lit(10), op: ">", right: lit(5) };
    expect(evaluateCondition(cond, {})).toBe(true);
  });

  it("evaluates < comparison", () => {
    const cond: ConditionExpr = { type: "compare", left: lit(3), op: "<", right: lit(5) };
    expect(evaluateCondition(cond, {})).toBe(true);
  });

  it("evaluates >= comparison (equal)", () => {
    const cond: ConditionExpr = { type: "compare", left: lit(5), op: ">=", right: lit(5) };
    expect(evaluateCondition(cond, {})).toBe(true);
  });

  it("evaluates <= comparison (less)", () => {
    const cond: ConditionExpr = { type: "compare", left: lit(4), op: "<=", right: lit(5) };
    expect(evaluateCondition(cond, {})).toBe(true);
  });

  it("evaluates and condition (all true)", () => {
    const cond: ConditionExpr = {
      type: "and",
      conditions: [
        { type: "compare", left: lit(1), op: "==", right: lit(1) },
        { type: "compare", left: lit(2), op: ">", right: lit(1) },
      ],
    };
    expect(evaluateCondition(cond, {})).toBe(true);
  });

  it("evaluates and condition (one false)", () => {
    const cond: ConditionExpr = {
      type: "and",
      conditions: [
        { type: "compare", left: lit(1), op: "==", right: lit(1) },
        { type: "compare", left: lit(1), op: ">", right: lit(5) },
      ],
    };
    expect(evaluateCondition(cond, {})).toBe(false);
  });

  it("evaluates or condition (one true)", () => {
    const cond: ConditionExpr = {
      type: "or",
      conditions: [
        { type: "compare", left: lit(1), op: "==", right: lit(99) },
        { type: "compare", left: lit(2), op: ">", right: lit(1) },
      ],
    };
    expect(evaluateCondition(cond, {})).toBe(true);
  });

  it("evaluates or condition (all false)", () => {
    const cond: ConditionExpr = {
      type: "or",
      conditions: [
        { type: "compare", left: lit(1), op: "==", right: lit(99) },
        { type: "compare", left: lit(1), op: ">", right: lit(5) },
      ],
    };
    expect(evaluateCondition(cond, {})).toBe(false);
  });
});

// --- evaluateFormulaDefinition ---

describe("evaluateFormulaDefinition", () => {
  const lit = (v: number): FormulaNode => ({ type: "literal", value: v });

  const makeSimpleDef = (overrides: Partial<FormulaDefinition> = {}): FormulaDefinition => ({
    id: "test-formula",
    name: "Test Formula",
    description: "Test",
    variables: [],
    formula: lit(1000),
    addOns: [],
    minOrderPrice: null,
    ...overrides,
  });

  it("returns basePrice from formula evaluation", () => {
    const def = makeSimpleDef({ formula: lit(1500) });
    const result = evaluateFormulaDefinition(def, {});
    expect(result.basePrice).toBe(1500);
  });

  it("subtotal equals base when no add-ons", () => {
    const def = makeSimpleDef({ formula: lit(1000) });
    const result = evaluateFormulaDefinition(def, {});
    expect(result.subtotal).toBe(1000);
    expect(result.total).toBe(1000);
    expect(result.minOrderApplied).toBe(false);
  });

  it("applies min order price when base is lower", () => {
    const def = makeSimpleDef({
      formula: lit(500),
      minOrderPrice: lit(1360),
    });
    const result = evaluateFormulaDefinition(def, {});
    expect(result.total).toBe(1360);
    expect(result.minOrderApplied).toBe(true);
  });

  it("does not apply min order price when base exceeds it", () => {
    const def = makeSimpleDef({
      formula: lit(2000),
      minOrderPrice: lit(1360),
    });
    const result = evaluateFormulaDefinition(def, {});
    expect(result.total).toBe(2000);
    expect(result.minOrderApplied).toBe(false);
  });

  it("includes add-on when condition is null (always)", () => {
    const def = makeSimpleDef({
      formula: lit(1000),
      addOns: [
        { name: "raceway", label: "Raceway", formula: lit(200), condition: null },
      ],
    });
    const result = evaluateFormulaDefinition(def, {});
    expect(result.lineItems).toHaveLength(1);
    expect(result.lineItems[0]).toMatchObject({ name: "raceway", label: "Raceway", amount: 200 });
    expect(result.subtotal).toBe(1200);
    expect(result.total).toBe(1200);
  });

  it("includes add-on when condition is true", () => {
    const def = makeSimpleDef({
      formula: lit(1000),
      addOns: [
        {
          name: "vinyl",
          label: "Vinyl Overlay",
          formula: lit(150),
          condition: { type: "compare", left: { type: "variable", name: "hasVinyl" }, op: "==", right: lit(1) },
        },
      ],
    });
    const result = evaluateFormulaDefinition(def, { hasVinyl: 1 });
    expect(result.lineItems).toHaveLength(1);
    expect(result.subtotal).toBe(1150);
  });

  it("excludes add-on when condition is false", () => {
    const def = makeSimpleDef({
      formula: lit(1000),
      addOns: [
        {
          name: "vinyl",
          label: "Vinyl Overlay",
          formula: lit(150),
          condition: { type: "compare", left: { type: "variable", name: "hasVinyl" }, op: "==", right: lit(1) },
        },
      ],
    });
    const result = evaluateFormulaDefinition(def, { hasVinyl: 0 });
    expect(result.lineItems).toHaveLength(0);
    expect(result.subtotal).toBe(1000);
  });

  it("includes multiple add-ons and sums them", () => {
    const def = makeSimpleDef({
      formula: lit(1000),
      addOns: [
        { name: "raceway", label: "Raceway", formula: lit(200), condition: null },
        { name: "vinyl", label: "Vinyl", formula: lit(100), condition: null },
      ],
    });
    const result = evaluateFormulaDefinition(def, {});
    expect(result.lineItems).toHaveLength(2);
    expect(result.subtotal).toBe(1300);
  });

  it("extracts applied multipliers from multiplierChain base formula", () => {
    const def = makeSimpleDef({
      formula: {
        type: "multiplierChain",
        base: lit(1000),
        multipliers: [
          {
            name: "rgb",
            reason: "RGB LED surcharge",
            factor: 1.1,
            condition: { type: "compare", left: { type: "variable", name: "isRgb" }, op: "==", right: lit(1) },
          },
          {
            name: "curved",
            reason: "Curved font surcharge",
            factor: 1.2,
            condition: { type: "compare", left: { type: "variable", name: "isCurved" }, op: "==", right: lit(1) },
          },
        ],
      },
    });
    const result = evaluateFormulaDefinition(def, { isRgb: 1, isCurved: 0 });
    expect(result.appliedMultipliers).toHaveLength(1);
    expect(result.appliedMultipliers[0]).toMatchObject({ name: "rgb", reason: "RGB LED surcharge", factor: 1.1 });
    expect(result.basePrice).toBeCloseTo(1100, 5);
    expect(result.priceAfterMultipliers).toBeCloseTo(1100, 5);
  });

  it("rounds monetary values to 2 decimal places in total", () => {
    const def = makeSimpleDef({
      formula: {
        type: "binaryOp",
        op: "*",
        left: lit(333),
        right: lit(3),
      },
    });
    const result = evaluateFormulaDefinition(def, {});
    // 333 * 3 = 999 — exact, but test fractional
    expect(Number.isFinite(result.total)).toBe(true);
  });

  it("rounds to 2 decimal places on fractional result", () => {
    // 10 / 3 = 3.3333...
    const def = makeSimpleDef({
      formula: { type: "binaryOp", op: "/", left: lit(10), right: lit(3) },
      minOrderPrice: null,
    });
    const result = evaluateFormulaDefinition(def, {});
    expect(result.total).toBe(3.33);
  });

  it("complete scenario: channel letter base + raceway + min order", () => {
    // letterCount=5, height=24, pricePerInch=16 → 5*24*16 = 1920
    // raceway: width * 50/12 = 60 * 50/12 = 250
    // total before min = 2170, min = 1360, so total = 2170
    const def: FormulaDefinition = {
      id: "front-lit",
      name: "Front-Lit Channel Letters",
      description: "Front-lit with trim cap",
      variables: [],
      formula: {
        type: "binaryOp",
        op: "*",
        left: {
          type: "binaryOp",
          op: "*",
          left: { type: "variable", name: "letterCount" },
          right: { type: "variable", name: "height" },
        },
        right: { type: "variable", name: "pricePerInch" },
      },
      addOns: [
        {
          name: "raceway",
          label: "Raceway",
          formula: {
            type: "binaryOp",
            op: "*",
            left: { type: "variable", name: "width" },
            right: { type: "binaryOp", op: "/", left: { type: "literal", value: 50 }, right: { type: "literal", value: 12 } },
          },
          condition: { type: "compare", left: { type: "variable", name: "hasRaceway" }, op: "==", right: { type: "literal", value: 1 } },
        },
      ],
      minOrderPrice: { type: "literal", value: 1360 },
    };

    const vars = { letterCount: 5, height: 24, pricePerInch: 16, width: 60, hasRaceway: 1 };
    const result = evaluateFormulaDefinition(def, vars);

    expect(result.basePrice).toBe(1920);
    expect(result.lineItems).toHaveLength(1);
    expect(result.lineItems[0].amount).toBeCloseTo(250, 5);
    expect(result.subtotal).toBeCloseTo(2170, 5);
    expect(result.total).toBeCloseTo(2170, 5);
    expect(result.minOrderApplied).toBe(false);
  });
});
