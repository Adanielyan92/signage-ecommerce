"use client";

import { create } from "zustand";
import type {
  EditorNode,
  EditorConnection,
  EditorGraph,
  EditorNodeData,
  Position,
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
  // -- Graph data --
  nodes: EditorNode[];
  connections: EditorConnection[];

  // -- Formula metadata --
  formulaId: string | null;
  formulaName: string;
  formulaDescription: string;
  variables: FormulaVariable[];

  // -- Interaction state --
  selectedNodeId: string | null;
  dragState: DragState | null;
  pendingConnection: PendingConnection | null;
  canvasOffset: Position;

  // -- Preview state --
  testValues: Record<string, number>;
  previewResult: number | null;

  // -- Dirty tracking --
  isDirty: boolean;
  isSaving: boolean;

  // -- Actions --
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
  connections: [] as EditorConnection[],
  formulaId: null as string | null,
  formulaName: "",
  formulaDescription: "",
  variables: [] as FormulaVariable[],
  selectedNodeId: null as string | null,
  dragState: null as DragState | null,
  pendingConnection: null as PendingConnection | null,
  canvasOffset: { x: 0, y: 0 },
  testValues: {} as Record<string, number>,
  previewResult: null as number | null,
  isDirty: false,
  isSaving: false,
};

export const useFormulaEditorStore = create<FormulaEditorState>()((set, get) => ({
  ...initialState,

  // -- Graph initialization --

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

  // -- Node operations --

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

  // -- Connection operations --

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

  // -- Drag operations --

  startDrag: (nodeId, offsetX, offsetY) => {
    set({ dragState: { nodeId, offsetX, offsetY }, selectedNodeId: nodeId });
  },

  endDrag: () => {
    set({ dragState: null });
  },

  // -- Canvas operations --

  panCanvas: (dx, dy) => {
    set((state) => ({
      canvasOffset: {
        x: state.canvasOffset.x + dx,
        y: state.canvasOffset.y + dy,
      },
    }));
  },

  // -- Metadata operations --

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

  // -- Preview --

  setTestValue: (name, value) => {
    set((state) => ({
      testValues: { ...state.testValues, [name]: value },
    }));
  },

  setPreviewResult: (result) => set({ previewResult: result }),

  // -- Save state --

  setIsSaving: (saving) => set({ isSaving: saving }),
  markClean: () => set({ isDirty: false }),
}));
