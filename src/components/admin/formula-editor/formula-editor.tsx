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
      {/* -- Toolbar -- */}
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

      {/* -- Main area -- */}
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

                {variables.map((v) => (
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
