"use client";

import { useConfiguratorStore } from "@/stores/configurator-store";

export function DayNightToggle() {
  const sceneMode = useConfiguratorStore((s) => s.sceneMode);
  const setSceneMode = useConfiguratorStore((s) => s.setSceneMode);

  return (
    <button
      onClick={() => setSceneMode(sceneMode === "day" ? "night" : "day")}
      className="absolute top-3 right-3 z-10 flex items-center gap-2 rounded-full bg-white/90 backdrop-blur-sm px-3 py-1.5 text-sm font-medium shadow-md border border-gray-200 transition-all hover:bg-white hover:shadow-lg"
      aria-label={`Switch to ${sceneMode === "day" ? "night" : "day"} view`}
    >
      {sceneMode === "day" ? (
        <>
          <span className="text-base">☀️</span>
          <span>Day</span>
        </>
      ) : (
        <>
          <span className="text-base">🌙</span>
          <span>Night</span>
        </>
      )}
    </button>
  );
}
