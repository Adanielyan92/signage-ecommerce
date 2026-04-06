"use client";

import { Text } from "@react-three/drei";
import { useConfiguratorStore } from "@/stores/configurator-store";
import { SignAssembly } from "./sign-assembly";
import { CabinetRenderer } from "./renderers/cabinet-renderer";
import { LitShapeRenderer } from "./renderers/lit-shape-renderer";
import { LogoRenderer } from "./renderers/logo-renderer";
import { PrintSignRenderer } from "./renderers/print-sign-renderer";
import { SignPostRenderer } from "./renderers/sign-post-renderer";
import { DimensionalAssembly } from "./renderers/dimensional-assembly";
import { LightBoxRenderer } from "./renderers/light-box-renderer";
import { BladeRenderer } from "./renderers/blade-renderer";
import { NeonAssembly } from "./renderers/neon-assembly";
import { BannerRenderer } from "./renderers/banner-renderer";
import { AFrameRenderer } from "./renderers/a-frame-renderer";
import { YardSignRenderer } from "./renderers/yard-sign-renderer";
import { PlaqueRenderer } from "./renderers/plaque-renderer";
import { VinylGraphicRenderer } from "./renderers/vinyl-graphic-renderer";
import { WayfindingRenderer } from "./renderers/wayfinding-renderer";
import { PushThroughRenderer } from "./renderers/push-through-renderer";

