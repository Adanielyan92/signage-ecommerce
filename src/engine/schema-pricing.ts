import type {
  FormulaNode,
  FormulaDefinition,
  ConditionExpr,
  ConditionalMultiplier,
  MultiplierChainNode,
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

export type VariableMap = Record<string, number>;

/** Round to 2 decimal places */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

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
      const arg = evaluateFormula(node.arg, vars);
      switch (node.fn) {
        case "round": return Math.round(arg);
        case "ceil":  return Math.ceil(arg);
        case "floor": return Math.floor(arg);
        case "abs":   return Math.abs(arg);
      }
      break;
    }

    case "conditional": {
      const met = evaluateCondition(node.condition, vars);
      return evaluateFormula(met ? node.then : node.else, vars);
    }

    case "multiplierChain": {
      let value = evaluateFormula(node.base, vars);
      for (const m of node.multipliers) {
        if (evaluateCondition(m.condition, vars)) {
          value *= m.factor;
        }
      }
      return value;
    }
  }

  // Should be unreachable with correct types, but satisfy TS
  return 0;
}

export function evaluateCondition(cond: ConditionExpr, vars: VariableMap): boolean {
  switch (cond.type) {
    case "compare": {
      const left = evaluateFormula(cond.left, vars);
      const right = evaluateFormula(cond.right, vars);
      switch (cond.op) {
        case "==": return left === right;
        case "!=": return left !== right;
        case ">":  return left > right;
        case "<":  return left < right;
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

/** Extract applied multipliers from a MultiplierChainNode (if the formula root is one). */
function extractAppliedMultipliers(
  node: FormulaNode,
  vars: VariableMap,
): { name: string; reason: string; factor: number }[] {
  if (node.type !== "multiplierChain") return [];
  return node.multipliers
    .filter((m) => evaluateCondition(m.condition, vars))
    .map(({ name, reason, factor }) => ({ name, reason, factor }));
}

export function evaluateFormulaDefinition(
  def: FormulaDefinition,
  vars: VariableMap,
): SchemaPriceBreakdown {
  // 1. Evaluate base formula
  const rawBase = evaluateFormula(def.formula, vars);
  const basePrice = round2(rawBase);

  // 2. Extract applied multipliers (only if formula root is a multiplierChain)
  const appliedMultipliers = extractAppliedMultipliers(def.formula, vars);
  const priceAfterMultipliers = basePrice;

  // 3. Evaluate add-on line items
  const lineItems: { name: string; label: string; amount: number }[] = [];
  for (const addOn of def.addOns) {
    const included = addOn.condition === null || evaluateCondition(addOn.condition, vars);
    if (included) {
      lineItems.push({
        name: addOn.name,
        label: addOn.label,
        amount: round2(evaluateFormula(addOn.formula, vars)),
      });
    }
  }

  // 4. Subtotal = basePrice + add-ons
  const addOnsTotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const subtotal = round2(basePrice + addOnsTotal);

  // 5. Apply min order price
  let total = subtotal;
  let minOrderApplied = false;
  if (def.minOrderPrice !== null) {
    const minOrder = round2(evaluateFormula(def.minOrderPrice, vars));
    if (subtotal < minOrder) {
      total = minOrder;
      minOrderApplied = true;
    }
  }

  total = round2(total);

  return {
    basePrice,
    appliedMultipliers,
    priceAfterMultipliers,
    lineItems,
    subtotal,
    total,
    minOrderApplied,
  };
}
