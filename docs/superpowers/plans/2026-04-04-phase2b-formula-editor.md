# Phase 2B: Visual Formula Editor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a visual node-based formula editor for the admin dashboard that outputs valid `FormulaDefinition` ASTs. Admins drag variable, literal, operator, conditional, and multiplier nodes onto a canvas, connect them visually, and the editor serializes the graph into a `FormulaDefinition` JSON that `evaluateFormulaDefinition()` can execute.

**Architecture:** The editor lives at `/admin/formulas/[formulaId]/edit`. It is a full-page client component (`"use client"`) that fetches the formula via `GET /api/v1/formulas/:id`, provides a canvas-based node editor, a sidebar palette, a live preview panel, and saves back via `PATCH /api/v1/formulas/:id`. All editor state is managed with a dedicated Zustand store. The visual graph is an internal representation (`EditorNode[]` + `EditorConnection[]`) that gets serialized to a `FormulaDefinition` AST on save. No external graph libraries — nodes are positioned divs, connections are SVG paths.

**Tech Stack:** Next.js 16 App Router, Zustand, React, Tailwind CSS, SVG for connections, shadcn/ui (card, button, input, select, label, badge, separator, tooltip, scroll-area), lucide-react icons

---

## Scope

This plan covers:
1. Zustand store for the editor graph state (nodes, connections, drag state, selection)
2. AST serializer: convert visual graph to `FormulaDefinition` and deserializer for loading existing ASTs
3. Node canvas with drag positioning and SVG connection lines
4. Individual node components for each AST node type
5. Node palette sidebar with drag-to-add
6. Live preview panel with test variable inputs
7. Editor page at `/admin/formulas/[formulaId]/edit` with load/save
8. Link from formulas list page to the editor

NOT in this plan:
- Script formula editor (Phase 4)
- Undo/redo (can be added later as Zustand middleware)
- Copy/paste nodes
- Formula validation beyond what the AST serializer catches

---

## File Structure

### New files to create

```
src/components/admin/formula-editor/
├── types.ts                          # EditorNode, EditorConnection, port definitions
├── use-formula-editor-store.ts       # Zustand store for all editor state
├── ast-serializer.ts                 # EditorGraph → FormulaDefinition AST
├── ast-deserializer.ts               # FormulaDefinition AST → EditorGraph
├── formula-editor.tsx                # Main editor shell (canvas + palette + preview)
├── node-canvas.tsx                   # Canvas container with pan, zoom, SVG layer
├── formula-node.tsx                  # Renders a single EditorNode (type-specific UI)
├── node-palette.tsx                  # Sidebar listing node types to drag onto canvas
├── connection-lines.tsx              # SVG overlay drawing connections between ports
└── formula-preview.tsx               # Live evaluation panel with test variable inputs

src/app/admin/formulas/[formulaId]/
└── edit/
    └── page.tsx                      # Server component wrapper — loads formula, renders editor
```

### Files to modify

```
src/app/admin/formulas/page.tsx       # Add "Edit" link for VISUAL formulas + "New Visual Formula" button
```

---

## Task 1: Editor Types & Zustand Store

**Files:**
- Create: `src/components/admin/formula-editor/types.ts`
- Create: `src/components/admin/formula-editor/use-formula-editor-store.ts`

Define the internal graph representation and all editor state.

- [ ] **Step 1: Create editor type definitions**

```typescript
// src/components/admin/formula-editor/types.ts

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
```

- [ ] **Step 2: Create the Zustand store**

```typescript
// src/components/admin/formula-editor/use-formula-editor-store.ts
"use client";

import { create } from "zustand";
import type {
  EditorNode,
  EditorConnection,
  EditorGraph,
  EditorNodeData,
  Position,
  PortDirection,
} from "./types";
import { getPortsForNode } from "./types";

interface DragState {
  nodeId: string;
  offsetX: number;
  offsetY: number;
}

interface PendingConnection {
  fromNodeId: string;
  fromPortId: string;
}

interface FormulaVariable {
  name: string;
  label: string;
  source: "option" | "dimension" | "computed" | "param";
  description: string;
}

interface FormulaEditorState {
  // ── Graph data ───────────────────────────────
  nodes: EditorNode[];
  connections: EditorConnection[];

  // ── Formula metadata ─────────────────────────
  formulaId: string | null;
  formulaName: string;
  formulaDescription: string;
  variables: FormulaVariable[];

  // ── Interaction state ────────────────────────
  selectedNodeId: string | null;
  dragState: DragState | null;
  pendingConnection: PendingConnection | null;
  canvasOffset: Position;

  // ── Preview state ────────────────────────────
  testValues: Record<string, number>;
  previewResult: number | null;

  // ── Dirty tracking ───────────────────────────
  isDirty: boolean;
  isSaving: boolean;

  // ── Actions ──────────────────────────────────
  // Graph initialization
  loadGraph: (graph: EditorGraph, meta: {
    formulaId: string;
    name: string;
    description: string;
    variables: FormulaVariable[];
  }) => void;
  resetGraph: () => void;

  // Node operations
  addNode: (data: EditorNodeData, position: Position) => string;
  removeNode: (nodeId: string) => void;
  updateNodeData: (nodeId: string, data: Partial<EditorNodeData>) => void;
  moveNode: (nodeId: string, position: Position) => void;
  selectNode: (nodeId: string | null) => void;

  // Connection operations
  startConnection: (fromNodeId: string, fromPortId: string) => void;
  completeConnection: (toNodeId: string, toPortId: string) => void;
  cancelConnection: () => void;
  removeConnection: (connectionId: string) => void;

  // Drag operations
  startDrag: (nodeId: string, offsetX: number, offsetY: number) => void;
  endDrag: () => void;

  // Canvas operations
  panCanvas: (dx: number, dy: number) => void;

  // Metadata operations
  setFormulaName: (name: string) => void;
  setFormulaDescription: (desc: string) => void;
  addVariable: (variable: FormulaVariable) => void;
  removeVariable: (name: string) => void;
  updateVariable: (name: string, variable: Partial<FormulaVariable>) => void;

  // Preview
  setTestValue: (name: string, value: number) => void;
  setPreviewResult: (result: number | null) => void;

  // Save state
  setIsSaving: (saving: boolean) => void;
  markClean: () => void;
}

let nodeCounter = 0;
function generateNodeId(): string {
  nodeCounter += 1;
  return `node-${Date.now()}-${nodeCounter}`;
}

function generateConnectionId(): string {
  return `conn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Create a fresh output node (every graph has exactly one) */
function createOutputNode(): EditorNode {
  return {
    id: "output-root",
    position: { x: 700, y: 200 },
    data: { kind: "output" },
  };
}

const initialState = {
  nodes: [createOutputNode()],
  connections: [],
  formulaId: null,
  formulaName: "",
  formulaDescription: "",
  variables: [],
  selectedNodeId: null,
  dragState: null,
  pendingConnection: null,
  canvasOffset: { x: 0, y: 0 },
  testValues: {},
  previewResult: null,
  isDirty: false,
  isSaving: false,
};

