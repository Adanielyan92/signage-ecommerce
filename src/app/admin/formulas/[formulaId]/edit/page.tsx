import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { FormulaEditor } from "@/components/admin/formula-editor/formula-editor";
import type { FormulaDefinition } from "@/engine/formula-types";

export const metadata = {
  title: "Edit Formula — Admin | GatSoft Signs",
};

export default async function EditFormulaPage({
  params,
}: {
  params: Promise<{ formulaId: string }>;
}) {
  const admin = await requireAdmin();
  const { formulaId } = await params;

  const formula = await prisma.pricingFormula.findFirst({
    where: { id: formulaId, tenantId: admin.tenantId },
  });

  if (!formula) {
    notFound();
  }

  const initialFormula = {
    id: formula.id,
    name: formula.name,
    description: formula.description,
    type: formula.type,
    formulaAst: formula.formulaAst as FormulaDefinition | null,
    scriptBody: formula.scriptBody,
  };

  if (formula.type === "SCRIPT") {
    const { ScriptEditor } = await import("@/components/admin/script-editor");
    return (
      <div className="container max-w-4xl py-8">
        <h1 className="text-2xl font-bold mb-6">{formula.name}</h1>
        <ScriptEditor
          formulaId={formulaId}
          initialScript={formula.scriptBody ?? ""}
          onSave={async (scriptBody: string) => {
            "use server";
            const { prisma: db } = await import("@/lib/prisma");
            await db.pricingFormula.update({
              where: { id: formulaId },
              data: { scriptBody },
            });
          }}
        />
      </div>
    );
  }

  return <FormulaEditor formulaId={formulaId} initialFormula={initialFormula} />;
}
