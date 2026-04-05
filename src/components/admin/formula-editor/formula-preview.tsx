"use client";

import { useEffect, useMemo } from "react";
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
