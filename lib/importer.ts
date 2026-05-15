import JSZip from "jszip";
import { AssetFile, AssetKind, BBS_ACTIONS, LinkGraph, StudioProject } from "./types";

const imageExt = /\.(png|jpe?g|tga|webp)$/i;
const jsonExt = /\.(json|material)$/i;

export function normalizePath(path: string) {
  return path.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+/g, "/");
}

export function classifyAsset(path: string, json?: unknown): AssetKind {
  const normalized = normalizePath(path).toLowerCase();
  if (imageExt.test(normalized) || normalized.includes("/textures/")) return "texture";
  if (normalized.endsWith("manifest.json")) return "manifest";
  if (normalized.includes("animation_controllers/")) return "animation_controller";
  if (normalized.includes("render_controllers/")) return "render_controller";
  if (normalized.includes("particles/") || normalized.includes("particle")) return "particle";
  if (normalized.includes("animations/") || /\.animation\.json$/i.test(normalized)) return "animation";
  if (normalized.includes("materials/") || normalized.endsWith(".material")) return "material";
  if (normalized.includes("attachables/")) return "attachable";
  if (normalized.includes("entities/") || normalized.includes("/entity/")) return "entity";
  if (normalized.includes("models/") || normalized.includes("geometry/") || hasKey(json, "minecraft:geometry")) return "model";
  return "unknown";
}

function hasKey(value: unknown, key: string): boolean {
  if (!value || typeof value !== "object") return false;
  if (Object.prototype.hasOwnProperty.call(value, key)) return true;
  return Object.values(value as Record<string, unknown>).some((entry) => hasKey(entry, key));
}

function collectStrings(value: unknown, output = new Set<string>()): Set<string> {
  if (typeof value === "string") output.add(value);
  else if (Array.isArray(value)) value.forEach((entry) => collectStrings(entry, output));
  else if (value && typeof value === "object") Object.values(value as Record<string, unknown>).forEach((entry) => collectStrings(entry, output));
  return output;
}

function token(path: string) {
  return normalizePath(path).toLowerCase().split("/").pop()?.replace(/\.(geo|animation|json|png|jpg|jpeg|webp|tga|material)$/g, "").replace(/^(geometry\.|animation\.)/, "") ?? path;
}

function findReferencedAssets(source: AssetFile, candidates: AssetFile[], accepted: AssetKind[]) {
  const strings = source.json ? [...collectStrings(source.json)] : [];
  const lowered = strings.map((item) => normalizePath(item).toLowerCase());
  return candidates
    .filter((asset) => accepted.includes(asset.kind))
    .filter((asset) => {
      const path = asset.normalizedPath.toLowerCase();
      const base = token(path);
      return lowered.some((ref) => path.endsWith(ref) || ref.endsWith(path) || ref.includes(base) || path.includes(ref));
    })
    .map((asset) => asset.id);
}

function inferByName(source: AssetFile, candidates: AssetFile[], accepted: AssetKind[]) {
  const sourceToken = token(source.normalizedPath);
  return candidates
    .filter((asset) => accepted.includes(asset.kind))
    .filter((asset) => token(asset.normalizedPath) === sourceToken || asset.normalizedPath.toLowerCase().includes(sourceToken))
    .map((asset) => asset.id);
}

export function buildLinkGraph(assets: AssetFile[]): LinkGraph {
  const graph: LinkGraph = {
    modelToTextures: {},
    modelToAnimations: {},
    modelToEntity: {},
    animationToAction: {},
    particleToTextures: {},
    entityToGeometry: {},
    entityToControllers: {},
    renderControllerToMaterials: {},
    missingReferences: []
  };

  for (const asset of assets) {
    if (asset.kind === "model") {
      graph.modelToTextures[asset.id] = findReferencedAssets(asset, assets, ["texture"]);
      graph.modelToAnimations[asset.id] = [...new Set([...findReferencedAssets(asset, assets, ["animation"]), ...inferByName(asset, assets, ["animation"])])];
      graph.modelToEntity[asset.id] = [...new Set([...findReferencedAssets(asset, assets, ["entity"]), ...inferByName(asset, assets, ["entity"])])];
    }
    if (asset.kind === "animation") {
      const action = BBS_ACTIONS.find((name) => token(asset.normalizedPath) === name || asset.normalizedPath.toLowerCase().includes(`${name}.animation.json`));
      if (action) graph.animationToAction[asset.id] = action;
    }
    if (asset.kind === "particle") graph.particleToTextures[asset.id] = findReferencedAssets(asset, assets, ["texture"]);
    if (asset.kind === "entity") {
      graph.entityToGeometry[asset.id] = findReferencedAssets(asset, assets, ["model"]);
      graph.entityToControllers[asset.id] = findReferencedAssets(asset, assets, ["animation_controller", "render_controller"]);
    }
    if (asset.kind === "render_controller") graph.renderControllerToMaterials[asset.id] = findReferencedAssets(asset, assets, ["material"]);
  }

  const referenced = assets.flatMap((asset) => (asset.json ? [...collectStrings(asset.json)] : []));
  for (const ref of referenced) {
    const normalized = normalizePath(ref).toLowerCase();
    if ((normalized.includes("textures/") || normalized.includes("animations/") || normalized.includes("geometry.")) && !assets.some((asset) => asset.normalizedPath.toLowerCase().endsWith(normalized))) {
      graph.missingReferences.push(ref);
    }
  }

  return graph;
}

export async function importArchive(file: File): Promise<StudioProject> {
  const zip = await JSZip.loadAsync(file);
  const assets: AssetFile[] = [];
  const entries = (Object.values(zip.files) as Array<{ dir: boolean; name: string; async: (type: "uint8array" | "string") => Promise<Uint8Array | string> }>).filter((entry) => !entry.dir && !entry.name.includes("__MACOSX"));

  await Promise.all(entries.map(async (entry) => {
    const path = normalizePath(entry.name);
    const bytes = new Uint8Array((await entry.async("uint8array")) as Uint8Array);
    let text: string | undefined;
    let json: unknown;
    let dataUrl: string | undefined;

    if (jsonExt.test(path)) {
      text = (await entry.async("string")) as string;
      try { json = JSON.parse(text); } catch { json = undefined; }
    }
    if (imageExt.test(path)) {
      const blob = new Blob([bytes]);
      dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.readAsDataURL(blob);
      });
    }

    assets.push({
      id: crypto.randomUUID(),
      name: path.split("/").pop() ?? path,
      path,
      normalizedPath: path,
      kind: classifyAsset(path, json),
      text,
      dataUrl,
      bytes,
      json,
      size: bytes.byteLength
    });
  }));

  assets.sort((a, b) => a.normalizedPath.localeCompare(b.normalizedPath));
  const links = buildLinkGraph(assets);
  return {
    name: file.name.replace(/\.(jar|zip|mcaddon|mcpack)$/i, "") || "bbs_project",
    importedAt: new Date().toISOString(),
    assets,
    links,
    activeAnimation: "idle",
    fps: 24,
    particle: { emitter: "sphere", rate: 420, lifetime: 1.35, gravity: -0.15, speed: 1.8, spread: 0.7, scale: 1, bloom: 0.35, trails: true, collision: false },
    console: [`Imported ${assets.length} files from ${file.name}`, `Linked ${Object.keys(links.animationToAction).length} BBS action animations`]
  };
}
