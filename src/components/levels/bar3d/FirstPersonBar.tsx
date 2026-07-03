"use client";

import { useMemo } from "react";
import * as THREE from "three";
import FirstPersonStage, { type Obstacle } from "./FirstPersonStage";
import ScannedWorld from "./ScannedWorld";
import { BAR_WORLD_ASSETS } from "./worldAssets";

export type HotspotId = "neon" | "bottles" | "chalk" | "jukebox" | "drawer";

const ROOM_MIN_X = -4.48;
const ROOM_MAX_X = 4.49;
const ROOM_MIN_Z = -2.57;
const ROOM_MAX_Z = 2.56;
const WALL_WHITE = "#f2eee4";
const FLOOR_FILL = "#b3926f";
const FLOOR_EXTRA_X = 1.8;
const FLOOR_EXTRA_Z = 1.4;
const FLOOR_Y = -0.012;
const RIGHT_VAULT_COLOR = "#b58b55";

function makeSubtleNoiseTexture(
  base: [number, number, number],
  shade: [number, number, number],
  repeatX: number,
  repeatY: number,
) {
  const size = 192;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const img = ctx.createImageData(size, size);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const grain = ((x * 17 + y * 31 + ((x * y) % 23)) % 37) / 36;
      const wave = (Math.sin(x * 0.18) + Math.sin(y * 0.11)) * 0.08;
      const t = Math.max(0, Math.min(1, grain * 0.28 + 0.36 + wave));
      const k = (y * size + x) * 4;
      img.data[k] = shade[0] + (base[0] - shade[0]) * t;
      img.data[k + 1] = shade[1] + (base[1] - shade[1]) * t;
      img.data[k + 2] = shade[2] + (base[2] - shade[2]) * t;
      img.data[k + 3] = 255;
    }
  }

  ctx.putImageData(img, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX, repeatY);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// Texture pavimento: piastrelle grigie (tono FLOOR_FILL) con fughe scure e grana
// fine, così il piano di riempimento legge come lo stesso pavimento dello scan.
function makeFloorTexture(repeatX: number, repeatY: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  // base
  ctx.fillStyle = "#b3926f";
  ctx.fillRect(0, 0, size, size);
  // grana fine
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const g = (Math.random() - 0.5) * 14;
    img.data[i] += g;
    img.data[i + 1] += g;
    img.data[i + 2] += g;
  }
  ctx.putImageData(img, 0, 0);
  // Fughe molto leggere: appena accennate, così non rivelano il giunto con lo scan.
  ctx.strokeStyle = "rgba(90,86,80,0.28)";
  ctx.lineWidth = 1.5;
  const step = size / 2;
  for (let p = 0; p <= size; p += step) {
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function WallFill({
  position,
  size,
}: {
  position: [number, number, number];
  size: [number, number, number];
}) {
  return (
    <mesh position={position} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={WALL_WHITE} roughness={0.92} side={THREE.DoubleSide} />
    </mesh>
  );
}

function RoomFill() {
  const vaultMap = useMemo(
    () => makeSubtleNoiseTexture([196, 153, 95], [126, 91, 55], 6, 3),
    [],
  );
  const floorMap = useMemo(
    () =>
      makeFloorTexture(
        ROOM_MAX_X - ROOM_MIN_X + FLOOR_EXTRA_X,
        ROOM_MAX_Z - ROOM_MIN_Z + FLOOR_EXTRA_Z,
      ),
    [],
  );

  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, FLOOR_Y, 0]} receiveShadow>
        <planeGeometry
          args={[
            ROOM_MAX_X - ROOM_MIN_X + FLOOR_EXTRA_X,
            ROOM_MAX_Z - ROOM_MIN_Z + FLOOR_EXTRA_Z,
          ]}
        />
        {/* color bianco = moltiplicatore neutro: il tono sta solo nella texture,
            così il floor rende esattamente #b3926f (nessuna doppia moltiplica). */}
        <meshBasicMaterial
          color="#ffffff"
          map={floorMap}
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <WallFill
        position={[0, 1.18, ROOM_MIN_Z - 0.07]}
        size={[ROOM_MAX_X - ROOM_MIN_X + 0.2, 2.36, 0.14]}
      />
      <WallFill
        position={[0, 1.18, ROOM_MAX_Z + 0.07]}
        size={[ROOM_MAX_X - ROOM_MIN_X + 0.2, 2.36, 0.14]}
      />
      <WallFill
        position={[ROOM_MIN_X - 0.07, 1.18, 0]}
        size={[0.14, 2.36, ROOM_MAX_Z - ROOM_MIN_Z + 0.2]}
      />
      <WallFill
        position={[ROOM_MAX_X + 0.07, 1.18, 0]}
        size={[0.14, 2.36, ROOM_MAX_Z - ROOM_MIN_Z + 0.2]}
      />

      {/* Solo il vano destro: il soffitto del vano sinistro resta quello del GLB. */}
      <mesh position={[1.92, -0.22, -0.04]} rotation={[0, 0, Math.PI / 2]} receiveShadow>
        <cylinderGeometry args={[3.55, 3.55, 5.16, 48, 1, true, Math.PI / 4, Math.PI / 2]} />
        <meshStandardMaterial
          color={RIGHT_VAULT_COLOR}
          map={vaultMap}
          roughness={1}
          side={THREE.DoubleSide}
        />
      </mesh>
    </>
  );
}

