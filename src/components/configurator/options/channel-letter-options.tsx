"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useConfiguratorStore } from "@/stores/configurator-store";
import type { ChannelLetterProduct } from "@/engine/product-definitions";
import type { ChannelLetterType } from "@/types/product";
import { channelLetterProducts } from "@/engine/product-definitions";
import { FONT_CSS_MAP } from "@/engine/font-map";
import { validateTextInput, validateHeight } from "@/lib/validation";
import { useProductSchema } from "@/hooks/use-product-schema";
import { Check } from "lucide-react";

// Beautiful FrontSigns spec Swatches
const COLOR_MAP: Record<string, string> = {
  // LED
  "3000K": "#FFB46B",
  "3500K": "#FFC98E",
  "6000K": "#E3EEFF",
  "Warm White (3000K)": "#FFB46B",
  "Neutral (3500K)": "#FFC98E",
  "Cool White (6000K)": "#E3EEFF",
  Red: "#FF0000",
  Green: "#00FF00",
  Blue: "#0066FF",
  RGB: "conic-gradient(from 0deg, red, yellow, lime, cyan, blue, magenta, red)",
  "RGB Color": "conic-gradient(from 0deg, red, yellow, lime, cyan, blue, magenta, red)",

  // Acrylic Faces
  "Standard White Acrylic": "#F9FAFB",
  "Black (Day/Night) Acrylic": "#171717",
  "Color Vinyl Wrap": "conic-gradient(from 90deg, #3b82f6, #ef4444, #eab308, #22c55e)",
  "Lexan 3/16": "#e0e7ff",

  // Metal Finishes
  "Painted Aluminum": "#64748b",
  "Brushed Aluminum": "linear-gradient(135deg, #e2e8f0 0%, #94a3b8 100%)",
  "Polished Stainless": "linear-gradient(135deg, #f8fafc 0%, #cbd5e1 100%)",
  "Matte Black": "#0f172a",
};

interface ChannelLetterOptionsProps {
  wizardStep: number | null;
}

