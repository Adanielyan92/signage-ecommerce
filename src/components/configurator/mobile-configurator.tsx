"use client";

import { useState } from "react";
import { ChevronUp, ChevronDown, Eye, Sliders } from "lucide-react";

interface MobileConfiguratorProps {
  sceneElement: React.ReactNode;
  optionsElement: React.ReactNode;
  priceElement: React.ReactNode;
}

/**
 * Mobile-first configurator layout with swipeable panels.
 * - Scene view takes top portion (adjustable height)
 * - Options panel slides up from bottom as a sheet
 * - Two mode tabs: "Preview" (3D scene) and "Options" (configuration)
 */
export function MobileConfigurator({
  sceneElement,
  optionsElement,
  priceElement,
}: MobileConfiguratorProps) {
  const [activeTab, setActiveTab] = useState<"preview" | "options">("options");
  const [sceneMinimized, setSceneMinimized] = useState(false);

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col lg:hidden">
      {/* 3D Scene area (collapsible) */}
      <div
        className={`relative bg-neutral-100 transition-all duration-300 ${
          sceneMinimized ? "h-24" : activeTab === "preview" ? "flex-1" : "h-[35vh]"
        }`}
      >
        {sceneElement}

        {/* Minimize/expand toggle */}
        <button
          onClick={() => setSceneMinimized(!sceneMinimized)}
          className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-brand-text-secondary shadow-sm backdrop-blur-sm"
        >
          {sceneMinimized ? (
            <>
              <ChevronDown className="h-3 w-3" /> Expand Preview
            </>
          ) : (
            <>
              <ChevronUp className="h-3 w-3" /> Minimize
            </>
          )}
        </button>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-brand-muted bg-white">
        <button
          onClick={() => { setActiveTab("preview"); setSceneMinimized(false); }}
          className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-semibold transition ${
            activeTab === "preview"
              ? "border-b-2 border-brand-accent text-brand-accent"
              : "text-brand-text-secondary"
          }`}
        >
          <Eye className="h-4 w-4" />
          3D Preview
        </button>
        <button
          onClick={() => setActiveTab("options")}
          className={`flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-semibold transition ${
            activeTab === "options"
              ? "border-b-2 border-brand-accent text-brand-accent"
              : "text-brand-text-secondary"
          }`}
        >
          <Sliders className="h-4 w-4" />
          Options
        </button>
      </div>

      {/* Options area (only when Options tab active) */}
      {activeTab === "options" && (
        <div className="flex-1 overflow-y-auto p-4 pb-40">
          {priceElement}
          <div className="mt-4">{optionsElement}</div>
        </div>
      )}
    </div>
  );
}