export const useFormulaEditorStore = create<FormulaEditorState>()((set, get) => ({
  ...initialState,

  // ── Graph initialization ───────────────────────────

  loadGraph: (graph, meta) => {
    nodeCounter = graph.nodes.length + 1;
    set({
      nodes: graph.nodes,
      connections: graph.connections,
      formulaId: meta.formulaId,
      formulaName: meta.name,
      formulaDescription: meta.description,
      variables: meta.variables,
      selectedNodeId: null,
      dragState: null,
      pendingConnection: null,
      isDirty: false,
      isSaving: false,
      testValues: Object.fromEntries(meta.variables.map((v) => [v.name, 0])),
      previewResult: null,
    });
  },

  resetGraph: () => {
    nodeCounter = 0;
    set({ ...initialState, nodes: [createOutputNode()] });
  },

  // ── Node operations ────────────────────────────────

  addNode: (data, position) => {
    const id = generateNodeId();
    const node: EditorNode = { id, position, data };
    set((state) => ({
      nodes: [...state.nodes, node],
      isDirty: true,
    }));
    return id;
  },

  removeNode: (nodeId) => {
    // Cannot remove the output node
    if (nodeId === "output-root") return;
    set((state) => ({
      nodes: state.nodes.filter((n) => n.id !== nodeId),
      connections: state.connections.filter(
        (c) => c.fromNodeId !== nodeId && c.toNodeId !== nodeId
      ),
      selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
      isDirty: true,
    }));
  },

  updateNodeData: (nodeId, partialData) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, ...partialData } as EditorNodeData }
          : n
      ),
      isDirty: true,
    }));
  },

  moveNode: (nodeId, position) => {
    set((state) => ({
      nodes: state.nodes.map((n) =>
        n.id === nodeId ? { ...n, position } : n
      ),
    }));
  },

  selectNode: (nodeId) => {
    set({ selectedNodeId: nodeId });
  },

  // ── Connection operations ──────────────────────────

  startConnection: (fromNodeId, fromPortId) => {
    // Verify the port is an output
    const node = get().nodes.find((n) => n.id === fromNodeId);
    if (!node) return;
    const ports = getPortsForNode(node);
    const port = ports.find((p) => p.id === fromPortId);
    if (!port || port.direction !== "output") return;

    set({ pendingConnection: { fromNodeId, fromPortId } });
  },

  completeConnection: (toNodeId, toPortId) => {
    const { pendingConnection, connections, nodes } = get();
    if (!pendingConnection) return;

    // Verify the target port is an input
    const toNode = nodes.find((n) => n.id === toNodeId);
    if (!toNode) {
      set({ pendingConnection: null });
      return;
    }
    const ports = getPortsForNode(toNode);
    const port = ports.find((p) => p.id === toPortId);
    if (!port || port.direction !== "input") {
      set({ pendingConnection: null });
      return;
    }

    // Prevent self-connections
    if (pendingConnection.fromNodeId === toNodeId) {
      set({ pendingConnection: null });
      return;
    }

    // Remove any existing connection to this input port (only one source per input)
    const filtered = connections.filter(
      (c) => !(c.toNodeId === toNodeId && c.toPortId === toPortId)
    );

    const newConnection: EditorConnection = {
      id: generateConnectionId(),
      fromNodeId: pendingConnection.fromNodeId,
      fromPortId: pendingConnection.fromPortId,
      toNodeId,
      toPortId,
    };

    set({
      connections: [...filtered, newConnection],
      pendingConnection: null,
      isDirty: true,
    });
  },

  cancelConnection: () => {
    set({ pendingConnection: null });
  },

  removeConnection: (connectionId) => {
    set((state) => ({
      connections: state.connections.filter((c) => c.id !== connectionId),
      isDirty: true,
    }));
  },

  // ── Drag operations ────────────────────────────────

  startDrag: (nodeId, offsetX, offsetY) => {
    set({ dragState: { nodeId, offsetX, offsetY }, selectedNodeId: nodeId });
  },

  endDrag: () => {
    set({ dragState: null });
  },

  // ── Canvas operations ──────────────────────────────

  panCanvas: (dx, dy) => {
    set((state) => ({
      canvasOffset: {
        x: state.canvasOffset.x + dx,
        y: state.canvasOffset.y + dy,
      },
    }));
  },

  // ── Metadata operations ────────────────────────────

  setFormulaName: (name) => set({ formulaName: name, isDirty: true }),
  setFormulaDescription: (desc) => set({ formulaDescription: desc, isDirty: true }),

  addVariable: (variable) => {
    set((state) => ({
      variables: [...state.variables, variable],
      testValues: { ...state.testValues, [variable.name]: 0 },
      isDirty: true,
    }));
  },

  removeVariable: (name) => {
    set((state) => {
      const { [name]: _, ...rest } = state.testValues;
      return {
        variables: state.variables.filter((v) => v.name !== name),
        testValues: rest,
        isDirty: true,
      };
    });
  },

  updateVariable: (name, partial) => {
    set((state) => ({
      variables: state.variables.map((v) =>
        v.name === name ? { ...v, ...partial } : v
      ),
      isDirty: true,
    }));
  },

  // ── Preview ────────────────────────────────────────

  setTestValue: (name, value) => {
    set((state) => ({
      testValues: { ...state.testValues, [name]: value },
    }));
  },

  setPreviewResult: (result) => set({ previewResult: result }),

  // ── Save state ─────────────────────────────────────

  setIsSaving: (saving) => set({ isSaving: saving }),
  markClean: () => set({ isDirty: false }),
}));
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/formula-editor/types.ts src/components/admin/formula-editor/use-formula-editor-store.ts
git commit -m "feat(formula-editor): add editor types and Zustand store for visual formula editor"
```

---

## Task 2: AST Serializer & Deserializer

**Files:**
- Create: `src/components/admin/formula-editor/ast-serializer.ts`
- Create: `src/components/admin/formula-editor/ast-deserializer.ts`

The serializer converts the visual editor graph into a `FormulaDefinition` that `evaluateFormulaDefinition()` can process. The deserializer converts a `FormulaDefinition` back into an `EditorGraph` for loading saved formulas.

- [ ] **Step 1: Create the AST serializer**

```typescript
// src/components/admin/formula-editor/ast-serializer.ts

import type {
  FormulaNode,
  FormulaDefinition,
  FormulaVariable,
  ConditionExpr,
  ConditionalMultiplier,
} from "@/engine/formula-types";
import type { EditorNode, EditorConnection, EditorGraph } from "./types";

export class SerializationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SerializationError";
  }
}

/**
 * Serialize the visual editor graph into a FormulaDefinition AST.
 *
 * Traversal: starting from the "output-root" node, walk backwards through
 * connections to build the formula tree. Each input port on a node corresponds
 * to a child in the AST.
 */
export function serializeGraph(
  graph: EditorGraph,
  meta: {
    id: string;
    name: string;
    description: string;
    variables: FormulaVariable[];
  }
): FormulaDefinition {
  const nodeMap = new Map<string, EditorNode>(
    graph.nodes.map((n) => [n.id, n])
  );

  // Build a lookup: (toNodeId, toPortId) → fromNodeId
  const inputMap = new Map<string, string>();
  for (const conn of graph.connections) {
    inputMap.set(`${conn.toNodeId}:${conn.toPortId}`, conn.fromNodeId);
  }

  function resolveInput(nodeId: string, portId: string): EditorNode {
    const sourceNodeId = inputMap.get(`${nodeId}:${portId}`);
    if (!sourceNodeId) {
      const node = nodeMap.get(nodeId);
      const label = node?.data.kind ?? nodeId;
      throw new SerializationError(
        `Missing connection: "${label}" node's "${portId}" input is not connected.`
      );
    }
    const sourceNode = nodeMap.get(sourceNodeId);
    if (!sourceNode) {
      throw new SerializationError(`Node "${sourceNodeId}" not found in graph.`);
    }
    return sourceNode;
  }

  function nodeToFormula(node: EditorNode): FormulaNode {
    switch (node.data.kind) {
      case "variable":
        return { type: "variable", name: node.data.variableName };

      case "literal":
        return { type: "literal", value: node.data.value };

      case "binaryOp": {
        const leftNode = resolveInput(node.id, "left");
        const rightNode = resolveInput(node.id, "right");
        return {
          type: "binaryOp",
          op: node.data.op,
          left: nodeToFormula(leftNode),
          right: nodeToFormula(rightNode),
        };
      }

      case "unaryFn": {
        const argNode = resolveInput(node.id, "arg");
        return {
          type: "unaryFn",
          fn: node.data.fn,
          arg: nodeToFormula(argNode),
        };
      }

      case "conditional": {
        const condLeftNode = resolveInput(node.id, "condLeft");
        const condRightNode = resolveInput(node.id, "condRight");
        const thenNode = resolveInput(node.id, "then");
        const elseNode = resolveInput(node.id, "else");
        const condition: ConditionExpr = {
          type: "compare",
          left: nodeToFormula(condLeftNode),
          op: node.data.compareOp,
          right: nodeToFormula(condRightNode),
        };
        return {
          type: "conditional",
          condition,
          then: nodeToFormula(thenNode),
          else: nodeToFormula(elseNode),
        };
      }

      case "multiplierChain": {
        const baseNode = resolveInput(node.id, "base");
        const multipliers: ConditionalMultiplier[] = node.data.multipliers.map(
          (m) => ({
            name: m.name,
            reason: m.reason,
            factor: m.factor,
            condition: {
              type: "compare" as const,
              // Multiplier conditions compare a variable against literal 1
              // The variable name is stored in m.name
              left: { type: "variable" as const, name: m.name },
              op: m.compareOp,
              right: { type: "literal" as const, value: 1 },
            },
          })
        );
        return {
          type: "multiplierChain",
          base: nodeToFormula(baseNode),
          multipliers,
        };
      }

      case "output":
        throw new SerializationError("Output node should not appear as a formula source.");

      default:
        throw new SerializationError(`Unknown node kind: ${(node.data as { kind: string }).kind}`);
    }
  }

  // Find the output root
  const outputNode = graph.nodes.find((n) => n.data.kind === "output");
  if (!outputNode) {
    throw new SerializationError("No output node found in the graph.");
  }

  // Resolve the main formula input
  const formulaSourceId = inputMap.get(`${outputNode.id}:formula`);
  if (!formulaSourceId) {
    throw new SerializationError(
      'The output node\'s "Formula" input is not connected. Connect a node to it.'
    );
  }
  const formulaSourceNode = nodeMap.get(formulaSourceId);
  if (!formulaSourceNode) {
    throw new SerializationError("Formula source node not found.");
  }

  const formula = nodeToFormula(formulaSourceNode);

  // Resolve optional minOrderPrice input
  let minOrderPrice: FormulaNode | null = null;
  const minOrderSourceId = inputMap.get(`${outputNode.id}:minOrder`);
  if (minOrderSourceId) {
    const minOrderSourceNode = nodeMap.get(minOrderSourceId);
    if (minOrderSourceNode) {
      minOrderPrice = nodeToFormula(minOrderSourceNode);
    }
  }

  return {
    id: meta.id,
    name: meta.name,
    description: meta.description,
    variables: meta.variables,
    formula,
    addOns: [], // Add-ons can be added in a future iteration
    minOrderPrice,
  };
}
```

- [ ] **Step 2: Create the AST deserializer**

```typescript
// src/components/admin/formula-editor/ast-deserializer.ts

