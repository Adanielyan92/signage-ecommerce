"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, ExternalLink } from "lucide-react";

interface FormulaRowExpanderProps {
  formulaId: string;
  formulaType: string;
  products: Array<{ id: string; name: string; slug: string }>;
  children: React.ReactNode;
}

export function FormulaRowExpander({
  formulaId,
  formulaType,
  products,
  children,
}: FormulaRowExpanderProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  function handleRowClick() {
    if (formulaType === "VISUAL") {
      router.push(`/admin/formulas/${formulaId}/edit`);
    } else {
      setExpanded((prev) => !prev);
    }
  }

  return (
    <>
      <tr
        onClick={handleRowClick}
        className="cursor-pointer transition-colors hover:bg-neutral-50"
      >
        {children}
      </tr>
      {expanded && formulaType !== "VISUAL" && (
        <tr className="bg-neutral-50/60">
          <td colSpan={5} className="px-6 py-4">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                Products using this formula
              </p>
              {products.length === 0 ? (
                <p className="text-sm text-neutral-400 italic">
                  No products assigned to this formula yet.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {products.map((product) => (
                    <Link
                      key={product.id}
                      href={`/admin/products/${product.id}/edit`}
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-sm font-medium text-neutral-800 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                    >
                      {product.name}
                      <ExternalLink className="h-3 w-3 text-neutral-400" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
