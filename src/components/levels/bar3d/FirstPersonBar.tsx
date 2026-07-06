"use client";

import { useMemo } from "react";
import * as THREE from "three";
import FirstPersonStage, { Obj, type Obstacle } from "./FirstPersonStage";
import ScannedWorld from "./ScannedWorld";
import { BAR_WORLD_ASSETS } from "./worldAssets";
import { NEON_DISPLAY, NEON_OFF } from "./neonConfig";

export type HotspotId = "neon" | "bottles" | "chalk" | "jukebox" | "drawer";

const ROOM_MIN_X = -4.48;
const ROOM_MAX_X = 4.49;
const ROOM_MIN_Z = -2.57;
const ROOM_MAX_Z = 2.56;
const WALL_WHITE = "#f2eee4";
// Colori campionati direttamente dai triangoli dello scan (04_bar_interno.glb):
// pavimento dx #bdb2a3 / sx #979586 → medio greige desaturato (non l'arancione
// inventato di prima); soffitto dx #b9a893. Così il fill combacia con la texture reale.
const FLOOR_FILL = "#aaa494";
const FLOOR_EXTRA_X = 1.8;
const FLOOR_EXTRA_Z = 1.4;
// Lo scan poggia a Y≈0.006: il fill sta appena sotto (evita z-fighting dove il
// pavimento scansionato lo copre) senza creare il gradino di ~1.8cm di prima.
const FLOOR_Y = 0.004;
const RIGHT_VAULT_COLOR = "#b9a893";

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