export function SceneRouter() {
  const productCategory = useConfiguratorStore((s) => s.productCategory);
  const config = useConfiguratorStore((s) => s.config);
  const litShapeConfig = useConfiguratorStore((s) => s.litShapeConfig);
  const cabinetConfig = useConfiguratorStore((s) => s.cabinetConfig);
  const dimensionalConfig = useConfiguratorStore((s) => s.dimensionalConfig);
  const logoConfig = useConfiguratorStore((s) => s.logoConfig);
  const printConfig = useConfiguratorStore((s) => s.printConfig);
  const signPostConfig = useConfiguratorStore((s) => s.signPostConfig);
  const lightBoxConfig = useConfiguratorStore((s) => s.lightBoxConfig);
  const bladeConfig = useConfiguratorStore((s) => s.bladeConfig);
  const neonConfig = useConfiguratorStore((s) => s.neonConfig);
  const bannerConfig = useConfiguratorStore((s) => s.bannerConfig);
  const aFrameConfig = useConfiguratorStore((s) => s.aFrameConfig);
  const yardSignConfig = useConfiguratorStore((s) => s.yardSignConfig);
  const plaqueConfig = useConfiguratorStore((s) => s.plaqueConfig);
  const vinylGraphicConfig = useConfiguratorStore((s) => s.vinylGraphicConfig);
  const wayfindingConfig = useConfiguratorStore((s) => s.wayfindingConfig);
  const pushThroughConfig = useConfiguratorStore((s) => s.pushThroughConfig);

  switch (productCategory) {
    case "CHANNEL_LETTERS": {
      const hasText = config.text.replace(/\s+/g, "").length > 0;
      if (!hasText)
        return (
          <TextPlaceholder message="Type your business name to preview in 3D" />
        );
      return <SignAssembly />;
    }
    case "DIMENSIONAL_LETTERS": {
      const hasText = dimensionalConfig.text.replace(/\s+/g, "").length > 0;
      if (!hasText)
        return (
          <TextPlaceholder message="Type your text to preview dimensional letters" />
        );
      return (
        <DimensionalAssembly
          text={dimensionalConfig.text}
          height={dimensionalConfig.height}
          font={dimensionalConfig.font}
          thickness={dimensionalConfig.thickness}
          materialType={dimensionalConfig.productType}
          painting={dimensionalConfig.painting}
        />
      );
    }
    case "CABINET_SIGNS":
      return (
        <CabinetRenderer
          width={cabinetConfig.widthInches}
          height={cabinetConfig.heightInches}
          led={cabinetConfig.led}
          doubleFace={cabinetConfig.productType.startsWith("double")}
        />
      );
    case "LIT_SHAPES":
      return (
        <LitShapeRenderer
          width={litShapeConfig.widthInches}
          height={litShapeConfig.heightInches}
          led={litShapeConfig.led}
          painting={litShapeConfig.painting}
        />
      );
    case "LOGOS":
      return (
        <LogoRenderer
          width={logoConfig.widthInches}
          height={logoConfig.heightInches}
          led={
            logoConfig.productType === "lit-logo" ? logoConfig.led : undefined
          }
          painting={logoConfig.painting}
          presetShape="shield"
        />
      );
    case "PRINT_SIGNS":
      return (
        <PrintSignRenderer
          width={printConfig.widthInches}
          height={printConfig.heightInches}
          materialType={printConfig.productType}
        />
      );
    case "SIGN_POSTS":
      return (
        <SignPostRenderer
          postType={signPostConfig.productType}
          postHeight={signPostConfig.postHeight}
          signWidth={signPostConfig.signWidthInches}
          signHeight={signPostConfig.signHeightInches}
          doubleSided={signPostConfig.doubleSided}
        />
      );
    case "LIGHT_BOX_SIGNS":
      return (
        <LightBoxRenderer
          width={lightBoxConfig.widthInches}
          height={lightBoxConfig.heightInches}
          depth={parseFloat(lightBoxConfig.depth)}
          led={lightBoxConfig.led}
          faceType={lightBoxConfig.faceType}
          shape={lightBoxConfig.shape}
        />
      );
    case "BLADE_SIGNS":
      return (
        <BladeRenderer
          width={bladeConfig.widthInches}
          height={bladeConfig.heightInches}
          depth={parseFloat(bladeConfig.depth)}
          illuminated={bladeConfig.illuminated}
          led={bladeConfig.led}
          doubleSided={bladeConfig.doubleSided}
          shape={bladeConfig.shape}
        />
      );
    case "NEON_SIGNS": {
      const hasText = neonConfig.text.replace(/\s+/g, "").length > 0;
      if (!hasText) return <TextPlaceholder message="Type your text to preview in neon" />;
      return (
        <NeonAssembly
          text={neonConfig.text}
          height={neonConfig.height}
          font={neonConfig.font}
          neonColor={neonConfig.neonColor}
          backer={neonConfig.backer}
          backerShape={neonConfig.backerShape}
        />
      );
    }
    case "VINYL_BANNERS":
      return (
        <BannerRenderer
          width={bannerConfig.widthInches}
          height={bannerConfig.heightInches}
          material={bannerConfig.material}
          finishing={bannerConfig.finishing}
          doubleSided={bannerConfig.doubleSided}
        />
      );
    case "A_FRAME_SIGNS":
      return (
        <AFrameRenderer
          width={aFrameConfig.widthInches}
          height={aFrameConfig.heightInches}
          material={aFrameConfig.material}
          doubleSided={aFrameConfig.doubleSided}
          insertType={aFrameConfig.insertType}
        />
      );
    case "YARD_SIGNS":
      return (
        <YardSignRenderer
          width={yardSignConfig.widthInches}
          height={yardSignConfig.heightInches}
          material={yardSignConfig.material}
          doubleSided={yardSignConfig.doubleSided}
          stakeType={yardSignConfig.stakeType}
        />
      );
    case "PLAQUES":
      return (
        <PlaqueRenderer
          width={plaqueConfig.widthInches}
          height={plaqueConfig.heightInches}
          material={plaqueConfig.material}
          thickness={plaqueConfig.thickness}
          finish={plaqueConfig.finish}
          mounting={plaqueConfig.mounting}
        />
      );
    case "VINYL_GRAPHICS":
      return (
        <VinylGraphicRenderer
          width={vinylGraphicConfig.widthInches}
          height={vinylGraphicConfig.heightInches}
          vinylType={vinylGraphicConfig.vinylType}
          applicationSurface={vinylGraphicConfig.applicationSurface}
        />
      );
    case "WAYFINDING_SIGNS":
      return (
        <WayfindingRenderer
          width={wayfindingConfig.widthInches}
          height={wayfindingConfig.heightInches}
          material={wayfindingConfig.material}
          adaCompliant={wayfindingConfig.adaCompliant}
          pictogram={wayfindingConfig.pictogram}
          mounting={wayfindingConfig.mounting}
        />
      );
    case "PUSH_THROUGH_SIGNS": {
      const hasText = pushThroughConfig.text.replace(/\s+/g, "").length > 0;
      if (!hasText)
        return (
          <TextPlaceholder message="Type your text to preview push-through letters" />
        );
      return (
        <PushThroughRenderer
          width={pushThroughConfig.widthInches}
          height={pushThroughConfig.heightInches}
          depth={parseFloat(pushThroughConfig.depth)}
          text={pushThroughConfig.text}
          letterHeight={pushThroughConfig.letterHeight}
          led={pushThroughConfig.led}
          frameFinish={pushThroughConfig.frameFinish}
          doubleSided={pushThroughConfig.productType === "push-through-double"}
        />
      );
    }
    default:
      return <TextPlaceholder message="Select a product to begin" />;
  }
}

function TextPlaceholder({ message }: { message: string }) {
  return (
    <group>
      <Text
        fontSize={4}
        color="#6b7280"
        anchorX="center"
        anchorY="middle"
        fillOpacity={0.4}
        font="/fonts/Montserrat-Regular.ttf"
        maxWidth={50}
        textAlign="center"
      >
        {message}
      </Text>
      <Text
        fontSize={6}
        color="#3b82f6"
        anchorX="center"
        anchorY="middle"
        fillOpacity={0.25}
        font="/fonts/Montserrat-Regular.ttf"
        position={[0, -6, 0]}
      >
        {"\u2192"}
      </Text>
    </group>
  );
}
