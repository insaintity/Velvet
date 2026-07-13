"use client";

import { create } from "zustand";

type PlayerState = {
  isPlaying: boolean;
  positionSeconds: number;
  volume: number;
  togglePlaying: () => void;
  seek: (seconds: number) => void;
  setVolume: (volume: number) => void;
};

export const usePlayerStore = create<PlayerState>((set) => ({
  isPlaying: false,
  positionSeconds: 0,
  volume: 78,
  togglePlaying: () => set((state) => ({ isPlaying: !state.isPlaying })),
  seek: (seconds) => set({ positionSeconds: seconds }),
  setVolume: (volume) => set({ volume })
}));
