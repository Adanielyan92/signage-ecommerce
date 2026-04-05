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
  };

  return <FormulaEditor formulaId={formulaId} initialFormula={initialFormula} />;
}
