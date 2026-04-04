"use client";

import { useConfiguratorStore } from "@/stores/configurator-store";
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

export function OptionsPanel() {
  const productCategory = useConfiguratorStore((s) => s.productCategory);

  switch (productCategory) {
    case "CHANNEL_LETTERS":
      return <ChannelLetterOptions />;
    case "LIT_SHAPES":
      return <LitShapeOptions />;
    case "CABINET_SIGNS":
      return <CabinetOptions />;
    case "DIMENSIONAL_LETTERS":
      return <DimensionalOptions />;
    case "LOGOS":
      return <LogoOptions />;
    case "PRINT_SIGNS":
      return <PrintOptions />;
    case "SIGN_POSTS":
      return <SignPostOptions />;
    case "LIGHT_BOX_SIGNS":
      return <LightBoxOptions />;
    case "BLADE_SIGNS":
      return <BladeOptions />;
    case "NEON_SIGNS":
      return <NeonOptions />;
    case "VINYL_BANNERS":
      return <BannerOptions />;
    default:
      return <ChannelLetterOptions />;
  }
}
