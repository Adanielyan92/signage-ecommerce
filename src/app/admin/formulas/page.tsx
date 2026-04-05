import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getAllPresetFormulas } from "@/engine/formula-presets";

export const metadata = {
  title: "Pricing Formulas — Admin | GatSoft Signs",
};

const TYPE_BADGE: Record<string, { label: string; className: string }> = {
  PRESET: {
    label: "Preset",
    className: "bg-blue-50 text-blue-700",
  },
  VISUAL: {
    label: "Visual",
    className: "bg-violet-50 text-violet-700",
  },
  SCRIPT: {
    label: "Script",
    className: "bg-amber-50 text-amber-700",
  },
};

const SOURCE_BADGE: Record<string, string> = {
  param:     "bg-neutral-100 text-neutral-600",
  dimension: "bg-sky-50 text-sky-700",
  computed:  "bg-teal-50 text-teal-700",
  option:    "bg-purple-50 text-purple-700",
};

export default async function AdminFormulasPage() {
  const admin = await requireAdmin();

  const [formulas, presets] = await Promise.all([
    prisma.pricingFormula.findMany({
      where: { tenantId: admin.tenantId },
      include: { _count: { select: { products: true } } },
      orderBy: [{ type: "asc" }, { name: "asc" }],
    }),
    Promise.resolve(getAllPresetFormulas()),
  ]);

  return (
    <div className="space-y-10">
      {/* ── Header ──────────────────────────────────── */}
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

      {/* ── Section 1: Configured Formulas ─────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Configured Formulas
        </h2>

        {formulas.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white py-16 text-center">
            <p className="text-sm text-neutral-500">
              No formulas configured yet.
            </p>
            <p className="mt-1 text-xs text-neutral-400">
              Assign a preset to a product to create your first formula.
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50">
                  <th className="px-4 py-3 text-left font-medium text-neutral-600">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-neutral-600">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-neutral-600">
                    Preset
                  </th>
                  <th className="px-4 py-3 text-right font-medium text-neutral-600">
                    Products
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {formulas.map((formula) => {
                  const badge =
                    TYPE_BADGE[formula.type] ?? TYPE_BADGE["PRESET"];

                  // Find preset name if this formula references a preset ID
                  const presetName = formula.presetId
                    ? (presets.find((p) => p.id === formula.presetId)?.name ??
                      formula.presetId)
                    : null;

                  return (
                    <tr
                      key={formula.id}
                      className="transition-colors hover:bg-neutral-50"
                    >
                      <td className="px-4 py-3 font-medium text-neutral-900">
                        {formula.name}
                        {formula.description && (
                          <p className="mt-0.5 text-xs font-normal text-neutral-400">
                            {formula.description}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-neutral-600">
                        {presetName ?? (
                          <span className="text-neutral-400">Custom</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-neutral-700">
                        {formula._count.products}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Section 2: Available Presets ────────────── */}
      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Available Presets
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {presets.map((preset) => {
            // Group variables by source for the tags
            const paramVars = preset.variables.filter(
              (v) => v.source === "param",
            );
            const dimensionVars = preset.variables.filter(
              (v) => v.source === "dimension",
            );
            const computedVars = preset.variables.filter(
              (v) => v.source === "computed",
            );

            return (
              <div
                key={preset.id}
                className="flex flex-col gap-3 rounded-xl border border-neutral-200 bg-white p-5"
              >
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900">
                    {preset.name}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                    {preset.description}
                  </p>
                </div>

                {/* Variable tags grouped by source */}
                <div className="flex flex-wrap gap-1.5">
                  {computedVars.map((v) => (
                    <span
                      key={v.name}
                      title={`computed: ${v.description}`}
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SOURCE_BADGE["computed"]}`}
                    >
                      {v.label}
                    </span>
                  ))}
                  {dimensionVars.map((v) => (
                    <span
                      key={v.name}
                      title={`dimension: ${v.description}`}
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SOURCE_BADGE["dimension"]}`}
                    >
                      {v.label}
                    </span>
                  ))}
                  {paramVars.map((v) => (
                    <span
                      key={v.name}
                      title={`param: ${v.description}`}
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${SOURCE_BADGE["param"]}`}
                    >
                      {v.label}
                    </span>
                  ))}
                </div>

                {/* Preset ID pill */}
                <p className="mt-auto font-mono text-[10px] text-neutral-300">
                  {preset.id}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
