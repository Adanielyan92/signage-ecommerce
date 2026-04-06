"use client";

import { useConfiguratorStore } from "@/stores/configurator-store";
import { useWizard } from "./wizard/wizard-context";
import { ChannelLetterOptions } from "./options/channel-letter-options";
import { LitShapeOptions } from "./options/lit-shape-options";
import { CabinetOptions } from "./options/cabinet-options";
import { DimensionalOptions } from "./options/dimensional-options";
import { LogoOptions } from "./options/logo-options";
import { PrintOptions } from "./options/print-options";
import { SignPostOptions } from "./options/sign-post-options";
import { LightBoxOptions } from "./options/light-box-options";
import { BladeOptions } from "./options/blade-options";
import { NeonOptions } from "./options/neon-options";
import { BannerOptions } from "./options/banner-options";
import { ReviewSummary } from "./review-summary";

export function OptionsPanel() {
  const productCategory = useConfiguratorStore((s) => s.productCategory);

  // useWizard will throw if not inside WizardProvider. To support
  // the mobile layout where OptionsPanel may render outside the wizard,
  // we catch that and fall back to showing all options.
  let wizardStep: number | null = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const wizard = useWizard();
    wizardStep = wizard.currentStep;
  } catch {
    wizardStep = null;
  }

  // Step 4 (index 4) is always the Review step
  if (wizardStep === 4) {
    return <ReviewSummary />;
  }

  switch (productCategory) {
    case "CHANNEL_LETTERS":
      return <ChannelLetterOptions wizardStep={wizardStep} />;
    case "LIT_SHAPES":
      return <LitShapeOptions wizardStep={wizardStep} />;
    case "CABINET_SIGNS":
      return <CabinetOptions wizardStep={wizardStep} />;
    case "DIMENSIONAL_LETTERS":
      return <DimensionalOptions wizardStep={wizardStep} />;
    case "LOGOS":
      return <LogoOptions wizardStep={wizardStep} />;
    case "PRINT_SIGNS":
      return <PrintOptions wizardStep={wizardStep} />;
    case "SIGN_POSTS":
      return <SignPostOptions wizardStep={wizardStep} />;
    case "LIGHT_BOX_SIGNS":
      return <LightBoxOptions wizardStep={wizardStep} />;
    case "BLADE_SIGNS":
      return <BladeOptions wizardStep={wizardStep} />;
    case "NEON_SIGNS":
      return <NeonOptions wizardStep={wizardStep} />;
    case "VINYL_BANNERS":
      return <BannerOptions wizardStep={wizardStep} />;
    default:
      return <ChannelLetterOptions wizardStep={wizardStep} />;
  }
}