// ===== Interno del Port Royal =====
// Modello scansionato (04_bar_interno.glb) + luci.
function BarRoom() {
  const scanned = BAR_WORLD_ASSETS.interior.visual;
  return (
    <>
      <color attach="background" args={["#07070b"]} />
      <fog attach="fog" args={["#07070b", 7, 20]} />
      <ambientLight intensity={0.5} color="#9a8d7a" />
      <pointLight position={[0, 2.4, -1.5]} intensity={16} distance={12} color="#ffd9a0" />
      <pointLight position={[-2, 2.1, -2.2]} intensity={8} distance={8} color="#22d3ee" />
      <pointLight position={[0, 2.6, 1.4]} intensity={10} distance={11} color="#ffc89a" />

      <RoomFill />
      {scanned && <ScannedWorld asset={scanned} />}
      {DEBUG_COLLIDERS &&
        OBSTACLES.map((o, i) => (
          <mesh
            key={i}
            position={[(o.minX + o.maxX) / 2, 1.0, (o.minZ + o.maxZ) / 2]}
          >
            <boxGeometry args={[o.maxX - o.minX, 2.0, o.maxZ - o.minZ]} />
            <meshStandardMaterial color="#ff2244" transparent opacity={0.35} />
          </mesh>
        ))}
    </>
  );
}

const DEBUG_COLLIDERS = false;