export function ChannelLetterOptions({ wizardStep }: ChannelLetterOptionsProps) {
  const config = useConfiguratorStore((s) => s.config);
  const {
    setProductType,
    setText,
    setHeight,
    setFont,
    setLit,
    setLed,
    setLitSides,
    setSideDepth,
    setPainting,
    setPaintingColors,
    setRaceway,
    setRacewayColor,
    setVinyl,
    setBackground,
  } = useConfiguratorStore();

  const product = channelLetterProducts.find(
    (p) => p.slug === config.productType
  ) as ChannelLetterProduct;

  const { options: dbOptions } = useProductSchema(config.productType);
  const activeOptions = dbOptions && dbOptions.length > 0 ? dbOptions : product.options;

  // Debounced text input (300ms)
  const [localText, setLocalText] = useState(config.text);
  const textTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const prevStoreText = useRef(config.text);

  if (prevStoreText.current !== config.text) {
    prevStoreText.current = config.text; // eslint-disable-line react-hooks/refs
    setLocalText(config.text);
  }

  const handleTextChange = useCallback(
    (value: string) => {
      setLocalText(value);
      clearTimeout(textTimerRef.current);
      textTimerRef.current = setTimeout(() => setText(value), 300);
    },
    [setText]
  );

  useEffect(() => {
    return () => clearTimeout(textTimerRef.current);
  }, []);

  const textErrors = localText.length > 0 ? validateTextInput(localText) : [];
  const heightErrors = validateHeight(config.height);

  const hasOption = (key: string) => activeOptions.some((o) => o.optionKey === key);
  const getOption = (key: string) => activeOptions.find((o) => o.optionKey === key);

  const isVisible = (key: string) => {
    const option = getOption(key);
    if (!option?.dependsOn) return true;
    return Object.entries(option.dependsOn).every(([depKey, allowedValues]) => {
      const currentValue = (config as unknown as Record<string, unknown>)[depKey] as string;
      return allowedValues.includes(currentValue);
    });
  };

  const showAll = wizardStep === null;

  // Generic Card Selector
  const renderCardGrid = (
    optionKey: string,
    currentValue: string,
    setter: (value: any) => void,
    useSwatches = false
  ) => {
    const opt = getOption(optionKey);
    if (!opt || !isVisible(optionKey)) return null;

    return (
      <div className="mb-6">
        <label className="mb-3 block text-xs font-bold uppercase tracking-wider text-neutral-800">
          {opt.label}
        </label>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {opt.possibleValues?.map((v) => {
            const isSelected = currentValue === v.value;
            const swatch = COLOR_MAP[v.label || v.value];
            
            return (
              <button
                key={v.value}
                onClick={() => setter(v.value)}
                className={`group relative flex flex-col items-center justify-center overflow-hidden rounded-xl border-2 p-3 text-center transition-all duration-200 ${
                  isSelected
                    ? "border-blue-600 bg-blue-50/50 shadow-md ring-4 ring-blue-600/10"
                    : "border-neutral-200 bg-white hover:border-blue-300 hover:bg-neutral-50 hover:shadow-sm"
                }`}
              >
                {isSelected && (
                  <div className="absolute right-2 top-2 rounded-full bg-blue-600 p-0.5 text-white shadow-sm">
                    <Check className="h-3 w-3" />
                  </div>
                )}
                {useSwatches && swatch && (
                  <div
                    className={`mb-2 h-8 w-8 rounded-full border border-neutral-300 shadow-inner ${
                      isSelected ? "ring-2 ring-blue-600 ring-offset-2" : ""
                    }`}
                    style={{ background: swatch }}
                  />
                )}
                <span
                  className={`text-xs font-medium transition-colors ${
                    isSelected ? "text-blue-900" : "text-neutral-600 group-hover:text-blue-700"
                  }`}
                >
                  {v.label || v.value}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-2xl pb-10">
      {/* Configuration Header visually tying to the portfolio style */}
      <div className="mb-6 flex items-center justify-between border-b pb-4">
        <h2 className="text-lg font-bold tracking-tight text-neutral-900">
          Custom Specifications
        </h2>
        <span className="text-xs font-medium uppercase tracking-wide text-blue-600">
          Professional Grade
        </span>
      </div>

      {/* Step 0: Letter Type */}
      {(showAll || wizardStep === 0) && (
        <div className="mb-8">
          <label className="mb-3 block text-xs font-bold uppercase tracking-wider text-neutral-800">
            Sign Architecture
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {channelLetterProducts.map((p) => (
              <button
                key={p.slug}
                onClick={() => setProductType(p.slug as ChannelLetterType)}
                className={`relative flex flex-col items-start gap-1 rounded-xl border-2 p-4 text-left transition-all ${
                  config.productType === p.slug
                    ? "border-blue-600 bg-blue-50/40 shadow-md ring-4 ring-blue-600/10"
                    : "border-neutral-200 bg-white hover:border-blue-300 hover:shadow-sm"
                }`}
              >
                <span className={`text-sm font-bold ${config.productType === p.slug ? "text-blue-900" : "text-neutral-800"}`}>
                  {p.name}
                </span>
                <span className="text-xs leading-relaxed text-neutral-500 line-clamp-2">
                  {p.description}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 1: Text & Font */}
      {(showAll || wizardStep === 1) && (
        <div className="mb-8 space-y-6">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-800">
              Sign Copy
            </label>
            <input
              type="text"
              value={localText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Enter your exact lettering..."
              className="w-full rounded-lg border-2 border-neutral-200 bg-neutral-50 px-4 py-3 text-lg font-medium text-neutral-900 transition-all focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
            />
            {textErrors.length > 0 && (
              <p className="mt-2 text-xs font-medium text-red-500 flex items-center gap-1">
                <span className="inline-block h-1 w-1 rounded-full bg-red-500" />
                {textErrors[0].message}
              </p>
            )}
          </div>

          {hasOption("font") && (
            <div>
              <label className="mb-3 block text-xs font-bold uppercase tracking-wider text-neutral-800">
                Typography Selection
              </label>
              <div className="grid max-h-60 grid-cols-2 gap-3 overflow-y-auto p-1 sm:grid-cols-3">
                {getOption("font")?.possibleValues?.map((v) => (
                  <button
                    key={v.value}
                    onClick={() => setFont(v.value as typeof config.font)}
                    className={`flex flex-col items-center justify-center rounded-xl border-2 p-3 transition-all ${
                      config.font === v.value
                        ? "border-blue-600 bg-blue-50 text-blue-900 shadow-md ring-4 ring-blue-600/10"
                        : "border-neutral-200 bg-white text-neutral-600 hover:border-blue-300 hover:bg-neutral-50"
                    }`}
                  >
                    <span
                      className="mb-1 text-2xl"
                      style={{ fontFamily: FONT_CSS_MAP[v.value] || "inherit" }}
                    >
                      Aa
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wider opacity-60">
                      {v.label || v.value}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2: Scale & Dimension */}
      {(showAll || wizardStep === 2) && (
        <div className="mb-8 space-y-6 rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <div>
            <label className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-wider text-neutral-800">
              <span>Overall Letter Height</span>
              <span className="rounded bg-blue-100 px-2 py-0.5 text-sm font-black text-blue-800">
                {config.height}&quot; inches
              </span>
            </label>
            <input
              type="range"
              min={6}
              max={72}
              step={1}
              value={config.height}
              onChange={(e) => setHeight(Number(e.target.value))}
              className="h-2 w-full cursor-pointer appearance-none rounded-full bg-neutral-200 accent-blue-600 outline-none hover:bg-neutral-300"
            />
            <div className="mt-2 flex justify-between text-xs font-medium text-neutral-400">
              <span>6&quot; Min</span>
              <span>72&quot; Max</span>
            </div>
          </div>

          <div className="h-px w-full bg-neutral-100" />

          {/* Depth / Side Depth */}
          {hasOption("side_depth") && (
            <div>
              <label className="mb-3 block text-xs font-bold uppercase tracking-wider text-neutral-800">
                Extrusion Depth (Returns)
              </label>
              <div className="flex gap-2 rounded-lg bg-neutral-100 p-1">
                {getOption("side_depth")?.possibleValues?.map((v) => (
                  <button
                    key={v.value}
                    onClick={() => setSideDepth(v.value)}
                    className={`flex-1 rounded-md py-2 text-sm font-semibold transition-all ${
                      config.sideDepth === v.value
                        ? "bg-white text-blue-700 shadow-sm ring-1 ring-neutral-200/50"
                        : "text-neutral-500 hover:text-neutral-800"
                    }`}
                  >
                    {v.value}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Illumination & Materials */}
      {(showAll || wizardStep === 3) && (
        <div className="space-y-8">
          
          {/* Section: Illumination */}
          {(hasOption("lit") || hasOption("led") || hasOption("lit_sides")) && (
            <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-neutral-400">
                Illumination Properties
              </h3>
              
              {renderCardGrid("lit", config.lit, setLit)}
              {renderCardGrid("led", config.led, setLed, true)}
              {renderCardGrid("lit_sides", config.litSides, setLitSides)}
            </div>
          )}

          {/* Section: Finishes & Materials */}
          {(hasOption("vinyl") || hasOption("painting") || hasOption("raceway")) && (
            <div className="rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
              <h3 className="mb-4 text-xs font-bold uppercase tracking-widest text-neutral-400">
                Materials & Mounting
              </h3>

              {/* Face Finish mapped from `vinyl` internal key */}
              {renderCardGrid("vinyl", config.vinyl, setVinyl, true)}
              
              {/* Return Finish mapped from `painting` internal key */}
              {renderCardGrid("painting", config.painting, setPainting, true)}

              {/* Mounting mapped from `raceway` internal key */}
              {renderCardGrid("raceway", config.raceway, setRaceway)}

              {config.raceway && config.raceway !== "-" && config.raceway !== "Flush Mount" && (
                <div className="mt-4 flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50 px-5 py-4 transition-all">
                  <div>
                    <label className="text-xs font-bold text-neutral-800">
                      Mounting Rack Color
                    </label>
                    <p className="text-[10px] text-neutral-500">Pick a color to match your façade</p>
                  </div>
                  <div className="relative">
                    <input
                      type="color"
                      value={config.racewayColor}
                      onChange={(e) => setRacewayColor(e.target.value)}
                      className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
                    />
                    <div 
                      className="h-10 w-16 rounded-lg border-2 border-white shadow-md ring-1 ring-neutral-200" 
                      style={{ backgroundColor: config.racewayColor }} 
                    />
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
