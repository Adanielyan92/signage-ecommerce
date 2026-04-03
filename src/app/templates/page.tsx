"use client";

import { useState } from "react";
import Link from "next/link";
import { TemplateGrid } from "@/components/templates/template-grid";
import { allTemplates, getTemplatesByCategory } from "@/data/templates";
import { TEMPLATE_CATEGORIES } from "@/types/templates";
import type { TemplateCategory } from "@/types/templates";

export default function TemplatesPage() {
  const [activeCategory, setActiveCategory] = useState<
    "all" | TemplateCategory
  >("all");

  const filteredTemplates =
    activeCategory === "all"
      ? allTemplates
      : getTemplatesByCategory(activeCategory);

  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      {/* Hero section */}
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
          Sign Templates
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-neutral-600">
          Browse pre-configured sign designs organized by business type. Pick a
          template and customize it in our 3D configurator with instant pricing.
        </p>
      </div>

      {/* Category filter buttons */}
      <div className="mb-10 flex flex-wrap items-center justify-center gap-2">
        <button
          onClick={() => setActiveCategory("all")}
          className={`rounded-full px-4 py-2 text-sm font-medium transition ${
            activeCategory === "all"
              ? "bg-neutral-900 text-white shadow-sm"
              : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
          }`}
        >
          All Templates
        </button>
        {TEMPLATE_CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setActiveCategory(cat.value)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              activeCategory === cat.value
                ? "bg-neutral-900 text-white shadow-sm"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            <span className="mr-1.5">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* Category description when filtered */}
      {activeCategory !== "all" && (
        <div className="mb-8 text-center">
          <p className="text-sm text-neutral-500">
            {
              TEMPLATE_CATEGORIES.find((c) => c.value === activeCategory)
                ?.description
            }
          </p>
          <Link
            href={`/templates/${activeCategory}`}
            className="mt-1 inline-block text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View all{" "}
            {
              TEMPLATE_CATEGORIES.find((c) => c.value === activeCategory)
                ?.label
            }{" "}
            templates
          </Link>
        </div>
      )}

      {/* Template grid */}
      <TemplateGrid templates={filteredTemplates} />

      {/* CTA */}
      <div className="mt-16 rounded-xl border border-blue-100 bg-blue-50 p-8 text-center">
        <h2 className="text-xl font-semibold text-blue-900">
          Don&apos;t see what you need?
        </h2>
        <p className="mx-auto mt-2 max-w-lg text-blue-700">
          Start from scratch in our 3D configurator. Choose any product type,
          enter your text, and customize every detail.
        </p>
        <Link
          href="/configure/front-lit-trim-cap"
          className="mt-4 inline-block rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          Start Custom Design
        </Link>
      </div>
    </div>
  );
}
