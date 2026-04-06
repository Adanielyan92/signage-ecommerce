"use client";

import { Check } from "lucide-react";
import { useWizard } from "./wizard-context";

export function StepIndicator() {
  const { steps, currentStep, setCurrentStep } = useWizard();

  return (
    <div className="flex items-center gap-1 px-6 py-4">
      {steps.map((step, i) => {
        const isActive = i === currentStep;
        const isCompleted = step.isComplete;
        const isPast = i < currentStep;

        return (
          <div key={step.id} className="flex items-center gap-1">
            <button
              onClick={() => setCurrentStep(i)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                isActive
                  ? "bg-brand-accent text-white"
                  : isCompleted || isPast
                    ? "bg-brand-success/10 text-brand-success"
                    : "bg-brand-muted text-brand-text-secondary"
              }`}
            >
              {isCompleted ? (
                <Check className="h-3 w-3" />
              ) : (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-current/20 text-[10px] font-bold">
                  {i + 1}
                </span>
              )}
              <span className="hidden sm:inline">{step.label}</span>
            </button>
            {i < steps.length - 1 && (
              <div
                className={`h-px w-4 ${
                  isPast || isCompleted ? "bg-brand-success" : "bg-brand-muted"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
