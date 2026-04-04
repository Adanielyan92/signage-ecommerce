"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useConfiguratorStore } from "@/stores/configurator-store";
import type { ChannelLetterProduct } from "@/engine/product-definitions";
import type { ChannelLetterType } from "@/types/product";
import { channelLetterProducts } from "@/engine/product-definitions";
import { FONT_CSS_MAP } from "@/engine/font-map";

const LED_SWATCHES: Record<string, string> = {
  "3000K": "#FFB46B",
  "3500K": "#FFC98E",
  "6000K": "#E3EEFF",
  Red: "#FF0000",
  Green: "#00FF00",
  Blue: "#0066FF",
  RGB: "conic-gradient(red, yellow, lime, cyan, blue, magenta, red)",
};

export function ChannelLetterOptions() {
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
    setVinyl,
    setBackground,
  } = useConfiguratorStore();

  const product = channelLetterProducts.find(
    (p) => p.slug === config.productType
  ) as ChannelLetterProduct;

  // Debounced text input (300ms)
  const [localText, setLocalText] = useState(config.text);
  const textTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const prevStoreText = useRef(config.text);

  // Sync local text when store changes externally (e.g. loading saved design)
  // eslint-disable-next-line react-hooks/refs -- standard pattern for syncing external state
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

  const hasOption = (key: string) =>
    product.options.some((o) => o.optionKey === key);

  const getOption = (key: string) =>
    product.options.find((o) => o.optionKey === key);

  // Check if a dependent option should be visible
  const isVisible = (key: string) => {
    const option = getOption(key);
    if (!option?.dependsOn) return true;
    return Object.entries(option.dependsOn).every(([depKey, allowedValues]) => {
      const currentValue = (config as unknown as Record<string, unknown>)[
        depKey
      ] as string;
      return allowedValues.includes(currentValue);
    });
  };

  return (
    <div className="space-y-6">
      {/* Product Type Selector */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Letter Type
        </label>
        <div className="grid grid-cols-2 gap-2">
          {channelLetterProducts.map((p) => (
            <button
              key={p.slug}
              onClick={() => setProductType(p.slug as ChannelLetterType)}
              title={
                p.slug === "front-lit-trim-cap"
                  ? "Decorative aluminum border around each letter face"
                  : undefined
              }
              className={`rounded-lg border px-3 py-2 text-left text-xs font-medium transition ${
                config.productType === p.slug
                  ? "border-blue-600 bg-blue-50 text-blue-700"
                  : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300"
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Text Input */}
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Sign Text
        </label>
        <input
          type="text"
          value={localText}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder="Enter your sign text..."
          className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
        />
      </div>

      {/* Height */}
      <div>
        <label className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-neutral-500">
          <span>Letter Height</span>
          <span className="text-sm font-bold text-neutral-900">
            {config.height}&quot;
          </span>
        </label>
        <input
          type="range"
          min={6}
          max={72}
          step={1}
          value={config.height}
          onChange={(e) => setHeight(Number(e.target.value))}
          className="w-full accent-blue-600"
        />
        <div className="mt-1 flex justify-between text-[10px] text-neutral-400">
          <span>6&quot;</span>
          <span>72&quot;</span>
        </div>
      </div>

      {/* Font */}
      {hasOption("font") && (
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Font Style
          </label>
          <div className="grid max-h-48 grid-cols-2 gap-2 overflow-y-auto pr-1">
            {getOption("font")?.possibleValues?.map((v) => (
              <button
                key={v.value}
                onClick={() => setFont(v.value as typeof config.font)}
                className={`rounded-lg border px-3 py-2 text-left transition ${
                  config.font === v.value
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                }`}
              >
                <span
                  className="block truncate text-sm"
                  style={{ fontFamily: FONT_CSS_MAP[v.value] || "inherit" }}
                >
                  {localText || "Abc"}
                </span>
                <span className="mt-0.5 block truncate text-[10px] text-neutral-400">
                  {v.label || v.value}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lit */}
      {hasOption("lit") && (
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Illumination
          </label>
          <div className="flex gap-2">
            {getOption("lit")?.possibleValues?.map((v) => (
              <button
                key={v.value}
                onClick={() => setLit(v.value as typeof config.lit)}
                className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                  config.lit === v.value
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                }`}
              >
                {v.value}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* LED Color */}
      {hasOption("led") && isVisible("led") && (
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            LED Color
          </label>
          <div className="grid grid-cols-2 gap-2">
            {getOption("led")?.possibleValues?.map((v) => (
              <button
                key={v.value}
                onClick={() => setLed(v.value as typeof config.led)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition ${
                  config.led === v.value
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                }`}
              >
                {LED_SWATCHES[v.value] && (
                  <span
                    className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-neutral-300"
                    style={{
                      background: LED_SWATCHES[v.value],
                    }}
                  />
                )}
                {v.label || v.value}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lit Sides */}
      {hasOption("lit_sides") && isVisible("lit_sides") && (
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Lit Sides
          </label>
          <div className="flex gap-2">
            {getOption("lit_sides")?.possibleValues?.map((v) => (
              <button
                key={v.value}
                onClick={() =>
                  setLitSides(v.value as typeof config.litSides)
                }
                title={
                  v.value === "Duo Lit"
                    ? "LED lighting on both front face and behind the letter"
                    : undefined
                }
                className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                  config.litSides === v.value
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                }`}
              >
                {v.value}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Side Depth */}
      {hasOption("side_depth") && (
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Side Depth
          </label>
          <div className="flex gap-2">
            {getOption("side_depth")?.possibleValues?.map((v) => (
              <button
                key={v.value}
                onClick={() => setSideDepth(v.value)}
                className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                  config.sideDepth === v.value
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                }`}
              >
                {v.value}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Raceway */}
      {hasOption("raceway") && (
        <div>
          <label
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500"
            title="Metal channel that holds and hides wiring behind the letters"
          >
            Raceway
          </label>
          <select
            value={config.raceway}
            onChange={(e) =>
              setRaceway(e.target.value as typeof config.raceway)
            }
            className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {getOption("raceway")?.possibleValues?.map((v) => (
              <option key={v.value} value={v.value}>
                {v.value === "-" ? "None" : v.value}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Vinyl */}
      {hasOption("vinyl") && isVisible("vinyl") && (
        <div>
          <label
            className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500"
            title="Translucent colored film applied over the letter face"
          >
            Vinyl
          </label>
          <select
            value={config.vinyl}
            onChange={(e) =>
              setVinyl(e.target.value as typeof config.vinyl)
            }
            className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {getOption("vinyl")?.possibleValues?.map((v) => (
              <option
                key={v.value}
                value={v.value}
                title={
                  v.value === "Perforated"
                    ? "One-way vision material — graphics visible outside, see-through inside"
                    : undefined
                }
              >
                {v.value === "-" ? "None" : v.value}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Painting */}
      {hasOption("painting") && (
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Painting
          </label>
          <select
            value={config.painting}
            onChange={(e) =>
              setPainting(e.target.value as typeof config.painting)
            }
            className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {getOption("painting")?.possibleValues?.map((v) => (
              <option key={v.value} value={v.value}>
                {v.value === "-" ? "None" : v.value}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Painting Colors */}
      {config.painting === "Painted Multicolor" && (
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Number of Colors
          </label>
          <input
            type="number"
            min={1}
            max={10}
            value={config.paintingColors}
            onChange={(e) => setPaintingColors(Number(e.target.value))}
            className="w-full rounded-lg border border-neutral-300 px-4 py-2.5 text-sm text-neutral-900 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>
      )}

      {/* Background */}
      {hasOption("background") && (
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Background Panel
          </label>
          <div className="flex gap-2">
            {getOption("background")?.possibleValues?.map((v) => (
              <button
                key={v.value}
                onClick={() => setBackground(v.value)}
                className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition ${
                  config.background === v.value
                    ? "border-blue-600 bg-blue-50 text-blue-700"
                    : "border-neutral-200 text-neutral-600 hover:border-neutral-300"
                }`}
              >
                {v.value === "-" ? "None" : v.value}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
