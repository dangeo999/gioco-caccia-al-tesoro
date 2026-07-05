"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { Stars, Sparkles } from "@react-three/drei";
import FirstPersonStage, { Obj, type Obstacle } from "./FirstPersonStage";
import ScannedWorld from "./ScannedWorld";
import { BAR_WORLD_ASSETS } from "./worldAssets";

// Disco lunare con crateri (maria): gradiente per il tondo + macchie scure morbide.
function makeMoonTexture(): THREE.CanvasTexture {
  const s = 256;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(s * 0.42, s * 0.4, s * 0.08, s * 0.5, s * 0.5, s * 0.56);
  g.addColorStop(0, "#fffdf6");
  g.addColorStop(0.65, "#efe7d3");
  g.addColorStop(1, "#c9bca2");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  for (let i = 0; i < 28; i++) {
    const x = Math.random() * s;
    const y = Math.random() * s;
    const r = 4 + Math.random() * 24;
    const cg = ctx.createRadialGradient(x, y, 0, x, y, r);
    const a = 0.08 + Math.random() * 0.16;
    cg.addColorStop(0, `rgba(150,138,116,${a})`);
    cg.addColorStop(1, "rgba(150,138,116,0)");
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Alone radiale morbido (per la luna e per la foschia).
function makeGlowTexture(inner: string, mid: string): THREE.CanvasTexture {
  const s = 128;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.45, mid);
  g.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, s, s);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function makeSkyTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#02030a");
  sky.addColorStop(0.5, "#080a13");
  sky.addColorStop(1, "#17151b");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  const glow = ctx.createRadialGradient(w * 0.62, h * 0.38, 0, w * 0.62, h * 0.38, w * 0.62);
  glow.addColorStop(0, "rgba(124,132,158,0.20)");
  glow.addColorStop(0.45, "rgba(56,62,86,0.10)");
  glow.addColorStop(1, "rgba(56,62,86,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 1200; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const a = 0.015 + Math.random() * 0.045;
    ctx.fillStyle = `rgba(190,198,220,${a})`;
    ctx.fillRect(x, y, 1, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function NightBackdrop() {
  const map = useMemo(() => makeSkyTexture(), []);
  return (
    <mesh renderOrder={-100}>
      <sphereGeometry args={[70, 32, 16]} />
      <meshBasicMaterial
        map={map}
        side={THREE.BackSide}
        depthTest={false}
        depthWrite={false}
        fog={false}
        toneMapped={false}
      />
    </mesh>
  );
}

/** Luna con crateri + alone luminoso (sprite morbido che sfuma sul cielo). */
function Moon() {
  const moonMap = useMemo(makeMoonTexture, []);
  const glow = useMemo(
    () => makeGlowTexture("rgba(245,244,230,0.55)", "rgba(214,222,236,0.16)"),
    [],
  );
  return (
    <group position={[24, 25, -3]}>
      <sprite scale={[15, 15, 1]}>
        <spriteMaterial map={glow} transparent depthWrite={false} fog={false} toneMapped={false} />
      </sprite>
      <mesh>
        <sphereGeometry args={[3.2, 32, 32]} />
        <meshBasicMaterial map={moonMap} fog={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** Nuvolette di foschia basse, sparse qua e là sul selciato: ondeggiano piano sul
 *  posto (niente lenzuolo che scorre). Ogni "batuffolo" è un gruppetto di sprite. */
function GroundFog() {
  const tex = useMemo(() => makeGlowTexture("rgba(205,201,214,0.9)", "rgba(184,180,198,0.4)"), []);
  const group = useRef<THREE.Group>(null);
  // Punti sparsi lungo la via dove si posa una nuvoletta.
  const spots: [number, number][] = useMemo(
    () => [
      [-9, 1.1],
      [-5.5, -0.9],
      [-2, 1.3],
      [2, -0.7],
      [5.5, 1.2],
      [9, -0.5],
      [11.5, 1.0],
    ],
    [],
  );
  // Ogni nuvoletta = 3 sprite ravvicinati di misura diversa → forma soffice.
  const puffs = useMemo(
    () =>
      spots.flatMap(([sx, sz]) =>
        Array.from({ length: 3 }).map(() => ({
          x0: sx + (Math.random() - 0.5) * 2.2,
          y: 0.25 + Math.random() * 0.3,
          z: sz + (Math.random() - 0.5) * 1.4,
          s: 2.2 + Math.random() * 2.8,
          phase: Math.random() * Math.PI * 2,
          bob: 0.04 + Math.random() * 0.06,
          sway: 0.1 + Math.random() * 0.18,
        })),
      ),
    [spots],
  );
  useFrame((st) => {
    const g = group.current;
    if (!g) return;
    const t = st.clock.elapsedTime;
    g.children.forEach((ch, i) => {
      const pf = puffs[i];
      ch.position.y = pf.y + Math.sin(t * 0.5 + pf.phase) * pf.bob;
      ch.position.x = pf.x0 + Math.sin(t * 0.18 + pf.phase) * pf.sway;
      const m = (ch as THREE.Sprite).material as THREE.SpriteMaterial;
      m.opacity = 0.02 + (Math.sin(t * 0.35 + pf.phase) * 0.5 + 0.5) * 0.035;
    });
  });
  return (
    <group ref={group}>
      {puffs.map((pf, i) => (
        <sprite key={i} position={[pf.x0, pf.y, pf.z]} scale={[pf.s, pf.s * 0.5, 1]}>
          <spriteMaterial
            map={tex}
            transparent
            depthWrite={false}
            opacity={0.035}
            color="#c3bfce"
            fog={false}
            toneMapped={false}
          />
        </sprite>
      ))}
    </group>
  );
}

/** Calcola l'ombra direzionale UNA volta e la congela (statica → costo ~zero). */
function BakedShadows() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    gl.shadowMap.autoUpdate = false;
    gl.shadowMap.needsUpdate = true;
  }, [gl]);
  return null;
}

// Silhouette di pipistrello (corpo + ali frastagliate) su fondo trasparente.
function makeBatTexture(): THREE.CanvasTexture {
  const s = 64;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  ctx.clearRect(0, 0, s, s);
  ctx.fillStyle = "#2c2c36"; // grigio scuro: visibile contro il cielo nero
  ctx.translate(s / 2, s / 2);
  ctx.beginPath();
  ctx.ellipse(0, 0, 3, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  const wing = () => {
    ctx.beginPath();
    ctx.moveTo(0, -2);
    ctx.lineTo(-10, -6);
    ctx.quadraticCurveTo(-15, -2, -22, -5);
    ctx.quadraticCurveTo(-16, 2, -12, 7);
    ctx.quadraticCurveTo(-10, 2, -6, 7);
    ctx.quadraticCurveTo(-4, 2, 0, 4);
    ctx.closePath();
    ctx.fill();
  };
  wing();
  ctx.scale(-1, 1);
  wing();
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Un pipistrello che vola in cerchi ampi nel cielo, con "battito d'ali". */
function Bat({
  tex,
  base,
  radius,
  height,
  speed,
  phase,
}: {
  tex: THREE.CanvasTexture;
  base: [number, number];
  radius: number;
  height: number;
  speed: number;
  phase: number;
}) {
  const ref = useRef<THREE.Sprite>(null);
  useFrame((st) => {
    const e = st.clock.elapsedTime;
    const t = e * speed + phase;
    const x = base[0] + Math.cos(t) * radius + Math.sin(t * 0.6) * 4;
    const z = base[1] + Math.sin(t * 1.3) * radius * 0.5;
    const y = height + Math.sin(t * 2.2) * 1.2;
    const flap = 0.55 + Math.abs(Math.sin(e * 12 + phase)) * 0.65;
    if (ref.current) {
      ref.current.position.set(x, y, z);
      ref.current.scale.set(1.7 * flap, 1.7, 1);
    }
  });
  return (
    <sprite ref={ref}>
      <spriteMaterial map={tex} transparent depthWrite={false} fog={false} toneMapped={false} opacity={0.9} />
    </sprite>
  );
}

function Bats() {
  const tex = useMemo(makeBatTexture, []);
  return (
    <>
      <Bat tex={tex} base={[2, 0]} radius={9} height={7} speed={0.5} phase={0} />
      <Bat tex={tex} base={[5, 0.5]} radius={12} height={8.6} speed={0.4} phase={2.1} />
      <Bat tex={tex} base={[-2, -0.5]} radius={7} height={6.2} speed={0.62} phase={4.2} />
    </>
  );
}

/** Lampione con luce fredda che sfarfalla (con cali improvvisi, eerie). */
function StreetLamp({ position }: { position: [number, number, number] }) {
  const light = useRef<THREE.PointLight>(null);
  const bulb = useRef<THREE.MeshBasicMaterial>(null);
  useFrame((st) => {
    const t = st.clock.elapsedTime;
    let f = 0.82 + Math.sin(t * 29) * 0.05 + Math.sin(t * 12.7) * 0.05 + (Math.random() - 0.5) * 0.05;
    if (Math.sin(t * 1.7 + 1) > 0.9) f *= 0.2; // calo improvviso
    f = Math.max(0.08, f);
    if (light.current) light.current.intensity = 3.4 * f;
    if (bulb.current) bulb.current.color.setRGB(0.86 * f + 0.05, 0.9 * f + 0.05, 0.97 * f + 0.05);
  });
  return (
    <group position={position}>
      <mesh position={[0, 1.25, 0]} castShadow>
        <cylinderGeometry args={[0.045, 0.06, 2.5, 8]} />
        <meshStandardMaterial color="#14141a" roughness={0.85} metalness={0.3} />
      </mesh>
      <mesh position={[0, 2.5, 0]}>
        <boxGeometry args={[0.2, 0.24, 0.2]} />
        <meshBasicMaterial ref={bulb} color="#dfe7f5" toneMapped={false} fog={false} />
      </mesh>
      <pointLight ref={light} position={[0, 2.45, 0]} intensity={3.4} distance={7} decay={2} color="#dfe7f5" />
    </group>
  );
}

/** Due occhi di gatto che brillano nel buio e ogni tanto sbattono le palpebre. */
function CatEyes({ position }: { position: [number, number, number] }) {
  const grp = useRef<THREE.Group>(null);
  useFrame((st) => {
    const t = st.clock.elapsedTime;
    if (grp.current) grp.current.scale.y = Math.sin(t * 0.8) > 0.95 ? 0.08 : 1;
  });
  return (
    <group ref={grp} position={position}>
      <mesh position={[-0.055, 0, 0]}>
        <sphereGeometry args={[0.032, 10, 10]} />
        <meshBasicMaterial color="#b6ff3c" fog={false} toneMapped={false} />
      </mesh>
      <mesh position={[0.055, 0, 0]}>
        <sphereGeometry args={[0.032, 10, 10]} />
        <meshBasicMaterial color="#b6ff3c" fog={false} toneMapped={false} />
      </mesh>
    </group>
  );
}

function makeCutFacadeTexture(): THREE.CanvasTexture {
  const w = 96;
  const h = 256;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;

  const base = ctx.createLinearGradient(0, 0, 0, h);
  base.addColorStop(0, "#9a9181");
  base.addColorStop(0.48, "#82796d");
  base.addColorStop(1, "#5b574f");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  for (let i = 0; i < 420; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const a = 0.05 + Math.random() * 0.1;
    ctx.fillStyle = Math.random() > 0.5
      ? `rgba(225,215,194,${a})`
      : `rgba(34,32,30,${a})`;
    ctx.fillRect(x, y, 1, 1);
  }

  ctx.fillStyle = "rgba(32,30,28,0.22)";
  ctx.fillRect(0, 0, 5, h);
  ctx.fillStyle = "rgba(232,220,196,0.16)";
  ctx.fillRect(w - 9, 0, 4, h);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function UpperStreetHoleCap() {
  const wallMap = useMemo(makeCutFacadeTexture, []);
  return (
    <group name="upper_street_hole_cap">
      {/* Anchor from debug: aim -3.81, 8.58, -4.78, HIT nessuno. */}
      <mesh name="upper_hole_cap_wall" position={[-3.82, 6.85, -4.74]} castShadow receiveShadow>
        <boxGeometry args={[1.05, 3.55, 0.14]} />
        <meshStandardMaterial
          map={wallMap}
          color="#9f9585"
          roughness={0.98}
          emissive="#6f675e"
          emissiveIntensity={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh name="upper_hole_cap_edge" position={[-4.38, 6.75, -4.67]} castShadow receiveShadow>
        <boxGeometry args={[0.08, 3.35, 0.12]} />
        <meshStandardMaterial color="#8f8577" roughness={1} emissive="#675f56" emissiveIntensity={0.16} />
      </mesh>
    </group>
  );
}

/** Atmosfera notturna Halloween: stelle, luna, foschia, pipistrelli, lampione, occhi. */
function NightSky() {
  return (
    <>
      <NightBackdrop />
      <Stars radius={80} depth={40} count={1600} factor={4} saturation={0} fade speed={0.4} />
      <Moon />
      <GroundFog />
      {/* Pulviscolo freddo e rado: appena percettibile, dà aria "morta". */}
      <Sparkles
        count={30}
        scale={[28, 6, 10]}
        position={[0, 3, 0]}
        size={2}
        speed={0.15}
        opacity={0.25}
        color="#b9c0d0"
      />
      <Bats />
      <StreetLamp position={[-2, 0, 1.5]} />
      <CatEyes position={[-7, 0.4, -1.1]} />
      <BakedShadows />
    </>
  );
}

// Batuffolo di fumo irregolare: tanti blob radiali sovrapposti → nuvola soffice
// dai bordi frastagliati (più credibile di un singolo alone tondo).
function makeSmokeTexture(): THREE.CanvasTexture {
  const s = 128;
  const c = document.createElement("canvas");
  c.width = c.height = s;
  const ctx = c.getContext("2d")!;
  for (let i = 0; i < 26; i++) {
    const r = s * (0.1 + Math.random() * 0.24);
    const x = s / 2 + (Math.random() - 0.5) * s * 0.52;
    const y = s / 2 + (Math.random() - 0.5) * s * 0.52;
    const a = 0.05 + Math.random() * 0.1;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${a})`);
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Banco di fumo denso che copre un varco della mappa: molte volute sovrapposte
 *  che salgono, ondeggiano e ruotano piano. Nasconde il vuoto dietro la geometria
 *  scansionata con atmosfera fitta invece che con un muro. */
function GapSmoke({
  position,
  width = 4.5,
  height = 5,
  count = 46,
}: {
  position: [number, number, number];
  width?: number;
  height?: number;
  count?: number;
}) {
  const tex = useMemo(makeSmokeTexture, []);
  const group = useRef<THREE.Group>(null);
  const puffs = useMemo(
    () =>
      Array.from({ length: count }).map(() => {
        // Densità maggiore in basso: il fumo si posa e si dirada salendo.
        const yBias = Math.pow(Math.random(), 1.7);
        return {
          x0: (Math.random() - 0.5) * width,
          y0: yBias * height,
          z0: (Math.random() - 0.5) * 1.6,
          s: 2.2 + Math.random() * 3.2,
          phase: Math.random() * Math.PI * 2,
          bob: 0.25 + Math.random() * 0.4,
          sway: 0.15 + Math.random() * 0.35,
          rot: Math.random() * Math.PI * 2,
          rotSpeed: (Math.random() - 0.5) * 0.12,
          // più opaco in basso, più tenue in alto
          peak: 0.28 * (1 - yBias * 0.6),
        };
      }),
    [count, width, height],
  );
  useFrame((st) => {
    const g = group.current;
    if (!g) return;
    const t = st.clock.elapsedTime;
    g.children.forEach((ch, i) => {
      const pf = puffs[i];
      ch.position.y = pf.y0 + Math.sin(t * 0.2 + pf.phase) * pf.bob;
      ch.position.x = pf.x0 + Math.sin(t * 0.12 + pf.phase) * pf.sway;
      const m = (ch as THREE.Sprite).material as THREE.SpriteMaterial;
      m.rotation = pf.rot + t * pf.rotSpeed;
      m.opacity = pf.peak * (0.55 + 0.45 * Math.sin(t * 0.25 + pf.phase));
    });
  });
  return (
    <group ref={group} position={position}>
      {puffs.map((pf, i) => (
        <sprite key={i} position={[pf.x0, pf.y0, pf.z0]} scale={[pf.s, pf.s, 1]}>
          <spriteMaterial
            map={tex}
            transparent
            depthWrite={false}
            opacity={pf.peak}
            color="#b3b7c6"
            fog={false}
            toneMapped={false}
          />
        </sprite>
      ))}
    </group>
  );
}

/** Strada Port Royal: solo il mondo scansionato + luci + trigger d'ingresso. */
function OpenStreet({ onEnter }: { onEnter: () => void }) {
  const scanned = BAR_WORLD_ASSETS.exterior.visual;
  return (
    <>
      {/* Sfondo e nebbia NERI (non più indaco): la strada esce dal buio, i modelli
          sfumano nel nero invece che nel blu. Luci neutre così niente resta bluastro. */}
      <color attach="background" args={["#05060d"]} />
      {/* Fog freddo e più vicino: la via si chiude nel buio, aria tenebrosa. */}
      <fog attach="fog" args={["#090b12", 7, 32]} />
      {/* Buio fitto: pochissimo ambient, solo la luna fredda come chiave → alto
          contrasto, tutto ciò che non è colpito resta nell'ombra. */}
      <ambientLight intensity={0.33} color="#b7bac7" />
      <directionalLight
        position={[-7, 13, 7]}
        intensity={0.8}
        color="#c6ccd8"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-left={-24}
        shadow-camera-right={24}
        shadow-camera-top={24}
        shadow-camera-bottom={-24}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-bias={-0.0006}
      />
      <NightSky />

      {/* Pavimento base scuro sotto al mondo scansionato. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
        <planeGeometry args={[120, 60]} />
        <meshStandardMaterial color="#10131c" roughness={0.97} />
      </mesh>

      {/* Rappezzo asfalto: la mesh `road` scansionata non copre tutta l'area
          (piazza est oltre il muretto, bordi curva). Piano appena sotto quota
          strada (0.30) così i buchi mostrano asfalto invece del nero. Colore +
          emissive tarati sul lit della strada notturna per non leggere "fossa". */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.29, 0]} receiveShadow>
        <planeGeometry args={[62, 24]} />
        <meshStandardMaterial
          color="#3b3b3d"
          emissive="#1a1a1c"
          emissiveIntensity={0.5}
          roughness={0.94}
        />
      </mesh>

      {scanned && (
        <>
          <ScannedWorld asset={scanned} emissiveBoost={0.22} clipBackdropY={8} softBackdrop />
          {/* Fumo che copre il varco tra i palazzi a sud (ex "buco di mappa"). */}
          <GapSmoke position={[-6.5, 0.3, -2.5]} width={4} height={4.5} />
          <UpperStreetHoleCap />
          {BAR_WORLD_ASSETS.exterior.entryPoint && (
            <Obj
              onClick={onEnter}
              position={BAR_WORLD_ASSETS.exterior.entryPoint.position}
              size={BAR_WORLD_ASSETS.exterior.entryPoint.size}
              color="#22d3ee"
              label="Entra nel Port Royal"
              labelY={1.5}
              maxDistance={4.5}
              opacity={0.025}
            />
          )}
        </>
      )}
    </>
  );
}

// Collisioni allineate ai bounding box reali dei modelli scansionati
// (mapping export: game = bx·0.18 in X, -by·0.18 in Z). Ricalcolate sul layout
// REDO: corridoio strada (z ≈ -1.3 .. 1.75) tra le due file, poi piazza a est.
const OBSTACLES: Obstacle[] = [
  // Edifici
  { minX: -14.0, maxX: 8.3, minZ: 1.75, maxZ: 3.9 },   // palazzi dx (muro destro)
  { minX: -14.0, maxX: 8.8, minZ: -4.9, maxZ: -1.3 },  // palazzi sx (muro sinistro)
  { minX: 1.3, maxX: 6.5, minZ: -5.1, maxZ: -1.25 },   // bar Port Royal (lato sx)
  { minX: 13.4, maxX: 16.4, minZ: -5.9, maxZ: 4.7 },   // palazzo frontale/POFI (fondo)
  // Muretto curvo (Mesh_0.002): 5 box che seguono la mesh reale invece di un
  // unico AABB — quello vecchio copriva mezza curva e bloccava la strada.
  { minX: 8.1, maxX: 11.2, minZ: 2.5, maxZ: 4.2 },     // muretto: tratto dritto nord
  { minX: 11.2, maxX: 12.2, minZ: 2.0, maxZ: 4.2 },    // muretto: inizio curva
  { minX: 12.2, maxX: 13.2, minZ: 1.3, maxZ: 4.2 },    // muretto: curva media
  { minX: 13.2, maxX: 14.2, minZ: 0.1, maxZ: 4.2 },    // muretto: curva stretta
  { minX: 14.2, maxX: 15.0, minZ: -0.4, maxZ: 4.2 },   // muretto: raccordo palazzo
  // Muri neri backdrop (ogni muro = collisione; asse sottile ispessito ±0.3)
  { minX: -14.28, maxX: -13.68, minZ: -6.89, maxZ: 6.73 }, // wall.001 (cap sinistro)
  { minX: -14.76, maxX: 1.56, minZ: -2.83, maxZ: -2.23 },  // wall.002 (lato sx)
  { minX: -15.04, maxX: 8.54, minZ: 3.09, maxZ: 3.69 },    // wall.003 (lato dx)
  { minX: 7.68, maxX: 17.06, minZ: 2.84, maxZ: 5.94 },     // wall.004 (piazza dx)
  { minX: 6.12, maxX: 18.51, minZ: -4.7, maxZ: -4.1 },     // wall.005 (piazza fondo)
  { minX: 14.54, maxX: 15.14, minZ: -8.45, maxZ: 8.46 },   // wall.006 (cap destro)
  { minX: 0.72, maxX: 1.32, minZ: -14.68, maxZ: -2.29 },   // wall.007 (traversa sx)
];

export default function ExteriorBar({
  onEnter,
  onExit,
}: {
  onEnter: () => void;
  onExit: () => void;
}) {
  return (
    <FirstPersonStage
      onExit={onExit}
      hint="Esplora Via Roma · trova la porta blu del Port Royal"
      startPos={[-12.5, 1.3, 0.2]}
      startYaw={-Math.PI / 2}
      bounds={{ minX: -13.5, maxX: 14.6, minZ: -4.6, maxZ: 3.4 }}
      obstacles={OBSTACLES}
    >
      <OpenStreet onEnter={onEnter} />
    </FirstPersonStage>
  );
}
