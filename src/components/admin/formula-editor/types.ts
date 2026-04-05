/** Position on the canvas */
export interface Position {
  x: number;
  y: number;
}

/** Port direction */
export type PortDirection = "input" | "output";

/** Port definition on a node */
export interface PortDef {
  id: string;
  label: string;
  direction: PortDirection;
}

/** The kind of each editor node — maps to FormulaNode types + extras */
export type EditorNodeKind =
  | "variable"
  | "literal"
  | "binaryOp"
  | "unaryFn"
  | "conditional"
  | "multiplierChain"
  | "output";    // Special: the root output node (exactly one per graph)

/** Binary operator choices */
export type BinaryOp = "+" | "-" | "*" | "/" | "min" | "max";

/** Unary function choices */
export type UnaryFn = "round" | "ceil" | "floor" | "abs";

/** Compare operator choices */
export type CompareOp = "==" | "!=" | ">" | "<" | ">=" | "<=";

/** Data stored per-node based on kind */
export interface VariableNodeData {
  kind: "variable";
  variableName: string;
}

export interface LiteralNodeData {
  kind: "literal";
  value: number;
}

export interface BinaryOpNodeData {
  kind: "binaryOp";
  op: BinaryOp;
}

export interface UnaryFnNodeData {
  kind: "unaryFn";
  fn: UnaryFn;
}

export interface ConditionalNodeData {
  kind: "conditional";
  compareOp: CompareOp;
}

export interface MultiplierEntry {
  id: string;
  name: string;
  reason: string;
  factor: number;
  compareOp: CompareOp;
}

export interface MultiplierChainNodeData {
  kind: "multiplierChain";
  multipliers: MultiplierEntry[];
}

export interface OutputNodeData {
  kind: "output";
}

export type EditorNodeData =
  | VariableNodeData
  | LiteralNodeData
  | BinaryOpNodeData
  | UnaryFnNodeData
  | ConditionalNodeData
  | MultiplierChainNodeData
  | OutputNodeData;

/** A node on the editor canvas */
export interface EditorNode {
  id: string;
  position: Position;
  data: EditorNodeData;
}

/** A connection between an output port of one node and an input port of another */
export interface EditorConnection {
  id: string;
  fromNodeId: string;
  fromPortId: string;
  toNodeId: string;
  toPortId: string;
}

/** The full editor graph */
export interface EditorGraph {
  nodes: EditorNode[];
  connections: EditorConnection[];
}

// ---------------------------------------------------------------------------
// Port schemas for each node kind
// ---------------------------------------------------------------------------

export function getPortsForNode(node: EditorNode): PortDef[] {
  switch (node.data.kind) {
    case "variable":
      return [{ id: "out", label: "Value", direction: "output" }];

    case "literal":
      return [{ id: "out", label: "Value", direction: "output" }];

    case "binaryOp":
      return [
        { id: "left", label: "Left", direction: "input" },
        { id: "right", label: "Right", direction: "input" },
        { id: "out", label: "Result", direction: "output" },
      ];

    case "unaryFn":
      return [
        { id: "arg", label: "Input", direction: "input" },
        { id: "out", label: "Result", direction: "output" },
      ];

    case "conditional":
      return [
        { id: "condLeft", label: "If (left)", direction: "input" },
        { id: "condRight", label: "If (right)", direction: "input" },
        { id: "then", label: "Then", direction: "input" },
        { id: "else", label: "Else", direction: "input" },
        { id: "out", label: "Result", direction: "output" },
      ];

    case "multiplierChain":
      // Base input + one input per multiplier condition left/right
      // For simplicity: just base input, multiplier conditions reference variables by name
      return [
        { id: "base", label: "Base", direction: "input" },
        { id: "out", label: "Result", direction: "output" },
      ];

    case "output":
      return [
        { id: "formula", label: "Formula", direction: "input" },
        { id: "minOrder", label: "Min Order", direction: "input" },
      ];

    default:
      return [];
  }
}

// ---------------------------------------------------------------------------
// Node palette definitions
// ---------------------------------------------------------------------------

export interface PaletteItem {
  kind: EditorNodeKind;
  label: string;
  description: string;
  defaultData: EditorNodeData;
}

export const PALETTE_ITEMS: PaletteItem[] = [
  {
    kind: "variable",
    label: "Variable",
    description: "References a named variable (height, letterCount, etc.)",
    defaultData: { kind: "variable", variableName: "height" },
  },
  {
    kind: "literal",
    label: "Number",
    description: "A constant numeric value",
    defaultData: { kind: "literal", value: 0 },
  },
  {
    kind: "binaryOp",
    label: "Operator",
    description: "Math operation: +, -, *, /, min, max",
    defaultData: { kind: "binaryOp", op: "*" },
  },
  {
    kind: "unaryFn",
    label: "Function",
    description: "Round, ceil, floor, or abs",
    defaultData: { kind: "unaryFn", fn: "round" },
  },
  {
    kind: "conditional",
    label: "Conditional",
    description: "If/then/else based on a comparison",
    defaultData: { kind: "conditional", compareOp: ">" },
  },
  {
    kind: "multiplierChain",
    label: "Multiplier Chain",
    description: "Apply conditional multipliers to a base value",
    defaultData: { kind: "multiplierChain", multipliers: [] },
  },
];
