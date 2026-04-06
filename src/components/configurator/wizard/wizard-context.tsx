"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface WizardStep {
  id: string;
  label: string;
  isComplete: boolean;
}

interface WizardContextValue {
  steps: WizardStep[];
  currentStep: number;
  setCurrentStep: (step: number) => void;
  goNext: () => void;
  goBack: () => void;
  markComplete: (stepId: string) => void;
  isFirstStep: boolean;
  isLastStep: boolean;
}

const WizardContext = createContext<WizardContextValue | null>(null);

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard must be used inside WizardProvider");
  return ctx;
}

export function WizardProvider({
  stepDefinitions,
  children,
}: {
  stepDefinitions: { id: string; label: string }[];
  children: ReactNode;
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const steps: WizardStep[] = stepDefinitions.map((s) => ({
    ...s,
    isComplete: completedSteps.has(s.id),
  }));

  const goNext = () => {
    if (currentStep < steps.length - 1) {
      // Mark current step as complete
      setCompletedSteps((prev) => new Set([...prev, steps[currentStep].id]));
      setCurrentStep(currentStep + 1);
    }
  };

  const goBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  const markComplete = (stepId: string) => {
    setCompletedSteps((prev) => new Set([...prev, stepId]));
  };

  return (
    <WizardContext.Provider
      value={{
        steps,
        currentStep,
        setCurrentStep,
        goNext,
        goBack,
        markComplete,
        isFirstStep: currentStep === 0,
        isLastStep: currentStep === steps.length - 1,
      }}
    >
      {children}
    </WizardContext.Provider>
  );
}
