"use client";

import FirstPersonStage, { Obj, type Obstacle } from "./FirstPersonStage";
import ScannedWorld from "./ScannedWorld";
import { BAR_WORLD_ASSETS } from "./worldAssets";

/** Strada Port Royal: solo il mondo scansionato + luci + trigger d'ingresso. */
function OpenStreet({ onEnter }: { onEnter: () => void }) {
  const scanned = BAR_WORLD_ASSETS.exterior.visual;
  return (
    <>
      <color attach="background" args={["#06091a"]} />
      <fog attach="fog" args={["#070a18", 14, 44]} />
      <ambientLight intensity={0.55} color="#9fb0ff" />
      <directionalLight position={[-7, 13, 7]} intensity={0.85} color="#9fb4ff" castShadow />

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
          color="#3c434f"
          emissive="#1a2030"
          emissiveIntensity={0.5}
          roughness={0.94}
        />
      </mesh>

      {scanned && (
        <>
          <ScannedWorld asset={scanned} />
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
      startPos={[-12.5, 1.0, 0.2]}
      startYaw={-Math.PI / 2}
      bounds={{ minX: -13.5, maxX: 14.6, minZ: -4.6, maxZ: 3.4 }}
      obstacles={OBSTACLES}
    >
      <OpenStreet onEnter={onEnter} />
    </FirstPersonStage>
  );
}