import type {
  FormulaNode,
  FormulaDefinition,
  FormulaVariable,
} from "@/engine/formula-types";
import type {
  EditorNode,
  EditorConnection,
  EditorGraph,
  EditorNodeData,
  Position,
  CompareOp,
  MultiplierEntry,
} from "./types";

let counter = 0;
function nextId(): string {
  counter += 1;
  return `node-deser-${counter}`;
}

function nextConnId(): string {
  counter += 1;
  return `conn-deser-${counter}`;
}

interface BuildResult {
  nodeId: string;
  nodes: EditorNode[];
  connections: EditorConnection[];
}

/**
 * Recursively convert a FormulaNode AST into editor nodes + connections.
 * Returns the root nodeId for this subtree and all generated nodes/connections.
 * Positions are laid out left-to-right; x decreases for deeper nodes.
 */
function formulaToNodes(
  ast: FormulaNode,
  baseX: number,
  baseY: number,
  yStep: number,
): BuildResult {
  const allNodes: EditorNode[] = [];
  const allConnections: EditorConnection[] = [];
  let currentY = baseY;

  function walk(node: FormulaNode, x: number, y: number): string {
    const id = nextId();

    switch (node.type) {
      case "variable": {
        allNodes.push({
          id,
          position: { x, y },
          data: { kind: "variable", variableName: node.name },
        });
        return id;
      }

      case "literal": {
        allNodes.push({
          id,
          position: { x, y },
          data: { kind: "literal", value: node.value },
        });
        return id;
      }

      case "binaryOp": {
        allNodes.push({
          id,
          position: { x, y },
          data: { kind: "binaryOp", op: node.op },
        });
        const leftId = walk(node.left, x - 220, y - yStep / 2);
        const rightId = walk(node.right, x - 220, y + yStep / 2);
        allConnections.push(
          { id: nextConnId(), fromNodeId: leftId, fromPortId: "out", toNodeId: id, toPortId: "left" },
          { id: nextConnId(), fromNodeId: rightId, fromPortId: "out", toNodeId: id, toPortId: "right" },
        );
        return id;
      }

      case "unaryFn": {
        allNodes.push({
          id,
          position: { x, y },
          data: { kind: "unaryFn", fn: node.fn },
        });
        const argId = walk(node.arg, x - 220, y);
        allConnections.push(
          { id: nextConnId(), fromNodeId: argId, fromPortId: "out", toNodeId: id, toPortId: "arg" },
        );
        return id;
      }

      case "conditional": {
        const cond = node.condition;
        let compareOp: CompareOp = ">";
        // Only support simple compare conditions for deserialization
        if (cond.type === "compare") {
          compareOp = cond.op;
        }

        allNodes.push({
          id,
          position: { x, y },
          data: { kind: "conditional", compareOp },
        });

        if (cond.type === "compare") {
          const condLeftId = walk(cond.left, x - 220, y - yStep);
          const condRightId = walk(cond.right, x - 220, y - yStep / 3);
          allConnections.push(
            { id: nextConnId(), fromNodeId: condLeftId, fromPortId: "out", toNodeId: id, toPortId: "condLeft" },
            { id: nextConnId(), fromNodeId: condRightId, fromPortId: "out", toNodeId: id, toPortId: "condRight" },
          );
        }

        const thenId = walk(node.then, x - 220, y + yStep / 3);
        const elseId = walk(node.else, x - 220, y + yStep);
        allConnections.push(
          { id: nextConnId(), fromNodeId: thenId, fromPortId: "out", toNodeId: id, toPortId: "then" },
          { id: nextConnId(), fromNodeId: elseId, fromPortId: "out", toNodeId: id, toPortId: "else" },
        );
        return id;
      }

      case "multiplierChain": {
        const multipliers: MultiplierEntry[] = node.multipliers.map((m, i) => ({
          id: `mult-${i}-${Date.now()}`,
          name: m.name,
          reason: m.reason,
          factor: m.factor,
          compareOp: m.condition.type === "compare" ? m.condition.op : (">" as CompareOp),
        }));

        allNodes.push({
          id,
          position: { x, y },
          data: { kind: "multiplierChain", multipliers },
        });

        const baseId = walk(node.base, x - 220, y);
        allConnections.push(
          { id: nextConnId(), fromNodeId: baseId, fromPortId: "out", toNodeId: id, toPortId: "base" },
        );
        return id;
      }

      default:
        // Fallback: treat as literal 0
        allNodes.push({
          id,
          position: { x, y },
          data: { kind: "literal", value: 0 },
        });
        return id;
    }
  }

  const rootId = walk(ast, baseX, baseY);
  return { nodeId: rootId, nodes: allNodes, connections: allConnections };
}

/**
 * Convert a full FormulaDefinition into an EditorGraph.
 */