// Texture pavimento: greige uniforme (FLOOR_FILL) mottled come lo scan — niente
// griglia di fughe regolari, perché il pavimento fotogrammetrico non ne ha ed è
// proprio la griglia che tradiva il giunto tra fill e scan.
function makeFloorTexture(repeatX: number, repeatY: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  // base greige (medio dei due vani dello scan)
  ctx.fillStyle = FLOOR_FILL;
  ctx.fillRect(0, 0, size, size);
  // macchie morbide a bassa frequenza: chiazze chiare/scure come lo scan
  for (let i = 0; i < 34; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 24 + Math.random() * 60;
    const dark = Math.random() < 0.5;
    const a = 0.05 + Math.random() * 0.07;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, dark ? `rgba(120,114,104,${a})` : `rgba(210,204,192,${a})`);
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // grana fine
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const g = (Math.random() - 0.5) * 12;
    img.data[i] += g;
    img.data[i + 1] += g;
    img.data[i + 2] += g;
  }
  ctx.putImageData(img, 0, 0);
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
  // Toni campionati dal soffitto dello scan (vano dx #b9a893): base tan chiaro,
  // ombra un filo più scura → la volta legge come la texture reale, non arancione.
  const vaultMap = useMemo(
    () => makeSubtleNoiseTexture([185, 168, 147], [150, 135, 116], 6, 3),
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

      {/* Solo il vano destro: il soffitto del vano sinistro resta quello del GLB.
          Centro Y -0.36 → picco volta a -0.36+3.55 = 3.19 m, esattamente il colmo
          del soffitto scansionato (prima -0.22 → 3.33 m, ~14cm troppo alto). */}
      <mesh position={[1.92, -0.36, -0.04]} rotation={[0, 0, Math.PI / 2]} receiveShadow>
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

// ===== Parete di siepe finta (dietro l'insegna) =====
// Texture procedurale a foglie sovrapposte (bosso/edera) → il "green wall" del
// bar reale che copre gli scaffali dello scan.
function makeGrassTexture(repeatX: number, repeatY: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#183414";
  ctx.fillRect(0, 0, size, size);
  // verdi vivi come la siepe reale (chiari sopra, scuri nei buchi)
  const greens = ["#2c5e24", "#3d8b34", "#4fa83c", "#5cb84a", "#6fae3a", "#356e22", "#1f4a19"];
  for (let i = 0; i < 2200; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 3 + Math.random() * 5;
    ctx.fillStyle = greens[(Math.random() * greens.length) | 0];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.random() * Math.PI);
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Pannello d'erba sulla parete sinistra del bar (X≈-4.48, rivolto nella stanza),
// davanti agli scaffali per coprirli. Fa da sfondo all'insegna al neon.
function GrassWall() {
  const map = useMemo(() => makeGrassTexture(7, 4), []);
  return (
    <mesh position={[-3.98, 1.55, -0.4]} rotation={[0, Math.PI / 2, 0]}>
      <planeGeometry args={[4.2, 2.7]} />
      <meshStandardMaterial map={map} roughness={1} side={THREE.DoubleSide} />
    </mesh>
  );
}

// ===== Insegna al neon "Port Royal" =====
// Corsivo BIANCO come l'insegna reale, su fondo TRASPARENTE (solo i tubi): lettere
// accese (glow bianco caldo) + fulminate (spente) da neonConfig → il giocatore ne
// conta 6 = prima cifra.
function makeNeonTexture(): THREE.CanvasTexture {
  const W = 1024;
  const H = 256;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.clearRect(0, 0, W, H);
  ctx.font = "italic 150px 'Brush Script MT', 'Segoe Script', cursive";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";

  // Ogni carattere di NEON_DISPLAY tranne lo spazio avanza l'indice-parola,
  // così l'ordine delle fulminate combacia con NEON_OFF (e con la modale 2D).
  type L = { ch: string; off: boolean; space: boolean; w: number };
  const letters: L[] = [];
  let wi = 0;
  for (const ch of NEON_DISPLAY) {
    if (ch === " ") {
      letters.push({ ch, off: false, space: true, w: 54 });
      continue;
    }
    letters.push({
      ch,
      off: NEON_OFF.has(wi),
      space: false,
      w: ctx.measureText(ch).width + 20,
    });
    wi++;
  }
  const total = letters.reduce((a, l) => a + l.w, 0);
  let x = (W - total) / 2;
  const y = H / 2 + 6;
  for (const l of letters) {
    if (!l.space) {
      if (l.off) {
        // lettera fulminata: tubo spento, appena visibile
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#2b2b34";
        ctx.fillText(l.ch, x, y);
      } else {
        // lettera accesa: alone bianco caldo + cuore luminoso (come il reale)
        ctx.shadowColor = "#fff4e2";
        ctx.shadowBlur = 34;
        ctx.fillStyle = "#ffffff";
        ctx.fillText(l.ch, x, y);
        ctx.shadowBlur = 12;
        ctx.fillStyle = "#fff8ee";
        ctx.fillText(l.ch, x, y);
      }
    }
    x += l.w;
  }
  ctx.shadowBlur = 0;
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Insegna davanti al pannello d'erba (X leggermente più avanti del GrassWall così
// i tubi restano sopra l'erba). Solo i tubi luminosi, nessuno sfondo.
function NeonSign() {
  const map = useMemo(makeNeonTexture, []);
  return (
    <group position={[-3.9, 2.05, -0.5]} rotation={[0, Math.PI / 2, 0]}>
      {/* i tubi al neon: fondo trasparente, emissivi (non risentono della luce) */}
      <mesh>
        <planeGeometry args={[2.6, 0.66]} />
        <meshBasicMaterial map={map} transparent toneMapped={false} />
      </mesh>
      {/* alone diffuso sull'erba */}
      <pointLight position={[0, 0, 0.4]} intensity={3} distance={3.2} color="#fff4e2" />
    </group>
  );
}

// ===== Hotspot degli enigmi =====
// Marker luminosi da "USA": aprono le stesse modali 2D del livello. Le posizioni
// sono una prima taratura sul modello scansionato — ritoccabili in anteprima live.
function Enigmas({ onInteract }: { onInteract: (id: HotspotId) => void }) {
  return (
    <>
      <GrassWall />
      <NeonSign />
      {/* Zona cliccabile invisibile davanti all'insegna → enigma "neon". */}
      <Obj
        onClick={() => onInteract("neon")}
        position={[-3.75, 2.05, -0.5]}
        size={[0.25, 0.8, 2.6]}
        color="#000000"
        opacity={0}
        label="Insegna al neon"
        labelY={0.5}
      />
      {/* Bottiglie sul bancone (davanti al pannello d'erba). */}
      <Obj
        onClick={() => onInteract("bottles")}
        position={[-3.65, 1.3, 1.2]}
        size={[0.16, 0.16, 0.16]}
        color="#ffb454"
        emissive="#ffb454"
        label="Scaffale bottiglie"
        labelY={0.28}
      />
      {/* Lavagna dei cocktail (parete di fondo). */}
      <Obj
        onClick={() => onInteract("chalk")}
        position={[-1.5, 1.55, -2.28]}
        size={[0.18, 0.18, 0.06]}
        color="#f2eee4"
        emissive="#f2eee4"
        label="Lavagna cocktail"
        labelY={0.3}
      />
      {/* Jukebox (angolo). */}
      <Obj
        onClick={() => onInteract("jukebox")}
        position={[-3.9, 1.0, 1.95]}
        size={[0.2, 0.2, 0.2]}
        color="#ff5cf2"
        emissive="#ff5cf2"
        label="Jukebox"
        labelY={0.32}
      />
      {/* Cassetto con la serratura: sul cassettone di legno con la pianta. */}
      <Obj
        onClick={() => onInteract("drawer")}
        position={[-1.15, 0.84, 1.36]}
        size={[0.22, 0.16, 0.22]}
        color="#22d3ee"
        emissive="#22d3ee"
        label="Cassetto (serratura)"
        labelY={0.3}
      />
    </>
  );
}

// ===== Interno del Port Royal =====
// Modello scansionato (04_bar_interno.glb) + luci.
function BarRoom({ onInteract }: { onInteract: (id: HotspotId) => void }) {
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
      <Enigmas onInteract={onInteract} />
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
  onInteract,
  onExit,
}: {
  onInteract: (id: HotspotId) => void;
  onExit: () => void;
}) {
  return (
    <FirstPersonStage
      onExit={onExit}
      sceneName="interior"
      exitLabel="‹ torna fuori"
      hint="Cerca gli indizi · avvicinati e tocca USA"
      startPos={[0, 1.5, 1.9]}
      startYaw={0}
      bounds={{ minX: -4.35, maxX: 4.35, minZ: -2.45, maxZ: 2.45 }}
      obstacles={OBSTACLES}
    >
      <BarRoom onInteract={onInteract} />
    </FirstPersonStage>
  );
}
