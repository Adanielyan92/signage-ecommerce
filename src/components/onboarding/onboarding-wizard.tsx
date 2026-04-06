"use client";

import { useState, useCallback } from "react";
import { AccountStep } from "./steps/account-step";
import { BrandingStep } from "./steps/branding-step";
import { ProductStep } from "./steps/product-step";
import { PricingStep } from "./steps/pricing-step";
import { PreviewStep } from "./steps/preview-step";
import { useRouter } from "next/navigation";

interface OnboardingData {
  email: string;
  password: string;
  name: string;
  shopName: string;
  primaryColor: string;
  accentColor: string;
  logoUrl: string;
  templateSlug: string;
  pricingOverrides: Record<string, number>;
}

const STEPS = [
  { label: "Account", component: AccountStep },
  { label: "Branding", component: BrandingStep },
  { label: "Product", component: ProductStep },
  { label: "Pricing", component: PricingStep },
  { label: "Preview", component: PreviewStep },
];

export function OnboardingWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OnboardingData>({
    email: "",
    password: "",
    name: "",
    shopName: "",
    primaryColor: "#2563eb",
    accentColor: "#1e40af",
    logoUrl: "",
    templateSlug: "front-lit-trim-cap",
    pricingOverrides: {},
  });

  const updateData = useCallback(
    (partial: Partial<OnboardingData>) => {
      setData((prev) => ({ ...prev, ...partial }));
    },
    [],
  );

  const handleNext = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const handleBack = () => setStep((s) => Math.max(s - 1, 0));

  const handleFinish = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Setup failed");
    } finally {
      setSubmitting(false);
    }
  };

  const StepComponent = STEPS[step].component;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm">
      {/* Progress bar */}
      <div className="border-b border-neutral-100 px-8 py-4">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                  i <= step
                    ? "bg-blue-600 text-white"
                    : "bg-neutral-100 text-neutral-400"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`hidden text-sm font-medium sm:inline ${
                  i <= step ? "text-neutral-900" : "text-neutral-400"
                }`}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div className="mx-2 hidden h-px w-8 bg-neutral-200 sm:block" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="px-8 py-8">
        <StepComponent data={data} onChange={updateData} />

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between border-t border-neutral-100 px-8 py-4">
        <button
          onClick={handleBack}
          disabled={step === 0}
          className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:invisible"
        >
          Back
        </button>
        <div className="flex gap-2">
          {step > 0 && step < STEPS.length - 1 && (
            <button
              onClick={handleNext}
              className="rounded-lg px-4 py-2 text-sm font-medium text-neutral-500 transition hover:text-neutral-700"
            >
              Skip for now
            </button>
          )}
          {step < STEPS.length - 1 ? (
            <button
              onClick={handleNext}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Setting up..." : "Complete Setup"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
