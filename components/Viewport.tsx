"use client";

import { OrbitControls, Grid, PerspectiveCamera, Html } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { memo, useMemo, useRef } from "react";
import * as THREE from "three";
import { StudioProject } from "@/lib/types";

function AnimatedRig({ project }: { project: StudioProject }) {
  const group = useRef<THREE.Group>(null);
  const texture = project.assets.find((asset) => asset.kind === "texture" && asset.dataUrl);
  const map = useMemo(() => texture?.dataUrl ? new THREE.TextureLoader().load(texture.dataUrl) : undefined, [texture?.dataUrl]);
  const color = project.activeAnimation === "swipe" ? "#ff788b" : project.activeAnimation === "jump" ? "#65e4ff" : "#9dfc8f";

  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    const speed = project.activeAnimation === "sprinting" ? 9 : project.activeAnimation === "running" ? 6 : 2;
    group.current.rotation.y = Math.sin(t * 0.35) * 0.18;
    group.current.position.y = project.activeAnimation === "jump" ? Math.abs(Math.sin(t * 3)) * 0.8 : Math.sin(t * speed) * 0.035;
    group.current.rotation.z = project.activeAnimation === "swipe" ? Math.sin(t * 9) * 0.24 : 0;
  });

  return (
    <group ref={group}>
      <mesh position={[0, 1.45, 0]} castShadow>
        <boxGeometry args={[1.15, 1.7, 0.62]} />
        <meshStandardMaterial color={map ? "white" : color} map={map} roughness={0.48} metalness={0.05} />
      </mesh>
      <mesh position={[0, 2.55, 0]} castShadow>
        <boxGeometry args={[0.82, 0.82, 0.82]} />
        <meshStandardMaterial color="#f6d7b0" map={map} roughness={0.5} />
      </mesh>
      {[-0.86, 0.86].map((x) => <mesh key={x} position={[x, 1.46, 0]} rotation-z={project.activeAnimation === "swipe" ? x * Math.sin(Date.now()) : 0} castShadow><boxGeometry args={[0.34, 1.45, 0.34]} /><meshStandardMaterial color="#7dd3fc" /></mesh>)}
      {[-0.34, 0.34].map((x) => <mesh key={x} position={[x, 0.25, 0]} castShadow><boxGeometry args={[0.36, 1.35, 0.36]} /><meshStandardMaterial color="#a78bfa" /></mesh>)}
      <Html position={[0, 3.35, 0]} center><span className="rounded-full border border-cyan-300/30 bg-black/60 px-3 py-1 text-xs text-cyan-100">{project.activeAnimation}</span></Html>
    </group>
  );
}

function ParticleField({ project }: { project: StudioProject }) {
  const points = useRef<THREE.Points>(null);
  const count = Math.min(2500, Math.max(120, project.particle.rate * 3));
  const positions = useMemo(() => {
    const array = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = Math.random() * project.particle.spread + 0.25;
      array[i * 3] = (Math.random() - 0.5) * (project.particle.emitter === "box" ? 3 : r);
      array[i * 3 + 1] = Math.random() * 2.2;
      array[i * 3 + 2] = (Math.random() - 0.5) * (project.particle.emitter === "cone" ? 1.2 + array[i * 3 + 1] : r);
    }
    return array;
  }, [count, project.particle.emitter, project.particle.spread]);

  useFrame(({ clock }) => {
    if (!points.current) return;
    const attr = points.current.geometry.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < count; i++) {
      const y = attr.getY(i) + 0.008 * project.particle.speed + project.particle.gravity * 0.0008;
      attr.setY(i, y > 2.4 ? 0 : Math.max(project.particle.collision ? 0 : -1.2, y));
    }
    points.current.rotation.y = clock.elapsedTime * 0.18;
    attr.needsUpdate = true;
  });

  return <points ref={points}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial color="#65e4ff" size={0.035 * project.particle.scale} transparent opacity={0.72 + project.particle.bloom * 0.2} /></points>;
}

export const Viewport = memo(function Viewport({ project }: { project: StudioProject }) {
  return (
    <Canvas shadows dpr={[1, 1.75]} gl={{ antialias: true, powerPreference: "high-performance" }}>
      <PerspectiveCamera makeDefault position={[4.2, 3.1, 5.2]} fov={45} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 7, 3]} intensity={1.7} castShadow />
      <spotLight position={[-3, 4, -2]} intensity={1.2} color="#a277ff" />
      <Grid args={[16, 16]} cellColor="#1d4ed8" sectionColor="#65e4ff" fadeDistance={18} fadeStrength={1.4} />
      <AnimatedRig project={project} />
      <ParticleField project={project} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
    </Canvas>
  );
});