// Collisioni derivate dalla geometria reale dello scan: vertici nella fascia
// arredi (y 0.35–1.35 m) proiettati su una griglia XZ e fusi in rettangoli.
// Seguono muri, bancone, vetrina, scaffali e tavoli → niente è attraversabile.
// (generato offline da 04_bar_interno.glb; rigenerare se cambia il transform.)
const OBSTACLES: Obstacle[] = [
  { minX: -4.5, maxX: -0.66, minZ: -2.58, maxZ: -2.34 },
  { minX: -4.5, maxX: -3.54, minZ: -2.34, maxZ: -1.38 },
  { minX: -3.42, maxX: -0.66, minZ: -2.34, maxZ: -2.1 },
  { minX: -3.42, maxX: -2.46, minZ: -2.1, maxZ: -1.98 },
  { minX: -1.98, maxX: -0.66, minZ: -2.1, maxZ: -1.74 },
  { minX: -3.42, maxX: -2.94, minZ: -1.98, maxZ: 1.5 },
  { minX: 1.02, maxX: 1.74, minZ: -1.98, maxZ: -1.74 },
  { minX: 2.82, maxX: 4.38, minZ: -1.98, maxZ: -1.86 },
  { minX: -2.7, maxX: -2.58, minZ: -1.86, maxZ: -1.26 },
  { minX: 1.74, maxX: 3.54, minZ: -1.86, maxZ: -1.74 },
  { minX: -2.82, maxX: -2.7, minZ: -1.74, maxZ: 2.58 },
  { minX: -0.78, maxX: 1.14, minZ: -1.74, maxZ: -1.62 },
  { minX: 1.74, maxX: 1.86, minZ: -1.74, maxZ: -1.14 },
  { minX: 4.38, maxX: 4.5, minZ: -1.74, maxZ: 1.86 },
  { minX: -2.94, maxX: -2.82, minZ: -1.62, maxZ: -0.42 },
  { minX: -2.58, maxX: -2.34, minZ: -1.62, maxZ: -1.26 },
  { minX: -0.78, maxX: -0.54, minZ: -1.62, maxZ: -0.42 },
  { minX: -0.06, maxX: 1.14, minZ: -1.62, maxZ: -1.02 },
  { minX: -2.34, maxX: -1.62, minZ: -1.5, maxZ: -1.26 },
  { minX: -1.02, maxX: -0.78, minZ: -1.5, maxZ: -0.42 },
  { minX: -0.42, maxX: -0.06, minZ: -1.5, maxZ: -1.14 },
  { minX: -4.5, maxX: -4.26, minZ: -1.38, maxZ: 1.5 },
  { minX: -4.02, maxX: -3.78, minZ: -1.38, maxZ: 0.66 },
  { minX: 1.86, maxX: 4.02, minZ: -1.38, maxZ: -1.14 },
  { minX: -1.14, maxX: -1.02, minZ: -1.26, maxZ: -0.54 },
  { minX: -0.3, maxX: -0.06, minZ: -1.14, maxZ: -0.3 },
  { minX: 3.54, maxX: 4.02, minZ: -1.14, maxZ: -1.02 },
  { minX: -0.42, maxX: -0.3, minZ: -1.02, maxZ: -0.3 },
  { minX: -0.06, maxX: 1.02, minZ: -1.02, maxZ: -0.78 },
  { minX: 3.78, maxX: 4.02, minZ: -1.02, maxZ: 0.06 },
  { minX: -0.54, maxX: -0.42, minZ: -0.9, maxZ: -0.3 },
  { minX: 1.98, maxX: 2.46, minZ: -0.9, maxZ: 0.18 },
  { minX: 3.42, maxX: 3.78, minZ: -0.9, maxZ: 0.18 },
  { minX: 3.18, maxX: 3.42, minZ: -0.78, maxZ: 0.06 },
  { minX: 1.74, maxX: 1.98, minZ: -0.66, maxZ: 0.18 },
  { minX: 3.06, maxX: 3.18, minZ: -0.66, maxZ: -0.18 },
  { minX: 1.62, maxX: 1.74, minZ: -0.42, maxZ: 0.06 },
  { minX: -3.78, maxX: -3.66, minZ: -0.3, maxZ: 1.14 },
  { minX: 4.02, maxX: 4.14, minZ: -0.3, maxZ: 1.02 },
  { minX: -4.26, maxX: -4.02, minZ: 0.06, maxZ: 1.5 },
  { minX: 1.86, maxX: 2.34, minZ: 0.18, maxZ: 0.3 },
  { minX: -2.94, maxX: -2.82, minZ: 0.42, maxZ: 1.5 },
  { minX: -3.54, maxX: -3.42, minZ: 0.54, maxZ: 1.26 },
  { minX: 1.14, maxX: 1.38, minZ: 0.54, maxZ: 1.74 },
  { minX: 3.42, maxX: 3.78, minZ: 0.54, maxZ: 1.62 },
  { minX: 3.9, maxX: 4.02, minZ: 0.54, maxZ: 1.74 },
  { minX: -3.9, maxX: -3.78, minZ: 0.66, maxZ: 1.26 },
  { minX: -1.26, maxX: -0.66, minZ: 0.66, maxZ: 2.58 },
  { minX: 1.38, maxX: 1.62, minZ: 0.66, maxZ: 1.62 },
  { minX: 3.06, maxX: 3.42, minZ: 0.66, maxZ: 1.62 },
  { minX: -4.02, maxX: -3.9, minZ: 0.78, maxZ: 1.26 },
  { minX: -0.66, maxX: -0.54, minZ: 0.78, maxZ: 1.86 },
  { minX: 0.9, maxX: 1.14, minZ: 0.78, maxZ: 1.62 },
  { minX: 1.62, maxX: 1.74, minZ: 0.78, maxZ: 1.62 },
  { minX: 2.94, maxX: 3.06, minZ: 0.78, maxZ: 1.26 },
  { minX: 0.78, maxX: 0.9, minZ: 0.9, maxZ: 1.38 },
  { minX: 1.74, maxX: 1.86, minZ: 0.9, maxZ: 1.38 },
  { minX: -4.02, maxX: -3.42, minZ: 1.38, maxZ: 1.5 },
  { minX: -4.5, maxX: -4.38, minZ: 1.5, maxZ: 2.58 },
  { minX: -3.42, maxX: -3.3, minZ: 1.5, maxZ: 2.22 },
  { minX: -4.38, maxX: -3.54, minZ: 1.62, maxZ: 1.86 },
  { minX: -3.06, maxX: -2.82, minZ: 1.62, maxZ: 1.98 },
  { minX: -3.3, maxX: -3.06, minZ: 1.74, maxZ: 2.22 },
  { minX: -4.26, maxX: -3.42, minZ: 1.86, maxZ: 2.1 },
  { minX: -4.26, maxX: -3.54, minZ: 2.1, maxZ: 2.34 },
  { minX: -4.38, maxX: -2.82, minZ: 2.46, maxZ: 2.58 },
];

export default function FirstPersonBar({
  onExit,
}: {
  // onInteract resta nella firma del chiamante ma non è più usato: gli hotspot
  // sono stati rimossi, verranno ri-aggiunti sul modello nuovo.
  onInteract: (id: HotspotId) => void;
  onExit: () => void;
}) {
  return (
    <FirstPersonStage
      onExit={onExit}
      exitLabel="‹ torna fuori"
      hint="Interno bar (nuovo modello) · esplora"
      startPos={[0, 1.5, 1.9]}
      startYaw={0}
      bounds={{ minX: -4.35, maxX: 4.35, minZ: -2.45, maxZ: 2.45 }}
      obstacles={OBSTACLES}
    >
      <BarRoom />
    </FirstPersonStage>
  );
}
