export const BBS_ACTIONS = [
  "idle",
  "running",
  "sprinting",
  "crouching_idle",
  "crouching",
  "falling",
  "swipe",
  "jump"
] as const;

export type AssetKind =
  | "model"
  | "texture"
  | "particle"
  | "animation"
  | "animation_controller"
  | "render_controller"
  | "entity"
  | "material"
  | "attachable"
  | "manifest"
  | "unknown";

export type AssetFile = {
  id: string;
  name: string;
  path: string;
  normalizedPath: string;
  kind: AssetKind;
  text?: string;
  dataUrl?: string;
  bytes?: Uint8Array;
  json?: unknown;
  size: number;
};

export type LinkGraph = {
  modelToTextures: Record<string, string[]>;
  modelToAnimations: Record<string, string[]>;
  modelToEntity: Record<string, string[]>;
  animationToAction: Record<string, string>;
  particleToTextures: Record<string, string[]>;
  entityToGeometry: Record<string, string[]>;
  entityToControllers: Record<string, string[]>;
  renderControllerToMaterials: Record<string, string[]>;
  missingReferences: string[];
};

export type ParticleSettings = {
  emitter: "sphere" | "box" | "cone";
  rate: number;
  lifetime: number;
  gravity: number;
  speed: number;
  spread: number;
  scale: number;
  bloom: number;
  trails: boolean;
  collision: boolean;
};

export type StudioProject = {
  name: string;
  importedAt: string;
  assets: AssetFile[];
  links: LinkGraph;
  selectedAssetId?: string;
  activeAnimation: string;
  fps: number;
  particle: ParticleSettings;
  console: string[];
};