export function deserializeFormula(def: FormulaDefinition): EditorGraph {
  counter = 0;

  const outputNode: EditorNode = {
    id: "output-root",
    position: { x: 700, y: 250 },
    data: { kind: "output" },
  };

  const allNodes: EditorNode[] = [outputNode];
  const allConnections: EditorConnection[] = [];

  // Deserialize the main formula tree
  const formulaResult = formulaToNodes(def.formula, 450, 200, 120);
  allNodes.push(...formulaResult.nodes);
  allConnections.push(...formulaResult.connections);
  allConnections.push({
    id: nextConnId(),
    fromNodeId: formulaResult.nodeId,
    fromPortId: "out",
    toNodeId: "output-root",
    toPortId: "formula",
  });

  // Deserialize minOrderPrice if present
  if (def.minOrderPrice) {
    const minResult = formulaToNodes(def.minOrderPrice, 450, 450, 80);
    allNodes.push(...minResult.nodes);
    allConnections.push(...minResult.connections);
    allConnections.push({
      id: nextConnId(),
      fromNodeId: minResult.nodeId,
      fromPortId: "out",
      toNodeId: "output-root",
      toPortId: "minOrder",
    });
  }

  return { nodes: allNodes, connections: allConnections };
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/formula-editor/ast-serializer.ts src/components/admin/formula-editor/ast-deserializer.ts
git commit -m "feat(formula-editor): add AST serializer and deserializer for graph ↔ FormulaDefinition conversion"
```

---

## Task 3: Connection Lines (SVG Overlay)

**Files:**
- Create: `src/components/admin/formula-editor/connection-lines.tsx`

Renders SVG bezier curves between connected ports. Uses a ref callback system where each port div registers its position.

- [ ] **Step 1: Create the SVG connection lines component**

```tsx
// src/components/admin/formula-editor/connection-lines.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useFormulaEditorStore } from "./use-formula-editor-store";

interface PortPosition {
  x: number;
  y: number;
}

/** Singleton registry: portKey → DOM element */
const portRegistry = new Map<string, HTMLDivElement>();

export function registerPort(nodeId: string, portId: string, el: HTMLDivElement | null) {
  const key = `${nodeId}:${portId}`;
  if (el) {
    portRegistry.set(key, el);
  } else {
    portRegistry.delete(key);
  }
}

function getPortCenter(nodeId: string, portId: string, canvasEl: HTMLElement | null): PortPosition | null {
  const key = `${nodeId}:${portId}`;
  const el = portRegistry.get(key);
  if (!el || !canvasEl) return null;

  const portRect = el.getBoundingClientRect();
  const canvasRect = canvasEl.getBoundingClientRect();
  return {
    x: portRect.left + portRect.width / 2 - canvasRect.left,
    y: portRect.top + portRect.height / 2 - canvasRect.top,
  };
}

function bezierPath(from: PortPosition, to: PortPosition): string {
  const dx = Math.abs(to.x - from.x) * 0.5;
  return `M ${from.x} ${from.y} C ${from.x + dx} ${from.y}, ${to.x - dx} ${to.y}, ${to.x} ${to.y}`;
}

interface ConnectionLinesProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

export function ConnectionLines({ canvasRef }: ConnectionLinesProps) {
  const connections = useFormulaEditorStore((s) => s.connections);
  const nodes = useFormulaEditorStore((s) => s.nodes);
  const pendingConnection = useFormulaEditorStore((s) => s.pendingConnection);
  const [mousePos, setMousePos] = useState<PortPosition | null>(null);
  const [, forceRender] = useState(0);

  // Force re-render when nodes move so lines update
  useEffect(() => {
    forceRender((n) => n + 1);
  }, [nodes]);

  // Track mouse for pending connection line
  useEffect(() => {
    if (!pendingConnection) {
      setMousePos(null);
      return;
    }

    function onMouseMove(e: MouseEvent) {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    }

    window.addEventListener("mousemove", onMouseMove);
    return () => window.removeEventListener("mousemove", onMouseMove);
  }, [pendingConnection, canvasRef]);

  const canvasEl = canvasRef.current;

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible">
      {/* Existing connections */}
      {connections.map((conn) => {
        const from = getPortCenter(conn.fromNodeId, conn.fromPortId, canvasEl);
        const to = getPortCenter(conn.toNodeId, conn.toPortId, canvasEl);
        if (!from || !to) return null;
        return (
          <path
            key={conn.id}
            d={bezierPath(from, to)}
            fill="none"
            stroke="#6366f1"
            strokeWidth={2}
            strokeLinecap="round"
          />
        );
      })}

      {/* Pending connection (dragging from port to mouse) */}
      {pendingConnection && mousePos && (() => {
        const from = getPortCenter(
          pendingConnection.fromNodeId,
          pendingConnection.fromPortId,
          canvasEl,
        );
        if (!from) return null;
        return (
          <path
            d={bezierPath(from, mousePos)}
            fill="none"
            stroke="#6366f1"
            strokeWidth={2}
            strokeDasharray="6 3"
            strokeLinecap="round"
            opacity={0.5}
          />
        );
      })()}
    </svg>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/formula-editor/connection-lines.tsx
git commit -m "feat(formula-editor): add SVG connection lines component with bezier curves"
```

---

## Task 4: Formula Node Component

**Files:**
- Create: `src/components/admin/formula-editor/formula-node.tsx`

Renders an individual node on the canvas with type-specific inputs and port handles.

- [ ] **Step 1: Create the formula node component**

```tsx
// src/components/admin/formula-editor/formula-node.tsx
"use client";

import { useCallback, useRef } from "react";
import {
  Variable,
  Hash,
  Calculator,
  FunctionSquare,
  GitBranch,
  Layers,
  CircleDot,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFormulaEditorStore } from "./use-formula-editor-store";
import { registerPort } from "./connection-lines";
import type {
  EditorNode,
  EditorNodeData,
  PortDef,
  BinaryOp,
  UnaryFn,
  CompareOp,
  MultiplierEntry,
} from "./types";
import { getPortsForNode } from "./types";

// ── Node appearance config ───────────────────────────

const NODE_STYLES: Record<
  EditorNodeData["kind"],
  { bg: string; border: string; icon: React.ElementType; label: string }
> = {
  variable:         { bg: "bg-teal-50",    border: "border-teal-200",    icon: Variable,        label: "Variable" },
  literal:          { bg: "bg-amber-50",   border: "border-amber-200",   icon: Hash,            label: "Number" },
  binaryOp:         { bg: "bg-blue-50",    border: "border-blue-200",    icon: Calculator,      label: "Operator" },
  unaryFn:          { bg: "bg-purple-50",  border: "border-purple-200",  icon: FunctionSquare,  label: "Function" },
  conditional:      { bg: "bg-orange-50",  border: "border-orange-200",  icon: GitBranch,       label: "Conditional" },
  multiplierChain:  { bg: "bg-pink-50",    border: "border-pink-200",    icon: Layers,          label: "Multiplier Chain" },
  output:           { bg: "bg-neutral-50", border: "border-neutral-300", icon: CircleDot,       label: "Output" },
};

const BINARY_OPS: { value: BinaryOp; label: string }[] = [
  { value: "+", label: "Add (+)" },
  { value: "-", label: "Subtract (-)" },
  { value: "*", label: "Multiply (*)" },
  { value: "/", label: "Divide (/)" },
  { value: "min", label: "Min" },
  { value: "max", label: "Max" },
];

const UNARY_FNS: { value: UnaryFn; label: string }[] = [
  { value: "round", label: "Round" },
  { value: "ceil", label: "Ceil" },
  { value: "floor", label: "Floor" },
  { value: "abs", label: "Abs" },
];

const COMPARE_OPS: { value: CompareOp; label: string }[] = [
  { value: "==", label: "==" },
  { value: "!=", label: "!=" },
  { value: ">", label: ">" },
  { value: "<", label: "<" },
  { value: ">=", label: ">=" },
  { value: "<=", label: "<=" },
];

// ── Port Handle ──────────────────────────────────────

function PortHandle({
  nodeId,
  port,
}: {
  nodeId: string;
  port: PortDef;
}) {
  const startConnection = useFormulaEditorStore((s) => s.startConnection);
  const completeConnection = useFormulaEditorStore((s) => s.completeConnection);
  const pendingConnection = useFormulaEditorStore((s) => s.pendingConnection);

  const isInput = port.direction === "input";
  const isOutput = port.direction === "output";

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isOutput && !pendingConnection) {
        startConnection(nodeId, port.id);
      } else if (isInput && pendingConnection) {
        completeConnection(nodeId, port.id);
      }
    },
    [nodeId, port.id, isOutput, isInput, pendingConnection, startConnection, completeConnection]
  );

  return (
    <div
      className={cn(
        "flex items-center gap-1.5",
        isInput ? "flex-row" : "flex-row-reverse"
      )}
    >
      <div
        ref={(el) => registerPort(nodeId, port.id, el)}
        onMouseDown={handleClick}
        className={cn(
          "h-3 w-3 shrink-0 cursor-pointer rounded-full border-2 transition-colors",
          isInput
            ? "border-blue-400 bg-white hover:bg-blue-100"
            : "border-indigo-400 bg-indigo-100 hover:bg-indigo-200",
          pendingConnection && isInput && "ring-2 ring-indigo-300 ring-offset-1"
        )}
        title={`${port.direction}: ${port.label}`}
      />
      <span className="select-none text-[10px] text-neutral-500">
        {port.label}
      </span>
    </div>
  );
}

