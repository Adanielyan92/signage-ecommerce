"use client";

import { TemplateCard } from "@/components/templates/template-card";
import type { SignTemplate } from "@/types/templates";

interface TemplateGridProps {
  templates: SignTemplate[];
}

export function TemplateGrid({ templates }: TemplateGridProps) {
  if (templates.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-lg text-neutral-500">
          No templates found for this category.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {templates.map((template) => (
        <TemplateCard key={template.id} template={template} />
      ))}
    </div>
  );
}
