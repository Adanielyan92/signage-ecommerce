"use client";

import { GripVertical, Trash2 } from "lucide-react";

export interface OptionDef {
  id: string;
  type: "text" | "number" | "select" | "color" | "toggle" | "font-picker";
  label: string;
  required: boolean;
  defaultValue: string;
  values: { value: string; label?: string }[];
  dependsOn: Record<string, string[]>;
}

const OPTION_TYPES: { value: OptionDef["type"]; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "select", label: "Select" },
  { value: "color", label: "Color" },
  { value: "toggle", label: "Toggle" },
  { value: "font-picker", label: "Font Picker" },
];

interface OptionEditorProps {
  option: OptionDef;
  onChange: (updated: OptionDef) => void;
  onDelete: () => void;
}

export function OptionEditor({ option, onChange, onDelete }: OptionEditorProps) {
  function update(patch: Partial<OptionDef>) {
    onChange({ ...option, ...patch });
  }

  // Values as comma-separated string for display/editing
  const valuesString = option.values.map((v) => v.value).join(", ");

  function handleValuesChange(raw: string) {
    const values = raw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((v) => ({ value: v }));
    update({ values });
  }

  return (
    <div className="rounded-lg border border-neutral-200 bg-white p-3">
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        <div className="mt-2 cursor-grab text-neutral-300">
          <GripVertical className="h-4 w-4" />
        </div>

        <div className="flex-1 space-y-3">
          {/* Row 1: label, type, default */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Label
              </label>
              <input
                type="text"
                value={option.label}
                onChange={(e) => update({ label: e.target.value })}
                placeholder="e.g. LED Color"
                className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Type
              </label>
              <select
                value={option.type}
                onChange={(e) =>
                  update({ type: e.target.value as OptionDef["type"] })
                }
                className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {OPTION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Default
              </label>
              <input
                type="text"
                value={option.defaultValue}
                onChange={(e) => update({ defaultValue: e.target.value })}
                placeholder="Default value"
                className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Values input — only when type is "select" */}
          {option.type === "select" && (
            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Values{" "}
                <span className="font-normal text-neutral-400">
                  (comma-separated)
                </span>
              </label>
              <input
                type="text"
                value={valuesString}
                onChange={(e) => handleValuesChange(e.target.value)}
                placeholder="e.g. 3000K, 6000K, RGB"
                className="w-full rounded-md border border-neutral-300 px-2.5 py-1.5 text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          )}

          {/* Required checkbox */}
          <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
            <input
              type="checkbox"
              checked={option.required}
              onChange={(e) => update({ required: e.target.checked })}
              className="h-3.5 w-3.5 rounded border-neutral-300 accent-blue-600"
            />
            Required
          </label>
        </div>

        {/* Delete button */}
        <button
          type="button"
          onClick={onDelete}
          className="mt-1 rounded-md p-1.5 text-neutral-400 transition hover:bg-red-50 hover:text-red-500"
          aria-label="Delete option"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
