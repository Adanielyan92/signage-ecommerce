"use client";

import { useParams, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { useConfiguratorStore } from "@/stores/configurator-store";
import { getAnyProductBySlug } from "@/engine/product-definitions";
import type { ChannelLetterType, FontStyle, ProductCategory, ProductTypeSlug } from "@/types/product";
import type { SignConfiguration } from "@/types/configurator";
import { ConfiguratorLayout } from "@/components/configurator/configurator-layout";
import type { AnyProduct } from "@/engine/product-definitions";
import { getTemplateById } from "@/data/templates";
import { useProduct } from "@/hooks/use-product";

/**
 * Determine the ProductCategory for a given AnyProduct.
 * Channel letter products don't carry a `category` field, so we check for its absence.
 */
function getCategoryForProduct(product: AnyProduct): ProductCategory {
  if ("category" in product) {
    return product.category as ProductCategory;
  }
  // ChannelLetterProduct doesn't have a category field
  return "CHANNEL_LETTERS";
}

export default function ConfigurePage() {
  return (
    <Suspense>
      <ConfigurePageInner />
    </Suspense>
  );
}

function ConfigurePageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const productType = params.productType as string;
  const designId = searchParams.get("design");
  const templateId = searchParams.get("template");
  const setProductCategory = useConfiguratorStore((s) => s.setProductCategory);
  const setProductType = useConfiguratorStore((s) => s.setProductType);
  const currentCategory = useConfiguratorStore((s) => s.productCategory);
  const currentType = useConfiguratorStore((s) => s.config.productType);
  const store = useConfiguratorStore();
  const designLoaded = useRef(false);
  const templateLoaded = useRef(false);
  const initializedSlug = useRef<string | null>(null);

  const product = getAnyProductBySlug(productType);
  const { product: apiProduct } = useProduct(productType);
  const setApiProductId = useConfiguratorStore((s) => s.setApiProductId);

  // Set the correct product category and type on mount or when slug changes
  useEffect(() => {
    if (!product || initializedSlug.current === productType) return;
    initializedSlug.current = productType;

    const category = getCategoryForProduct(product);

    if (category === "CHANNEL_LETTERS") {
      // For channel letters, check if type actually changed to avoid unnecessary resets
      if (currentType !== productType || currentCategory !== "CHANNEL_LETTERS") {
        setProductType(productType as ChannelLetterType);
      }
    } else {
      // For all other categories, use setProductCategory which handles the routing
      setProductCategory(category, productType as ProductTypeSlug);
    }
  }, [productType, product, currentType, currentCategory, setProductType, setProductCategory]);

  useEffect(() => {
    if (apiProduct?.id) {
      setApiProductId(apiProduct.id);
    }
  }, [apiProduct?.id, setApiProductId]);

  // Load saved design if ?design= query param is present
  useEffect(() => {
    if (!designId || designLoaded.current) return;
    designLoaded.current = true;

    fetch(`/api/designs/${designId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.configuration) {
          const cfg = data.configuration as SignConfiguration;
          store.setText(cfg.text);
          store.setHeight(cfg.height);
          store.setFont(cfg.font as FontStyle);
          store.setLit(cfg.lit);
          store.setLed(cfg.led);
          store.setLitSides(cfg.litSides);
          store.setSideDepth(cfg.sideDepth);
          store.setPainting(cfg.painting);
          store.setPaintingColors(cfg.paintingColors);
          store.setRaceway(cfg.raceway);
          store.setVinyl(cfg.vinyl);
          store.setBackground(cfg.background);
        }
      })
      .catch(() => {});
  }, [designId, store]);

  // Load template if ?template= query param is present
  useEffect(() => {
    if (!templateId || templateLoaded.current) return;
    templateLoaded.current = true;

    const template = getTemplateById(templateId);
    if (template) {
      const cfg = template.configuration;
      store.setText(cfg.text);
      store.setHeight(cfg.height);
      store.setFont(cfg.font as FontStyle);
      store.setLit(cfg.lit);
      store.setLed(cfg.led);
      store.setLitSides(cfg.litSides);
      store.setSideDepth(cfg.sideDepth);
      store.setPainting(cfg.painting);
      store.setPaintingColors(cfg.paintingColors);
      store.setRaceway(cfg.raceway);
      store.setVinyl(cfg.vinyl);
      store.setBackground(cfg.background);
    }
  }, [templateId, store]);

  if (!product) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-neutral-900">
            Product not found
          </h1>
          <p className="mt-2 text-neutral-500">
            The product type &quot;{productType}&quot; does not exist.
          </p>
        </div>
      </div>
    );
  }

  return <ConfiguratorLayout product={product} />;
}
