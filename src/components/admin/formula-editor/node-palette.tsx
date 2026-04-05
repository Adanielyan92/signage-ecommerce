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
