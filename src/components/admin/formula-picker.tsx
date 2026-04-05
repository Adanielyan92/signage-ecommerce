"use client";

interface TenantFormula {
  id: string;
  name: string;
  type: string;
  presetId: string | null;
}

interface Preset {
  id: string;
  name: string;
  description: string;
}

interface FormulaPickerProps {
  value: string | null;
  onChange: (formulaId: string | null) => void;
  tenantFormulas: TenantFormula[];
  presets: Preset[];
  onCreateFromPreset: (presetId: string, presetName: string) => void;
}

export function FormulaPicker({
  value,
  onChange,
  tenantFormulas,
  presets,
  onCreateFromPreset,
}: FormulaPickerProps) {
  return (
    <div className="space-y-4">
      {/* Existing formula selector */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-neutral-700">
          Assigned Formula
        </label>
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        >
          <option value="">— None —</option>
          {tenantFormulas.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} ({f.type})
            </option>
          ))}
        </select>
      </div>

      {/* Preset cards */}
      {presets.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-neutral-500">
            Or create a new formula from a preset:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => onCreateFromPreset(preset.id, preset.name)}
                className="rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-left transition hover:border-blue-400 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <p className="text-sm font-medium text-neutral-900">
                  {preset.name}
                </p>
                <p className="mt-0.5 line-clamp-2 text-xs text-neutral-500">
                  {preset.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
