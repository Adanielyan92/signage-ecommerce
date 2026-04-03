"use client";

import { useConfiguratorStore } from "@/stores/configurator-store";
import { ChannelLetterOptions } from "./options/channel-letter-options";
import { LitShapeOptions } from "./options/lit-shape-options";
import { CabinetOptions } from "./options/cabinet-options";
import { DimensionalOptions } from "./options/dimensional-options";
import { LogoOptions } from "./options/logo-options";
import { PrintOptions } from "./options/print-options";
import { SignPostOptions } from "./options/sign-post-options";

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
    default:
      return <ChannelLetterOptions />;
  }
}