// ── Node Body (type-specific controls) ───────────────

function NodeBody({ node }: { node: EditorNode }) {
  const updateNodeData = useFormulaEditorStore((s) => s.updateNodeData);
  const variables = useFormulaEditorStore((s) => s.variables);

  switch (node.data.kind) {
    case "variable":
      return (
        <select
          value={node.data.variableName}
          onChange={(e) =>
            updateNodeData(node.id, { variableName: e.target.value } as Partial<EditorNodeData>)
          }
          className="w-full rounded border border-neutral-200 bg-white px-2 py-1 text-xs"
        >
          {variables.length === 0 && (
            <option value="">No variables defined</option>
          )}
          {variables.map((v) => (
            <option key={v.name} value={v.name}>
              {v.label} ({v.name})
            </option>
          ))}
        </select>
      );

    case "literal":
      return (
        <input
          type="number"
          value={node.data.value}
          onChange={(e) =>
            updateNodeData(node.id, {
              value: parseFloat(e.target.value) || 0,
            } as Partial<EditorNodeData>)
          }
          className="w-full rounded border border-neutral-200 bg-white px-2 py-1 text-xs tabular-nums"
          step="any"
        />
      );

    case "binaryOp":
      return (
        <select
          value={node.data.op}
          onChange={(e) =>
            updateNodeData(node.id, { op: e.target.value } as Partial<EditorNodeData>)
          }
          className="w-full rounded border border-neutral-200 bg-white px-2 py-1 text-xs"
        >
          {BINARY_OPS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );

    case "unaryFn":
      return (
        <select
          value={node.data.fn}
          onChange={(e) =>
            updateNodeData(node.id, { fn: e.target.value } as Partial<EditorNodeData>)
          }
          className="w-full rounded border border-neutral-200 bg-white px-2 py-1 text-xs"
        >
          {UNARY_FNS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      );

    case "conditional":
      return (
        <div className="space-y-1">
          <span className="text-[10px] text-neutral-400">Compare op:</span>
          <select
            value={node.data.compareOp}
            onChange={(e) =>
              updateNodeData(node.id, { compareOp: e.target.value } as Partial<EditorNodeData>)
            }
            className="w-full rounded border border-neutral-200 bg-white px-2 py-1 text-xs"
          >
            {COMPARE_OPS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      );

    case "multiplierChain": {
      const addMultiplier = () => {
        const newMult: MultiplierEntry = {
          id: `mult-${Date.now()}`,
          name: "",
          reason: "",
          factor: 1.0,
          compareOp: "==",
        };
        updateNodeData(node.id, {
          multipliers: [...node.data.multipliers, newMult],
        } as Partial<EditorNodeData>);
      };

      const updateMultiplier = (idx: number, partial: Partial<MultiplierEntry>) => {
        const updated = node.data.multipliers.map((m, i) =>
          i === idx ? { ...m, ...partial } : m
        );
        updateNodeData(node.id, { multipliers: updated } as Partial<EditorNodeData>);
      };

      const removeMultiplier = (idx: number) => {
        const updated = node.data.multipliers.filter((_, i) => i !== idx);
        updateNodeData(node.id, { multipliers: updated } as Partial<EditorNodeData>);
      };

      return (
        <div className="space-y-2">
          {node.data.multipliers.map((m, i) => (
            <div key={m.id} className="space-y-1 rounded border border-neutral-200 bg-white p-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-neutral-600">
                  #{i + 1}
                </span>
                <button
                  onClick={() => removeMultiplier(i)}
                  className="text-neutral-400 hover:text-red-500"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
              <input
                placeholder="Name"
                value={m.name}
                onChange={(e) => updateMultiplier(i, { name: e.target.value })}
                className="w-full rounded border border-neutral-200 px-1.5 py-0.5 text-[10px]"
              />
              <input
                placeholder="Reason"
                value={m.reason}
                onChange={(e) => updateMultiplier(i, { reason: e.target.value })}
                className="w-full rounded border border-neutral-200 px-1.5 py-0.5 text-[10px]"
              />
              <div className="flex gap-1">
                <select
                  value={m.compareOp}
                  onChange={(e) => updateMultiplier(i, { compareOp: e.target.value as CompareOp })}
                  className="rounded border border-neutral-200 px-1 py-0.5 text-[10px]"
                >
                  {COMPARE_OPS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  step="0.01"
                  value={m.factor}
                  onChange={(e) => updateMultiplier(i, { factor: parseFloat(e.target.value) || 1 })}
                  className="w-16 rounded border border-neutral-200 px-1 py-0.5 text-[10px] tabular-nums"
                  placeholder="Factor"
                />
              </div>
            </div>
          ))}
          <button
            onClick={addMultiplier}
            className="w-full rounded border border-dashed border-neutral-300 py-1 text-[10px] text-neutral-500 hover:border-neutral-400 hover:text-neutral-700"
          >
            + Add Multiplier
          </button>
        </div>
      );
    }

    case "output":
      return (
        <p className="text-[10px] text-neutral-400">
          Connect formula result and optional minimum order price.
        </p>
      );

    default:
      return null;
  }
}

// ── Main FormulaNode component ───────────────────────

interface FormulaNodeProps {
  node: EditorNode;
}

export function FormulaNodeComponent({ node }: FormulaNodeProps) {
  const style = NODE_STYLES[node.data.kind];
  const Icon = style.icon;
  const ports = getPortsForNode(node);
  const inputPorts = ports.filter((p) => p.direction === "input");
  const outputPorts = ports.filter((p) => p.direction === "output");

  const selectedNodeId = useFormulaEditorStore((s) => s.selectedNodeId);
  const selectNode = useFormulaEditorStore((s) => s.selectNode);
  const removeNode = useFormulaEditorStore((s) => s.removeNode);
  const startDrag = useFormulaEditorStore((s) => s.startDrag);
  const cancelConnection = useFormulaEditorStore((s) => s.cancelConnection);

  const isSelected = selectedNodeId === node.id;
  const isOutput = node.data.kind === "output";

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      // Only start drag from the header area
      if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
      e.preventDefault();
      e.stopPropagation();
      cancelConnection();
      selectNode(node.id);
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      startDrag(node.id, e.clientX - rect.left, e.clientY - rect.top);
    },
    [node.id, selectNode, startDrag, cancelConnection]
  );

  return (
    <div
      className={cn(
        "absolute w-48 rounded-lg border shadow-sm transition-shadow",
        style.bg,
        style.border,
        isSelected && "ring-2 ring-indigo-400 ring-offset-1 shadow-md"
      )}
      style={{
        left: node.position.x,
        top: node.position.y,
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        e.stopPropagation();
        selectNode(node.id);
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200/50 px-3 py-1.5">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-neutral-500" />
          <span className="text-xs font-semibold text-neutral-700">
            {style.label}
          </span>
        </div>
        {!isOutput && (
          <button
            data-no-drag
            onClick={(e) => {
              e.stopPropagation();
              removeNode(node.id);
            }}
            className="rounded p-0.5 text-neutral-400 hover:bg-neutral-200/50 hover:text-red-500"
          >
            <X className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Body */}
      <div className="px-3 py-2" data-no-drag>
        <NodeBody node={node} />
      </div>

      {/* Ports */}
      <div className="flex justify-between border-t border-neutral-200/50 px-3 py-1.5">
        {/* Input ports (left side) */}
        <div className="flex flex-col gap-1">
          {inputPorts.map((port) => (
            <PortHandle key={port.id} nodeId={node.id} port={port} />
          ))}
        </div>

        {/* Output ports (right side) */}
        <div className="flex flex-col items-end gap-1">
          {outputPorts.map((port) => (
            <PortHandle key={port.id} nodeId={node.id} port={port} />
          ))}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/formula-editor/formula-node.tsx
git commit -m "feat(formula-editor): add FormulaNode component with type-specific controls and port handles"
```

---

## Task 5: Node Canvas & Node Palette

**Files:**
- Create: `src/components/admin/formula-editor/node-canvas.tsx`
- Create: `src/components/admin/formula-editor/node-palette.tsx`

The canvas hosts all nodes and handles mouse events for dragging and panning. The palette is a sidebar listing available node types.

- [ ] **Step 1: Create the node canvas**

```tsx
// src/components/admin/formula-editor/node-canvas.tsx
"use client";

import { useCallback, useEffect, useRef } from "react";
import { useFormulaEditorStore } from "./use-formula-editor-store";
import { FormulaNodeComponent } from "./formula-node";
import { ConnectionLines } from "./connection-lines";
import type { EditorNodeData, Position } from "./types";

interface NodeCanvasProps {
  canvasRef: React.RefObject<HTMLDivElement | null>;
}

export function NodeCanvas({ canvasRef }: NodeCanvasProps) {
  const nodes = useFormulaEditorStore((s) => s.nodes);
  const dragState = useFormulaEditorStore((s) => s.dragState);
  const canvasOffset = useFormulaEditorStore((s) => s.canvasOffset);
  const moveNode = useFormulaEditorStore((s) => s.moveNode);
  const endDrag = useFormulaEditorStore((s) => s.endDrag);
  const selectNode = useFormulaEditorStore((s) => s.selectNode);
  const cancelConnection = useFormulaEditorStore((s) => s.cancelConnection);
  const addNode = useFormulaEditorStore((s) => s.addNode);

  // Handle mouse move for dragging nodes
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragState || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left - canvasOffset.x - dragState.offsetX;
      const y = e.clientY - rect.top - canvasOffset.y - dragState.offsetY;
      moveNode(dragState.nodeId, { x, y });
    },
    [dragState, canvasOffset, moveNode, canvasRef]
  );

  const handleMouseUp = useCallback(() => {
    if (dragState) {
      endDrag();
    }
  }, [dragState, endDrag]);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  // Handle canvas click to deselect / cancel pending connection
  const handleCanvasClick = useCallback(() => {
    selectNode(null);
    cancelConnection();
  }, [selectNode, cancelConnection]);

  // Handle drop from palette
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const json = e.dataTransfer.getData("application/formula-node");
      if (!json || !canvasRef.current) return;

      const data = JSON.parse(json) as EditorNodeData;
      const rect = canvasRef.current.getBoundingClientRect();
      const position: Position = {
        x: e.clientX - rect.left - canvasOffset.x - 96, // center the 192px-wide node
        y: e.clientY - rect.top - canvasOffset.y - 20,
      };

      addNode(data, position);
    },
    [addNode, canvasOffset, canvasRef]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  }, []);

  return (
    <div
      ref={canvasRef}
      className="relative h-full w-full overflow-hidden bg-[#fafafa]"
      onClick={handleCanvasClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      style={{
        backgroundImage:
          "radial-gradient(circle, #d4d4d8 1px, transparent 1px)",
        backgroundSize: "24px 24px",
        backgroundPosition: `${canvasOffset.x}px ${canvasOffset.y}px`,
      }}
    >
      {/* SVG connections layer */}
      <ConnectionLines canvasRef={canvasRef} />

      {/* Nodes layer */}
      <div
        style={{
          transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px)`,
        }}
      >
        {nodes.map((node) => (
          <FormulaNodeComponent key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create the node palette**

```tsx
// src/components/admin/formula-editor/node-palette.tsx
"use client";

import { useCallback } from "react";
import {
  Variable,
  Hash,
  Calculator,
  FunctionSquare,
  GitBranch,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { PALETTE_ITEMS } from "./types";
import type { EditorNodeData, EditorNodeKind } from "./types";

const ICONS: Record<EditorNodeKind, React.ElementType> = {
  variable: Variable,
  literal: Hash,
  binaryOp: Calculator,
  unaryFn: FunctionSquare,
  conditional: GitBranch,
  multiplierChain: Layers,
  output: Variable, // Not shown in palette
};

const COLORS: Record<EditorNodeKind, string> = {
  variable:         "border-teal-200 bg-teal-50 hover:bg-teal-100",
  literal:          "border-amber-200 bg-amber-50 hover:bg-amber-100",
  binaryOp:         "border-blue-200 bg-blue-50 hover:bg-blue-100",
  unaryFn:          "border-purple-200 bg-purple-50 hover:bg-purple-100",
  conditional:      "border-orange-200 bg-orange-50 hover:bg-orange-100",
  multiplierChain:  "border-pink-200 bg-pink-50 hover:bg-pink-100",
  output:           "border-neutral-200 bg-neutral-50",
};

export function NodePalette() {
  const handleDragStart = useCallback(
    (e: React.DragEvent, data: EditorNodeData) => {
      e.dataTransfer.setData(
        "application/formula-node",
        JSON.stringify(data)
      );
      e.dataTransfer.effectAllowed = "copy";
    },
    []
  );

  return (
    <div className="flex flex-col gap-2 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Nodes
      </h3>
      <p className="text-[10px] text-neutral-400">
        Drag a node onto the canvas
      </p>
      <div className="mt-1 flex flex-col gap-1.5">
        {PALETTE_ITEMS.map((item) => {
          const Icon = ICONS[item.kind];
          return (
            <div
              key={item.kind}
              draggable
              onDragStart={(e) => handleDragStart(e, item.defaultData)}
              className={cn(
                "flex cursor-grab items-center gap-2 rounded-lg border px-3 py-2 transition-colors active:cursor-grabbing",
                COLORS[item.kind]
              )}
            >
              <Icon className="h-4 w-4 shrink-0 text-neutral-500" />
              <div>
                <p className="text-xs font-medium text-neutral-700">
                  {item.label}
                </p>
                <p className="text-[10px] leading-tight text-neutral-400">
                  {item.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/admin/formula-editor/node-canvas.tsx src/components/admin/formula-editor/node-palette.tsx
git commit -m "feat(formula-editor): add node canvas with drag/drop and palette sidebar"
```

---

## Task 6: Live Preview Panel

**Files:**
- Create: `src/components/admin/formula-editor/formula-preview.tsx`

Shows test variable inputs and the live computed result using the existing `evaluateFormulaDefinition()` function.

- [ ] **Step 1: Create the formula preview component**

```tsx
// src/components/admin/formula-editor/formula-preview.tsx
"use client";

import { useEffect, useMemo, useCallback } from "react";
import { Play, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPrice } from "@/lib/utils";
import { useFormulaEditorStore } from "./use-formula-editor-store";
import { serializeGraph, SerializationError } from "./ast-serializer";
import { evaluateFormulaDefinition } from "@/engine/schema-pricing";

export function FormulaPreview() {
  const nodes = useFormulaEditorStore((s) => s.nodes);
  const connections = useFormulaEditorStore((s) => s.connections);
  const variables = useFormulaEditorStore((s) => s.variables);
  const testValues = useFormulaEditorStore((s) => s.testValues);
  const setTestValue = useFormulaEditorStore((s) => s.setTestValue);
  const formulaId = useFormulaEditorStore((s) => s.formulaId);
  const formulaName = useFormulaEditorStore((s) => s.formulaName);
  const formulaDescription = useFormulaEditorStore((s) => s.formulaDescription);
  const setPreviewResult = useFormulaEditorStore((s) => s.setPreviewResult);
  const previewResult = useFormulaEditorStore((s) => s.previewResult);

  // Attempt to serialize and evaluate on every change
  const evaluation = useMemo(() => {
    try {
      const ast = serializeGraph(
        { nodes, connections },
        {
          id: formulaId ?? "preview",
          name: formulaName,
          description: formulaDescription,
          variables,
        }
      );
      const result = evaluateFormulaDefinition(ast, testValues);
      return { ok: true as const, result, error: null };
    } catch (err) {
      const message =
        err instanceof SerializationError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Unknown error";
      return { ok: false as const, result: null, error: message };
    }
  }, [nodes, connections, testValues, formulaId, formulaName, formulaDescription, variables]);

  // Sync preview result to store
  useEffect(() => {
    setPreviewResult(evaluation.ok ? evaluation.result.total : null);
  }, [evaluation, setPreviewResult]);

  return (
    <div className="flex flex-col gap-4 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        Live Preview
      </h3>

      {/* Test variable inputs */}
      {variables.length > 0 ? (
        <div className="flex flex-col gap-2">
          {variables.map((v) => (
            <div key={v.name}>
              <label className="mb-0.5 block text-[10px] font-medium text-neutral-500">
                {v.label}
                <span className="ml-1 text-neutral-300">({v.name})</span>
              </label>
              <input
                type="number"
                value={testValues[v.name] ?? 0}
                onChange={(e) =>
                  setTestValue(v.name, parseFloat(e.target.value) || 0)
                }
                className="w-full rounded border border-neutral-200 bg-white px-2 py-1 text-xs tabular-nums"
                step="any"
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[10px] text-neutral-400">
          Add variables in the formula metadata to test values here.
        </p>
      )}

      {/* Result display */}
      <div
        className={cn(
          "rounded-lg border p-3",
          evaluation.ok
            ? "border-green-200 bg-green-50"
            : "border-amber-200 bg-amber-50"
        )}
      >
        {evaluation.ok ? (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Play className="h-3.5 w-3.5 text-green-600" />
              <span className="text-xs font-medium text-green-700">
                Result
              </span>
            </div>
            <p className="text-lg font-bold tabular-nums text-green-900">
              {formatPrice(evaluation.result.total)}
            </p>
            {evaluation.result.minOrderApplied && (
              <p className="text-[10px] text-green-600">
                Minimum order price applied
              </p>
            )}
            {/* Breakdown */}
            <div className="mt-2 space-y-0.5 border-t border-green-200 pt-2">
              <div className="flex justify-between text-[10px] text-green-700">
                <span>Base price</span>
                <span className="tabular-nums">
                  {formatPrice(evaluation.result.basePrice)}
                </span>
              </div>
              {evaluation.result.appliedMultipliers.map((m, i) => (
                <div
                  key={i}
                  className="flex justify-between text-[10px] text-green-600"
                >
                  <span>{m.reason || m.name}</span>
                  <span className="tabular-nums">{m.factor}x</span>
                </div>
              ))}
              {evaluation.result.lineItems.map((item, i) => (
                <div
                  key={i}
                  className="flex justify-between text-[10px] text-green-700"
                >
                  <span>{item.label}</span>
                  <span className="tabular-nums">
                    {formatPrice(item.amount)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between border-t border-green-200 pt-1 text-xs font-semibold text-green-800">
                <span>Total</span>
                <span className="tabular-nums">
                  {formatPrice(evaluation.result.total)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-xs font-medium text-amber-700">
                Incomplete
              </span>
            </div>
            <p className="text-[10px] leading-relaxed text-amber-600">
              {evaluation.error}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/formula-editor/formula-preview.tsx
git commit -m "feat(formula-editor): add live preview panel with test values and price breakdown"
```

---

## Task 7: Main Editor Shell

**Files:**
- Create: `src/components/admin/formula-editor/formula-editor.tsx`

The top-level client component that combines the canvas, palette, and preview into a cohesive editor UI with a toolbar for saving and metadata editing.

- [ ] **Step 1: Create the main formula editor component**

```tsx
// src/components/admin/formula-editor/formula-editor.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Save, ArrowLeft, Plus, Trash2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFormulaEditorStore } from "./use-formula-editor-store";
import { NodeCanvas } from "./node-canvas";
import { NodePalette } from "./node-palette";
import { FormulaPreview } from "./formula-preview";
import { serializeGraph, SerializationError } from "./ast-serializer";
import { deserializeFormula } from "./ast-deserializer";
import type { FormulaDefinition, FormulaVariable } from "@/engine/formula-types";

interface FormulaEditorProps {
  formulaId: string;
  initialFormula: {
    id: string;
    name: string;
    description: string | null;
    type: string;
    formulaAst: FormulaDefinition | null;
  };
}

export function FormulaEditor({ formulaId, initialFormula }: FormulaEditorProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLDivElement>(null);

  const loadGraph = useFormulaEditorStore((s) => s.loadGraph);
  const nodes = useFormulaEditorStore((s) => s.nodes);
  const connections = useFormulaEditorStore((s) => s.connections);
  const formulaName = useFormulaEditorStore((s) => s.formulaName);
  const formulaDescription = useFormulaEditorStore((s) => s.formulaDescription);
  const variables = useFormulaEditorStore((s) => s.variables);
  const isDirty = useFormulaEditorStore((s) => s.isDirty);
  const isSaving = useFormulaEditorStore((s) => s.isSaving);
  const setIsSaving = useFormulaEditorStore((s) => s.setIsSaving);
  const markClean = useFormulaEditorStore((s) => s.markClean);
  const setFormulaName = useFormulaEditorStore((s) => s.setFormulaName);
  const setFormulaDescription = useFormulaEditorStore((s) => s.setFormulaDescription);
  const addVariable = useFormulaEditorStore((s) => s.addVariable);
  const removeVariable = useFormulaEditorStore((s) => s.removeVariable);
  const updateVariable = useFormulaEditorStore((s) => s.updateVariable);

  const [saveError, setSaveError] = useState<string | null>(null);
  const [activePanel, setActivePanel] = useState<"palette" | "preview" | "variables">("palette");

  // Load formula on mount
  useEffect(() => {
    if (initialFormula.formulaAst) {
      const ast = initialFormula.formulaAst;
      const graph = deserializeFormula(ast);
      loadGraph(graph, {
        formulaId,
        name: initialFormula.name,
        description: initialFormula.description ?? "",
        variables: ast.variables ?? [],
      });
    } else {
      // Fresh formula — just set metadata
      loadGraph(
        { nodes: [{ id: "output-root", position: { x: 700, y: 200 }, data: { kind: "output" } }], connections: [] },
        {
          formulaId,
          name: initialFormula.name,
          description: initialFormula.description ?? "",
          variables: [],
        }
      );
    }
  }, [formulaId, initialFormula, loadGraph]);

  // Save handler
  const handleSave = useCallback(async () => {
    setSaveError(null);
    setIsSaving(true);

    try {
      const ast = serializeGraph(
        { nodes, connections },
        {
          id: formulaId,
          name: formulaName,
          description: formulaDescription,
          variables,
        }
      );

      const res = await fetch(`/api/v1/formulas/${formulaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formulaName,
          description: formulaDescription,
          type: "VISUAL",
          formulaAst: ast,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Save failed (${res.status})`);
      }

      markClean();
    } catch (err) {
      const message =
        err instanceof SerializationError
          ? err.message
          : err instanceof Error
          ? err.message
          : "Save failed";
      setSaveError(message);
    } finally {
      setIsSaving(false);
    }
  }, [nodes, connections, formulaId, formulaName, formulaDescription, variables, setIsSaving, markClean]);

  // Warn on unsaved changes
  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  // Add new variable
  const handleAddVariable = useCallback(() => {
    const count = variables.length + 1;
    addVariable({
      name: `var${count}`,
      label: `Variable ${count}`,
      source: "param",
      description: "",
    });
  }, [variables.length, addVariable]);

  return (
    <div className="flex h-screen flex-col">
      {/* ── Toolbar ────────────────────────────────── */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b bg-white px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin/formulas")}
            className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-700"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <input
              value={formulaName}
              onChange={(e) => setFormulaName(e.target.value)}
              className="border-none bg-transparent text-sm font-semibold text-neutral-900 outline-none focus:ring-0"
              placeholder="Formula name"
            />
            <input
              value={formulaDescription}
              onChange={(e) => setFormulaDescription(e.target.value)}
              className="block border-none bg-transparent text-xs text-neutral-400 outline-none focus:ring-0"
              placeholder="Description"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {saveError && (
            <span className="text-xs text-red-600">{saveError}</span>
          )}
          {isDirty && (
            <span className="text-[10px] text-neutral-400">Unsaved changes</span>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              isSaving
                ? "bg-neutral-100 text-neutral-400"
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            )}
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save
          </button>
        </div>
      </div>

      {/* ── Main area ──────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left sidebar */}
        <div className="flex w-64 shrink-0 flex-col border-r bg-white">
          {/* Panel tabs */}
          <div className="flex border-b">
            {(["palette", "variables", "preview"] as const).map((panel) => (
              <button
                key={panel}
                onClick={() => setActivePanel(panel)}
                className={cn(
                  "flex-1 py-2 text-[10px] font-semibold uppercase tracking-wide transition-colors",
                  activePanel === panel
                    ? "border-b-2 border-indigo-500 text-indigo-600"
                    : "text-neutral-400 hover:text-neutral-600"
                )}
              >
                {panel}
              </button>
            ))}
          </div>

          {/* Panel content */}
          <div className="flex-1 overflow-y-auto">
            {activePanel === "palette" && <NodePalette />}

            {activePanel === "variables" && (
              <div className="flex flex-col gap-3 p-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Variables
                  </h3>
                  <button
                    onClick={handleAddVariable}
                    className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>

                {variables.length === 0 && (
                  <p className="text-[10px] text-neutral-400">
                    No variables yet. Add one to start building your formula.
                  </p>
                )}

                {variables.map((v, i) => (
                  <div
                    key={v.name}
                    className="space-y-1.5 rounded-lg border border-neutral-200 bg-neutral-50 p-2"
                  >
                    <div className="flex items-center justify-between">
                      <input
                        value={v.name}
                        onChange={(e) =>
                          updateVariable(v.name, { name: e.target.value })
                        }
                        className="w-20 rounded border border-neutral-200 px-1.5 py-0.5 font-mono text-[10px]"
                        placeholder="name"
                      />
                      <button
                        onClick={() => removeVariable(v.name)}
                        className="rounded p-0.5 text-neutral-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <input
                      value={v.label}
                      onChange={(e) =>
                        updateVariable(v.name, { label: e.target.value })
                      }
                      className="w-full rounded border border-neutral-200 px-1.5 py-0.5 text-[10px]"
                      placeholder="Label"
                    />
                    <select
                      value={v.source}
                      onChange={(e) =>
                        updateVariable(v.name, {
                          source: e.target.value as FormulaVariable["source"],
                        })
                      }
                      className="w-full rounded border border-neutral-200 px-1 py-0.5 text-[10px]"
                    >
                      <option value="param">Param</option>
                      <option value="dimension">Dimension</option>
                      <option value="computed">Computed</option>
                      <option value="option">Option</option>
                    </select>
                    <input
                      value={v.description}
                      onChange={(e) =>
                        updateVariable(v.name, {
                          description: e.target.value,
                        })
                      }
                      className="w-full rounded border border-neutral-200 px-1.5 py-0.5 text-[10px]"
                      placeholder="Description"
                    />
                  </div>
                ))}
              </div>
            )}

            {activePanel === "preview" && <FormulaPreview />}
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1">
          <NodeCanvas canvasRef={canvasRef} />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/admin/formula-editor/formula-editor.tsx
git commit -m "feat(formula-editor): add main editor shell with toolbar, sidebar panels, and canvas"
```

---

## Task 8: Editor Page & Formulas List Integration

**Files:**
- Create: `src/app/admin/formulas/[formulaId]/edit/page.tsx`
- Modify: `src/app/admin/formulas/page.tsx`

Wire up the server component page that loads the formula and renders the editor, and add "Edit" links plus a "New Visual Formula" button to the formulas list.

- [ ] **Step 1: Create the editor page**

```tsx
// src/app/admin/formulas/[formulaId]/edit/page.tsx

import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { FormulaEditor } from "@/components/admin/formula-editor/formula-editor";
import type { FormulaDefinition } from "@/engine/formula-types";

export const metadata = {
  title: "Edit Formula — Admin | GatSoft Signs",
};

export default async function EditFormulaPage({
  params,
}: {
  params: Promise<{ formulaId: string }>;
}) {
  const admin = await requireAdmin();
  const { formulaId } = await params;

  const formula = await prisma.pricingFormula.findFirst({
    where: { id: formulaId, tenantId: admin.tenantId },
  });

  if (!formula) {
    notFound();
  }

  const initialFormula = {
    id: formula.id,
    name: formula.name,
    description: formula.description,
    type: formula.type,
    formulaAst: formula.formulaAst as FormulaDefinition | null,
  };

  return <FormulaEditor formulaId={formulaId} initialFormula={initialFormula} />;
}
```

- [ ] **Step 2: Update the formulas list page**

In `src/app/admin/formulas/page.tsx`, make the following changes:

**a)** Add imports at the top of the file:

```typescript
import Link from "next/link";
import { Plus, Pencil } from "lucide-react";
```

**b)** After the closing `</div>` of the header section (line ~55, the `<div>` containing the `<h1>` and `<p>` tags), add a "New Visual Formula" button. Replace the header `<div>` block:

Find:
```tsx
      <div>
        <h1 className="text-2xl font-semibold text-neutral-900">
          Pricing Formulas
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {formulas.length} configured formula
          {formulas.length !== 1 ? "s" : ""} · {presets.length} available
          presets
        </p>
      </div>
```

Replace with:
```tsx
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-900">
            Pricing Formulas
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            {formulas.length} configured formula
            {formulas.length !== 1 ? "s" : ""} · {presets.length} available
            presets
          </p>
        </div>
        <form action={createVisualFormula}>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            New Visual Formula
          </button>
        </form>
      </div>
```

**c)** Add a server action inside the page component (before the `return` statement) for creating a new visual formula and redirecting to the editor:

After the `const [formulas, presets] = await Promise.all([...])` block, add:

```typescript
  async function createVisualFormula() {
    "use server";
    const { prisma: db } = await import("@/lib/prisma");
    const { redirect } = await import("next/navigation");

    const newFormula = await db.pricingFormula.create({
      data: {
        tenantId: admin.tenantId,
        name: `Custom Formula ${Date.now().toString(36).slice(-4)}`,
        type: "VISUAL",
        description: "Visual formula created in the editor",
      },
    });

    redirect(`/admin/formulas/${newFormula.id}/edit`);
  }
```

**d)** In the formula table row (the `<tr>` that renders each formula), add an "Edit" link in the Name cell. Replace the name `<td>`:

Find:
```tsx
                      <td className="px-4 py-3 font-medium text-neutral-900">
                        {formula.name}
                        {formula.description && (
                          <p className="mt-0.5 text-xs font-normal text-neutral-400">
                            {formula.description}
                          </p>
                        )}
                      </td>
```

Replace with:
```tsx
                      <td className="px-4 py-3 font-medium text-neutral-900">
                        <div className="flex items-center gap-2">
                          <span>{formula.name}</span>
                          {formula.type === "VISUAL" && (
                            <Link
                              href={`/admin/formulas/${formula.id}/edit`}
                              className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-indigo-600 hover:bg-indigo-50"
                            >
                              <Pencil className="h-3 w-3" />
                              Edit
                            </Link>
                          )}
                        </div>
                        {formula.description && (
                          <p className="mt-0.5 text-xs font-normal text-neutral-400">
                            {formula.description}
                          </p>
                        )}
                      </td>
```

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/formulas/[formulaId]/edit/page.tsx src/app/admin/formulas/page.tsx
git commit -m "feat(formula-editor): add editor page route and integrate with formulas list"
```

---

## Verification Checklist

After all tasks are complete, verify:

- [ ] `npm run build` passes without errors
- [ ] Navigate to `/admin/formulas` — see the "New Visual Formula" button
- [ ] Click "New Visual Formula" — redirects to the editor page
- [ ] Drag nodes from the palette onto the canvas
- [ ] Connect node output ports to input ports via click
- [ ] Configure node values (variable names, literal numbers, operators)
- [ ] Switch to "Variables" tab — add/edit/remove formula variables
- [ ] Switch to "Preview" tab — see live evaluation with test values
- [ ] Click "Save" — formula is persisted to database as `formulaAst` JSON
- [ ] Reload the page — formula loads back from saved AST
- [ ] Back on `/admin/formulas`, VISUAL formulas show an "Edit" link
