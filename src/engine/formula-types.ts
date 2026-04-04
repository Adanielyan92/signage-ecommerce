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

export interface FormulaDefinition {
  id: string;
  name: string;
  description: string;
  variables: FormulaVariable[];
  formula: FormulaNode;
  addOns: FormulaAddOn[];
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
  condition: ConditionExpr | null;
}
