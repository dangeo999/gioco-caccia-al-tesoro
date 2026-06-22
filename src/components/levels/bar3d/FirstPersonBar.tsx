"use client";

import FirstPersonStage, { Obj } from "./FirstPersonStage";
import ScannedWorld from "./ScannedWorld";
import { BAR_WORLD_ASSETS } from "./worldAssets";

export type HotspotId = "neon" | "bottles" | "chalk" | "jukebox" | "drawer";

function PlaceholderRoom() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#3a2a1a" />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 3, 0]}>
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial color="#15151f" />
      </mesh>
      <mesh position={[0, 1.5, -5]}><boxGeometry args={[10, 3, 0.2]} /><meshStandardMaterial color="#33333f" /></mesh>
      <mesh position={[0, 1.5, 5]}><boxGeometry args={[10, 3, 0.2]} /><meshStandardMaterial color="#33333f" /></mesh>
      <mesh position={[-5, 1.5, 0]}><boxGeometry args={[0.2, 3, 10]} /><meshStandardMaterial color="#2e2e3a" /></mesh>
      <mesh position={[5, 1.5, 0]}><boxGeometry args={[0.2, 3, 10]} /><meshStandardMaterial color="#2e2e3a" /></mesh>
      <mesh position={[0, 0.6, -3]}><boxGeometry args={[6, 1.2, 0.8]} /><meshStandardMaterial color="#4a3014" /></mesh>
    </>
  );
}

function BarRoom({ onInteract }: { onInteract: (id: HotspotId) => void }) {
  const scanned = BAR_WORLD_ASSETS.interior.visual;
  const hotspotOpacity = scanned ? 0.025 : 1;
  return (
    <>
      <color attach="background" args={["#0a0a0e"]} />
      <fog attach="fog" args={["#0a0a0e", 6, 16]} />
      <ambientLight intensity={0.6} />
      <pointLight position={[0, 2.7, 0]} intensity={18} distance={14} color="#ffd9a0" />
      <pointLight position={[0, 2.2, -4.3]} intensity={10} distance={8} color="#22d3ee" />

      {scanned ? <ScannedWorld asset={scanned} /> : <PlaceholderRoom />}

      <Obj onClick={() => onInteract("neon")} position={[0, 2.3, -4.85]} size={[2.4, 0.5, 0.1]} color="#0a3a40" emissive="#22d3ee" label="Insegna" labelY={0.6} opacity={hotspotOpacity} />
      <Obj onClick={() => onInteract("bottles")} position={[-2.4, 1.6, -4.7]} size={[1.6, 1.2, 0.2]} color="#23232e" label="Bottiglie" labelY={0.9} opacity={hotspotOpacity} />
      <Obj onClick={() => onInteract("chalk")} position={[-4.85, 1.6, 0]} size={[0.1, 1.2, 1.8]} color="#101014" label="Lavagna" labelY={0.9} opacity={hotspotOpacity} />
      <Obj onClick={() => onInteract("jukebox")} position={[3.6, 0.9, -3.8]} size={[1, 1.8, 0.8]} color="#2a1530" emissive="#3a0a3a" label="Jukebox" labelY={1.2} opacity={hotspotOpacity} />
      <Obj onClick={() => onInteract("drawer")} position={[1.6, 0.55, -2.65]} size={[1, 0.4, 0.1]} color="#5a3d22" emissive="#1a1206" label="Cassetto" labelY={0.5} opacity={hotspotOpacity} />
    </>
  );
}

export default function FirstPersonBar({
  onInteract,
  onExit,
}: {
  onInteract: (id: HotspotId) => void;
  onExit: () => void;
}) {
  return (
    <FirstPersonStage
      onExit={onExit}
      exitLabel="‹ torna fuori"
      hint="Esplora il bar · guarda un oggetto e premi USA"
      obstacles={[{ minX: -3.3, maxX: 3.3, minZ: -3.5, maxZ: -2.45 }]}
    >
      <BarRoom onInteract={onInteract} />
    </FirstPersonStage>
  );
}
