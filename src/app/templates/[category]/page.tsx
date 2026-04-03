"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { TemplateGrid } from "@/components/templates/template-grid";
import { getTemplatesByCategory } from "@/data/templates";
import { TEMPLATE_CATEGORIES } from "@/types/templates";
import type { TemplateCategory } from "@/types/templates";

export default function CategoryPage() {
  const params = useParams();
  const categorySlug = params.category as string;

  const categoryInfo = TEMPLATE_CATEGORIES.find(
    (c) => c.value === categorySlug
  );
  const templates = getTemplatesByCategory(categorySlug);

  if (!categoryInfo) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-900">
            Category not found
          </h1>
          <p className="mt-2 text-neutral-500">
            The category &quot;{categorySlug}&quot; does not exist.
          </p>
          <Link
            href="/templates"
            className="mt-4 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            Browse all templates
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Breadcrumb */}
      <nav className="mb-8 flex items-center gap-1 text-sm text-neutral-500">
        <Link href="/templates" className="hover:text-neutral-700">
          Templates
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="font-medium text-neutral-900">
          {categoryInfo.label}
        </span>
      </nav>

      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{categoryInfo.icon}</span>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
            {categoryInfo.label}
          </h1>
        </div>
        <p className="mt-3 max-w-2xl text-lg text-neutral-600">
          {categoryInfo.description}. Browse our pre-configured templates below,
          then customize in the 3D configurator.
        </p>
        <p className="mt-1 text-sm text-neutral-400">
          {templates.length} template{templates.length !== 1 ? "s" : ""}{" "}
          available
        </p>
      </div>

      {/* Template grid */}
      <TemplateGrid templates={templates} />

      {/* Other categories */}
      <div className="mt-16">
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">
          Other categories
        </h2>
        <div className="flex flex-wrap gap-2">
          {TEMPLATE_CATEGORIES.filter((c) => c.value !== categorySlug).map(
            (cat) => (
              <Link
                key={cat.value}
                href={`/templates/${cat.value}`}
                className="rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-200"
              >
                <span className="mr-1.5">{cat.icon}</span>
                {cat.label}
              </Link>
            )
          )}
        </div>
      </div>
    </div>
  );
}
