import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default function OnboardingPage() {
  return (
    <div>
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-neutral-900">
          Set Up Your Sign Shop
        </h1>
        <p className="mt-2 text-neutral-500">
          Get your 3D configurator running in minutes
        </p>
      </div>
      <OnboardingWizard />
    </div>
  );
}
