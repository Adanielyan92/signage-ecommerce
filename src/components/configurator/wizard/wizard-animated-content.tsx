"use client";

import { useRef, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWizard } from "./wizard-context";

interface WizardAnimatedContentProps {
  children: ReactNode;
}

/**
 * Wraps wizard step content with slide animation.
 * Detects direction (forward/backward) based on step change.
 */
export function WizardAnimatedContent({ children }: WizardAnimatedContentProps) {
  const { currentStep } = useWizard();
  const prevStep = useRef(currentStep);

  const direction = currentStep >= prevStep.current ? 1 : -1;
  prevStep.current = currentStep;

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={currentStep}
        initial={{ opacity: 0, x: direction > 0 ? 20 : -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: direction > 0 ? -20 : 20 }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
