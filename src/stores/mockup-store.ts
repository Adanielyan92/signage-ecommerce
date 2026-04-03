"use client";

import { create } from "zustand";
import type {
  WallTexture,
  InstallationRect,
  RealWorldDimensions,
} from "@/types/mockup";

interface MockupState {
  mode: "photo" | "scene";
  // Photo mode
  photoUrl: string | null;
  installationRect: InstallationRect | null;
  realWorldDimensions: RealWorldDimensions | null;
  // Scene mode
  wallTexture: WallTexture;
  wallWidthFt: number;
  wallHeightFt: number;
  signPositionX: number;
  signPositionY: number;
  showHumanRef: boolean;
  showDoorRef: boolean;

  // Actions
  setMode: (mode: "photo" | "scene") => void;
  setPhotoUrl: (url: string | null) => void;
  setInstallationRect: (rect: InstallationRect | null) => void;
  setRealWorldDimensions: (dims: RealWorldDimensions | null) => void;
  setWallTexture: (texture: WallTexture) => void;
  setWallDimensions: (width: number, height: number) => void;
  setSignPosition: (x: number, y: number) => void;
  setShowHumanRef: (show: boolean) => void;
  setShowDoorRef: (show: boolean) => void;
  resetMockup: () => void;
}

const defaultState = {
  mode: "scene" as const,
  photoUrl: null,
  installationRect: null,
  realWorldDimensions: null,
  wallTexture: "red-brick" as const,
  wallWidthFt: 20,
  wallHeightFt: 12,
  signPositionX: 0.5,
  signPositionY: 0.6,
  showHumanRef: true,
  showDoorRef: false,
};

export const useMockupStore = create<MockupState>((set) => ({
  ...defaultState,

  setMode: (mode) => set({ mode }),
  setPhotoUrl: (photoUrl) => set({ photoUrl }),
  setInstallationRect: (installationRect) => set({ installationRect }),
  setRealWorldDimensions: (realWorldDimensions) => set({ realWorldDimensions }),
  setWallTexture: (wallTexture) => set({ wallTexture }),
  setWallDimensions: (wallWidthFt, wallHeightFt) =>
    set({ wallWidthFt, wallHeightFt }),
  setSignPosition: (signPositionX, signPositionY) =>
    set({ signPositionX, signPositionY }),
  setShowHumanRef: (showHumanRef) => set({ showHumanRef }),
  setShowDoorRef: (showDoorRef) => set({ showDoorRef }),
  resetMockup: () => set({ ...defaultState }),
}));
