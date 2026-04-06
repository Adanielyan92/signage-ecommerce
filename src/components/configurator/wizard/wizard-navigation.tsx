"use client";

import { ArrowLeft, ArrowRight } from "lucide-react";
import { useWizard } from "./wizard-context";

export function WizardNavigation() {
  const { goNext, goBack, isFirstStep, isLastStep } = useWizard();

  return (
    <div className="flex items-center justify-between border-t border-brand-muted px-6 py-3">
      <button
        onClick={goBack}
        disabled={isFirstStep}
        className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-brand-text-secondary transition hover:bg-brand-muted disabled:opacity-30"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>
      {!isLastStep && (
        <button
          onClick={goNext}
          className="flex items-center gap-1.5 rounded-lg bg-brand-accent px-6 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-accent/90"
        >
          Next
          <ArrowRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
