"use client";

import { motion } from "framer-motion";
import { Download, FolderArchive, Gauge, RotateCcw, RotateCw, Search, Sparkles, Upload } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { BBS_ACTIONS } from "@/lib/types";
import { importArchive } from "@/lib/importer";
import { exportProjectZip } from "@/lib/exporter";
import { useStudioStore } from "@/lib/store";

const Viewport = dynamic(() => import("./Viewport").then((module) => module.Viewport), { ssr: false, loading: () => <div className="grid h-full place-items-center text-cyan-100">Starting WebGL viewport…</div> });

const categories = ["model", "particle", "texture", "animation", "material", "entity", "animation_controller", "render_controller"];

export default function StudioApp() {
  const { project, setProject, setSelectedAsset, setActiveAnimation, updateParticle, log, undo, redo } = useStudioStore();
  const [query, setQuery] = useState("");
  const selected = project.assets.find((asset) => asset.id === project.selectedAssetId);
  const counts = useMemo(() => Object.fromEntries(categories.map((kind) => [kind, project.assets.filter((asset) => asset.kind === kind).length])), [project.assets]);
  const filtered = project.assets.filter((asset) => `${asset.name} ${asset.normalizedPath} ${asset.kind}`.toLowerCase().includes(query.toLowerCase()));

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    if (!/\.(jar|zip|mcaddon|mcpack)$/i.test(file.name)) return log(`Rejected ${file.name}: expected .jar, .zip, .mcaddon, or .mcpack`);
    try {
      log(`Extracting ${file.name} with recursive smart scanner…`);
      setProject(await importArchive(file));
    } catch (error) {
      log(`Import failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async function exportZip() {
    const blob = await exportProjectZip(project);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${project.name.replace(/[^a-z0-9_-]+/gi, "_")}.zip`;
    anchor.click();
    URL.revokeObjectURL(url);
    log(`Exported ${anchor.download} with required BBS action animation files.`);
  }

  return (
    <main className="flex h-screen flex-col overflow-hidden p-3 text-slate-100">
      <header className="glass mb-3 flex items-center justify-between rounded-2xl px-4 py-3 shadow-glow">
        <div>
          <div className="flex items-center gap-2 text-xl font-black tracking-tight"><Sparkles className="text-neon" />BBS Studio Ultimate</div>
          <p className="text-xs text-slate-400">Universal Bedrock pack importer • linked model/animation/particle editor • BBS-safe ZIP exporter</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={undo} className="rounded-xl border border-white/10 px-3 py-2 text-sm hover:border-cyan-300/60"><RotateCcw size={16} /></button>
          <button onClick={redo} className="rounded-xl border border-white/10 px-3 py-2 text-sm hover:border-cyan-300/60"><RotateCw size={16} /></button>
          <label className="cursor-pointer rounded-xl bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 shadow-glow"><Upload className="mr-2 inline" size={16} />Import<input type="file" accept=".jar,.zip,.mcaddon,.mcpack" className="hidden" onChange={(event) => handleFiles(event.target.files)} /></label>
          <button onClick={exportZip} className="rounded-xl bg-violet px-4 py-2 text-sm font-bold text-white shadow-glow"><Download className="mr-2 inline" size={16} />Export ZIP</button>
        </div>
      </header>

      <section className="grid min-h-0 flex-1 grid-cols-[310px_minmax(0,1fr)_340px] gap-3">
        <aside className="glass flex min-h-0 flex-col rounded-2xl">
          <div className="border-b border-white/10 p-3">
            <div className="mb-3 flex items-center gap-2 font-bold"><FolderArchive className="text-neon" size={18} />Asset Explorer</div>
            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search linked assets…" className="w-full bg-transparent outline-none" /></label>
          </div>
          <div className="grid grid-cols-2 gap-2 p-3 text-xs">
            {categories.map((kind) => <button key={kind} className="rounded-xl border border-white/10 bg-white/[0.03] p-2 text-left capitalize"><span className="text-cyan-200">{counts[kind] ?? 0}</span> {kind.replace("_", " ")}</button>)}
          </div>
          <div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); handleFiles(event.dataTransfer.files); }} className="scrollbar min-h-0 flex-1 space-y-1 overflow-auto p-3 pt-0">
            {filtered.map((asset) => <button key={asset.id} onClick={() => setSelectedAsset(asset.id)} className={`w-full rounded-xl border p-2 text-left text-xs transition ${asset.id === project.selectedAssetId ? "border-cyan-300 bg-cyan-300/10" : "border-white/10 bg-white/[0.025] hover:border-cyan-300/50"}`}><div className="font-semibold text-slate-100">{asset.name}</div><div className="truncate text-slate-500">{asset.kind} • {(asset.size / 1024).toFixed(1)} KB • {asset.normalizedPath}</div></button>)}
            {!filtered.length && <div className="rounded-xl border border-dashed border-cyan-300/30 p-6 text-center text-sm text-slate-400">Drop a supported archive to recursively detect models, textures, animations, controllers, particles, entities, and materials.</div>}
          </div>
        </aside>

        <section className="glass relative min-h-0 overflow-hidden rounded-2xl">
          <div className="absolute left-4 top-4 z-10 flex gap-2 text-xs"><span className="rounded-full bg-black/60 px-3 py-1">WebGL</span><span className="rounded-full bg-black/60 px-3 py-1">Orbit • Pan • Zoom • Shadows</span><span className="rounded-full bg-black/60 px-3 py-1">Animation: {project.activeAnimation}</span></div>
          <Viewport project={project} />
        </section>

        <aside className="glass flex min-h-0 flex-col rounded-2xl">
          <div className="border-b border-white/10 p-4"><div className="font-bold">Properties</div><div className="text-xs text-slate-400">{selected ? selected.normalizedPath : "Project controls and smart links"}</div></div>
          <div className="scrollbar min-h-0 flex-1 space-y-5 overflow-auto p-4">
            <section><h3 className="mb-2 text-sm font-bold text-cyan-200">BBS Action Animations</h3><div className="grid grid-cols-2 gap-2">{BBS_ACTIONS.map((action) => <button key={action} onClick={() => setActiveAnimation(action)} className={`rounded-xl border px-3 py-2 text-xs font-semibold ${project.activeAnimation === action ? "border-cyan-300 bg-cyan-300/20" : "border-white/10 bg-white/[0.03]"}`}>{action}</button>)}</div></section>
            <section><h3 className="mb-2 text-sm font-bold text-cyan-200">Particle Studio</h3><div className="space-y-3 text-xs">{(["rate", "lifetime", "gravity", "speed", "spread", "scale", "bloom"] as const).map((key) => <label key={key} className="block capitalize"><span className="mb-1 flex justify-between"><span>{key}</span><span>{project.particle[key]}</span></span><input type="range" min={key === "gravity" ? -2 : 0} max={key === "rate" ? 1200 : key === "lifetime" ? 8 : 4} step="0.01" value={project.particle[key]} onChange={(event) => updateParticle({ [key]: Number(event.target.value) })} className="w-full accent-cyan-300" /></label>)}<select value={project.particle.emitter} onChange={(event) => updateParticle({ emitter: event.target.value as never })} className="w-full rounded-xl border border-white/10 bg-slate-950 p-2"><option>sphere</option><option>box</option><option>cone</option></select></div></section>
            <section><h3 className="mb-2 text-sm font-bold text-cyan-200">Smart Link Graph</h3><div className="space-y-2 text-xs text-slate-300"><div>{Object.keys(project.links.modelToTextures).length} models mapped to textures</div><div>{Object.keys(project.links.animationToAction).length} BBS action animations preserved</div><div>{Object.keys(project.links.entityToGeometry).length} entities mapped to geometry</div><div>{project.links.missingReferences.length} unresolved references</div></div></section>
            {selected?.dataUrl && <img src={selected.dataUrl} alt={selected.name} className="w-full rounded-xl border border-white/10 bg-black/40 object-contain" />}
          </div>
        </aside>
      </section>

      <footer className="glass mt-3 grid h-32 grid-cols-[1fr_360px] overflow-hidden rounded-2xl">
        <div className="border-r border-white/10 p-3"><div className="mb-2 text-sm font-bold">Timeline</div><div className="flex h-16 items-center gap-1 rounded-xl bg-black/25 p-2">{Array.from({ length: 48 }).map((_, index) => <motion.div key={index} className="h-full flex-1 rounded bg-cyan-300/20" animate={{ opacity: index % 6 === 0 ? 0.9 : 0.25 }} />)}</div></div>
        <div className="scrollbar overflow-auto p-3 text-xs"><div className="mb-2 flex items-center gap-2 font-bold"><Gauge size={15} />Console</div>{project.console.map((line, index) => <div key={`${line}-${index}`} className="text-slate-400">› {line}</div>)}</div>
      </footer>
    </main>
  );
}
