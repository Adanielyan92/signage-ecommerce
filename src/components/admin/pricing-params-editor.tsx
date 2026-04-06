"use client";

interface FormulaVariable {
  name: string;
  label: string;
  source: string;
  description: string;
}

interface PricingParamsEditorProps {
  params: Record<string, number>;
  onChange: (params: Record<string, number>) => void;
  variables: FormulaVariable[];
}

export function PricingParamsEditor({
  params,
  onChange,
  variables,
}: PricingParamsEditorProps) {
  const paramVars = variables.filter((v) => v.source === "param");

  if (paramVars.length === 0) {
    return (
      <p className="text-sm text-neutral-400 italic">
        No configurable parameters for this formula.
      </p>
    );
  }

  function handleChange(name: string, value: string) {
    const num = value === "" ? 0 : parseFloat(value);
    onChange({ ...params, [name]: isNaN(num) ? 0 : num });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {paramVars.map((v) => (
        <div key={v.name}>
          <label className="mb-1.5 block text-sm font-medium text-neutral-700">
            {v.label}
          </label>
          <input
            type="number"
            step="any"
            value={params[v.name] ?? ""}
            onChange={(e) => handleChange(v.name, e.target.value)}
            placeholder="0"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm text-neutral-900 tabular-nums placeholder-neutral-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          {v.description && (
            <p className="mt-1 text-xs text-neutral-400">{v.description}</p>
          )}
        </div>
      ))}
    </div>
  );
}
