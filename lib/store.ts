"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { BBS_ACTIONS, StudioProject } from "./types";

const sampleProject: StudioProject = {
  name: "BBS Studio Sample",
  importedAt: new Date().toISOString(),
  assets: [],
  links: { modelToTextures: {}, modelToAnimations: {}, modelToEntity: {}, animationToAction: {}, particleToTextures: {}, entityToGeometry: {}, entityToControllers: {}, renderControllerToMaterials: {}, missingReferences: [] },
  activeAnimation: BBS_ACTIONS[0],
  fps: 24,
  particle: { emitter: "sphere", rate: 420, lifetime: 1.35, gravity: -0.15, speed: 1.8, spread: 0.7, scale: 1, bloom: 0.35, trails: true, collision: false },
  console: ["Ready. Drop a .jar, .zip, .mcaddon, or .mcpack to build a linked Bedrock project."]
};

type StudioState = {
  project: StudioProject;
  history: StudioProject[];
  future: StudioProject[];
  setProject: (project: StudioProject) => void;
  setSelectedAsset: (id?: string) => void;
  setActiveAnimation: (name: string) => void;
  updateParticle: (patch: Partial<StudioProject["particle"]>) => void;
  log: (message: string) => void;
  undo: () => void;
  redo: () => void;
};

export const useStudioStore = create<StudioState>()(persist((set, get) => ({
  project: sampleProject,
  history: [],
  future: [],
  setProject: (project) => set((state) => ({ project, history: [...state.history, state.project].slice(-25), future: [] })),
  setSelectedAsset: (id) => set((state) => ({ project: { ...state.project, selectedAssetId: id } })),
  setActiveAnimation: (name) => set((state) => ({ project: { ...state.project, activeAnimation: name, console: [`Playing ${name}`, ...state.project.console].slice(0, 80) } })),
  updateParticle: (patch) => set((state) => ({ project: { ...state.project, particle: { ...state.project.particle, ...patch } } })),
  log: (message) => set((state) => ({ project: { ...state.project, console: [message, ...state.project.console].slice(0, 80) } })),
  undo: () => {
    const { history, project, future } = get();
    const previous = history.at(-1);
    if (previous) set({ project: previous, history: history.slice(0, -1), future: [project, ...future].slice(0, 25) });
  },
  redo: () => {
    const { future, project, history } = get();
    const next = future[0];
    if (next) set({ project: next, future: future.slice(1), history: [...history, project].slice(-25) });
  }
}), {
  name: "bbs-studio-autosave",
  partialize: (state) => ({
    project: {
      ...state.project,
      assets: state.project.assets.map((asset) => ({ ...asset, bytes: undefined }))
    }
  })
}));
