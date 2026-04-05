"use client";

import { Plus } from "lucide-react";
import { OptionEditor } from "./option-editor";
import type { OptionDef } from "./option-editor";

interface OptionBuilderProps {
  options: OptionDef[];
  onChange: (options: OptionDef[]) => void;
}

function generateId(): string {
  return `opt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function OptionBuilder({ options, onChange }: OptionBuilderProps) {
  function addOption() {
    const newOption: OptionDef = {
      id: generateId(),
      type: "text",
      label: "",
      required: false,
      defaultValue: "",
      values: [],
      dependsOn: {},
    };
    onChange([...options, newOption]);
  }

  function updateOption(index: number, updated: OptionDef) {
    const next = [...options];
    next[index] = updated;
    onChange(next);
  }

  function deleteOption(index: number) {
    onChange(options.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-neutral-700">
          Options{" "}
          <span className="ml-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
            {options.length}
          </span>
        </p>
        <button
          type="button"
          onClick={addOption}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Option
        </button>
      </div>

      {/* Empty state */}
      {options.length === 0 && (
        <div className="rounded-lg border border-dashed border-neutral-300 py-8 text-center">
          <p className="text-sm text-neutral-400">
            No options yet. Add one to get started.
          </p>
        </div>
      )}

      {/* Option list */}
      {options.map((option, index) => (
        <OptionEditor
          key={option.id}
          option={option}
          onChange={(updated) => updateOption(index, updated)}
          onDelete={() => deleteOption(index)}
        />
      ))}
    </div>
  );
}
