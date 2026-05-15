import JSZip from "jszip";
import { AssetFile, BBS_ACTIONS, StudioProject } from "./types";
import { normalizePath } from "./importer";

const folders = ["models", "textures", "particles", "animations", "animation_controllers", "render_controllers", "entities", "materials"] as const;

function bytesFromDataUrl(dataUrl?: string) {
  if (!dataUrl) return undefined;
  const [, payload] = dataUrl.split(",");
  if (!payload) return undefined;
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function exportPath(asset: AssetFile, project: StudioProject) {
  const path = normalizePath(asset.normalizedPath);
  const lower = path.toLowerCase();
  const after = (folder: string) => path.slice(lower.indexOf(`${folder}/`) + folder.length + 1);
  if (asset.kind === "texture") return lower.includes("textures/") ? `textures/${after("textures")}` : `textures/entity/${asset.name}`;
  if (asset.kind === "model") return lower.includes("models/") ? `models/${after("models")}` : lower.includes("geometry/") ? `models/${asset.name}` : `models/${asset.name}`;
  if (asset.kind === "particle") return lower.includes("particles/") ? `particles/${after("particles")}` : `particles/${asset.name}`;
  if (asset.kind === "animation") {
    const action = project.links.animationToAction[asset.id];
    return action ? `animations/${action}.animation.json` : lower.includes("animations/") ? `animations/${after("animations")}` : `animations/${asset.name}`;
  }
  if (asset.kind === "animation_controller") return lower.includes("animation_controllers/") ? `animation_controllers/${after("animation_controllers")}` : `animation_controllers/${asset.name}`;
  if (asset.kind === "render_controller") return lower.includes("render_controllers/") ? `render_controllers/${after("render_controllers")}` : `render_controllers/${asset.name}`;
  if (asset.kind === "entity") return lower.includes("entities/") ? `entities/${after("entities")}` : `entities/${asset.name}`;
  if (asset.kind === "material") return lower.includes("materials/") ? `materials/${after("materials")}` : `materials/${asset.name}`;
  if (asset.kind === "manifest") return "manifest.json";
  return `extras/${path}`;
}

function defaultAnimation(action: string) {
  return JSON.stringify({
    format_version: "1.8.0",
    animations: {
      [`animation.bbs.${action}`]: {
        loop: ["idle", "running", "sprinting", "crouching_idle", "crouching", "falling"].includes(action),
        animation_length: 1,
        bones: {}
      }
    }
  }, null, 2);
}

function defaultManifest(projectName: string) {
  const uuid = () => crypto.randomUUID();
  return JSON.stringify({
    format_version: 2,
    header: { name: projectName, description: "Exported by BBS Studio Ultimate", uuid: uuid(), version: [1, 0, 0], min_engine_version: [1, 20, 0] },
    modules: [{ type: "resources", uuid: uuid(), version: [1, 0, 0] }]
  }, null, 2);
}

export async function exportProjectZip(project: StudioProject): Promise<Blob> {
  const zip = new JSZip();
  folders.forEach((folder) => zip.folder(folder));
  const used = new Set<string>();

  for (const asset of project.assets) {
    const content = asset.bytes ?? bytesFromDataUrl(asset.dataUrl) ?? asset.text;
    if (!content) continue;
    const path = exportPath(asset, project);
    used.add(path);
    zip.file(path, content);
  }

  for (const action of BBS_ACTIONS) {
    const path = `animations/${action}.animation.json`;
    if (!used.has(path)) zip.file(path, defaultAnimation(action));
  }
  if (!used.has("manifest.json")) zip.file("manifest.json", defaultManifest(project.name));
  zip.file("bbs-studio-links.json", JSON.stringify({ name: project.name, exportedAt: new Date().toISOString(), links: project.links }, null, 2));

  return zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 7 } });
}
