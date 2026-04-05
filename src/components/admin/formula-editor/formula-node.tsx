"use client";

import { useCallback } from "react";
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

// -- Node appearance config --

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

// -- Port Handle --

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

// -- Node Body (type-specific controls) --

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

// -- Main FormulaNode component --

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
