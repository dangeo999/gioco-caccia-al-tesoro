"use client";

import { Html } from "@react-three/drei";
import FirstPersonStage, { Obj, type Obstacle } from "./FirstPersonStage";
import ScannedWorld from "./ScannedWorld";
import { BAR_WORLD_ASSETS } from "./worldAssets";

function Box({
  position,
  size,
  color,
  emissive,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  emissive?: string;
}) {
  return (
    <mesh position={position} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color={color}
        roughness={0.82}
        emissive={emissive ?? "#000000"}
        emissiveIntensity={emissive ? 1.7 : 0}
      />
    </mesh>
  );
}

function Window({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <Box position={[0, 0, 0]} size={[1.05, 1.2, 0.1]} color="#151219" />
      <Box position={[0, 0, 0.06]} size={[0.82, 0.96, 0.08]} color="#ff9a32" emissive="#ff7a18" />
      <Box position={[0, 0, 0.13]} size={[0.08, 0.96, 0.05]} color="#362219" />
      <Box position={[0, 0, 0.13]} size={[0.82, 0.08, 0.05]} color="#362219" />
    </group>
  );
}

function StreetLamp({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.8, 0]} castShadow>
        <cylinderGeometry args={[0.06, 0.1, 3.6, 8]} />
        <meshStandardMaterial color="#171923" metalness={0.65} roughness={0.35} />
      </mesh>
      <Box position={[0, 3.45, 0]} size={[0.46, 0.52, 0.46]} color="#ffc05b" emissive="#ff9b32" />
      <pointLight position={[0, 3.35, 0]} intensity={12} distance={7} color="#ffb35c" />
    </group>
  );
}

function Car({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      <Box position={[0, 0.42, 0]} size={[1.65, 0.55, 3.1]} color={color} />
      <Box position={[0, 0.82, -0.15]} size={[1.35, 0.52, 1.55]} color="#182332" />
      {[-0.72, 0.72].map((x) =>
        [-0.95, 0.95].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.28, z]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.28, 0.28, 0.16, 10]} />
            <meshStandardMaterial color="#090a0d" />
          </mesh>
        )),
      )}
      <Box position={[-0.48, 0.48, -1.57]} size={[0.34, 0.2, 0.08]} color="#fff1b0" emissive="#ffd066" />
      <Box position={[0.48, 0.48, -1.57]} size={[0.34, 0.2, 0.08]} color="#fff1b0" emissive="#ffd066" />
    </group>
  );
}

function CafeTable({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.55, 0.55, 0.1, 12]} />
        <meshStandardMaterial color="#402619" />
      </mesh>
      <mesh position={[0, 0.32, 0]}>
        <cylinderGeometry args={[0.08, 0.12, 0.62, 8]} />
        <meshStandardMaterial color="#17151a" />
      </mesh>
      <Box position={[0.82, 0.38, 0]} size={[0.5, 0.72, 0.5]} color="#17151a" />
      <Box position={[-0.82, 0.38, 0]} size={[0.5, 0.72, 0.5]} color="#17151a" />
      <Box position={[0, 0.72, 0]} size={[0.12, 0.18, 0.12]} color="#ffd064" emissive="#ff9b32" />
    </group>
  );
}

function Building({
  position,
  size,
  color,
}: {
  position: [number, number, number];
  size: [number, number, number];
  color: string;
}) {
  return (
    <group>
      <Box position={position} size={size} color={color} />
      <Box
        position={[position[0], position[1] + size[1] / 2 + 0.18, position[2]]}
        size={[size[0] + 0.35, 0.35, size[2] + 0.35]}
        color="#231b20"
      />
    </group>
  );
}

function PortRoyal({ onEnter }: { onEnter: () => void }) {
  return (
    <group>
      {/* Corpo reale dell'edificio: volume, fianchi e tetto restano visibili girandoci attorno. */}
      <Building position={[0, 3.8, -10]} size={[12, 7.6, 7]} color="#232934" />
      <Box position={[0, 1.35, -6.38]} size={[11.6, 2.7, 0.35]} color="#34303a" />
      <Box position={[1.3, 2.55, -6.05]} size={[7.4, 0.35, 2.6]} color="#3e2818" />
      <Box position={[1.3, 2.35, -4.78]} size={[7.2, 0.22, 0.18]} color="#25745e" />

      {/* Ingresso blu separato dal dehors. */}
      <Obj
        onClick={onEnter}
        position={[-4.25, 1.15, -6.13]}
        size={[1.65, 2.3, 0.18]}
        color="#173d68"
        emissive="#08233f"
        label="Entra nel Port Royal"
        labelY={1.55}
        maxDistance={14}
      />
      <Box position={[-4.25, 1.5, -6.0]} size={[1.25, 0.68, 0.08]} color="#ffb05a" emissive="#ff7a18" />

      {/* Dehors e insegna. */}
      <Box position={[1.2, 0.55, -5.95]} size={[7.6, 1.1, 0.35]} color="#3c2b22" />
      <CafeTable position={[-0.7, 0, -5.0]} />
      <CafeTable position={[2.0, 0, -5.0]} />
      <CafeTable position={[4.15, 0, -5.0]} />
      <Html center position={[-0.3, 2.7, -5.74]} transform distanceFactor={7}>
        <div className="font-pixel text-[15px] text-[#ffd36a] whitespace-nowrap" style={{ textShadow: "0 0 8px #ff8a21" }}>
          PORT ROYAL
        </div>
      </Html>
      <pointLight position={[0, 2.4, -4.8]} intensity={18} distance={9} color="#ffae54" />

      <Window position={[-3.2, 5.2, -6.46]} />
      <Window position={[0, 5.2, -6.46]} />
      <Window position={[3.2, 5.2, -6.46]} />

      {/* Zucche di Halloween accanto alla porta. */}
      {[-3.05, -2.55].map((x, index) => (
        <mesh key={x} position={[x, 0.35 + index * 0.03, -5.85]}>
          <sphereGeometry args={[0.32 - index * 0.04, 10, 7]} />
          <meshStandardMaterial color="#ff7a18" emissive="#7c2505" emissiveIntensity={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function OpenStreet({ onEnter }: { onEnter: () => void }) {
  const scanned = BAR_WORLD_ASSETS.exterior.visual;
  return (
    <>
      <color attach="background" args={["#06091a"]} />
      <fog attach="fog" args={["#070a18", 12, 34]} />
      <ambientLight intensity={0.38} color="#879cff" />
      <directionalLight position={[-7, 13, 7]} intensity={0.65} color="#9fb4ff" castShadow />

      {/* Strada principale e incrocio davanti al locale. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.03, 3]} receiveShadow>
        <planeGeometry args={[30, 38]} />
        <meshStandardMaterial color="#171b27" roughness={0.96} />
      </mesh>
      <Box position={[0, 0.01, 5]} size={[0.13, 0.025, 20]} color="#5c6068" />
      <Box position={[-10, 0.04, -3.5]} size={[8, 0.08, 2.2]} color="#282735" />
      <Box position={[10, 0.04, -3.5]} size={[8, 0.08, 2.2]} color="#282735" />

      {scanned ? (
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
              maxDistance={14}
              opacity={0.025}
            />
          )}
        </>
      ) : <PortRoyal onEnter={onEnter} />}

      {/* Il contesto provvisorio sparisce quando viene attivata la scansione completa. */}
      {!scanned && (
        <>
          <Building position={[-10.8, 3.4, 7]} size={[6.8, 6.8, 17]} color="#2a252d" />
          <Building position={[10.8, 3.2, 8]} size={[6.8, 6.4, 15]} color="#252b32" />
          <Building position={[-10.8, 3.2, -10]} size={[6.8, 6.4, 7]} color="#242833" />
          <Building position={[10.8, 3.6, -10]} size={[6.8, 7.2, 7]} color="#2d2931" />
        </>
      )}

      {[-4.9, 3.9, 9.5].map((z) => <StreetLamp key={`l-${z}`} position={[-6.8, 0, z]} />)}
      {[-2.7, 6.5, 12.5].map((z) => <StreetLamp key={`r-${z}`} position={[6.8, 0, z]} />)}

      <Car position={[-4.5, 0, 7.2]} color="#bec6ce" />
      <Car position={[4.5, 0, 1.5]} color="#313b52" />
      <Car position={[-9.8, 0, -3.7]} color="#6e2732" />

      {/* Luna e stelle come elementi del mondo. */}
      <mesh position={[-9, 12, -20]}>
        <sphereGeometry args={[1.25, 16, 16]} />
        <meshBasicMaterial color="#d8e5ff" />
      </mesh>
      {[
        [-12, 10, -18], [-5, 13, -21], [4, 11, -19], [11, 13, -22], [1, 14, -24],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]}>
          <sphereGeometry args={[0.07, 4, 4]} />
          <meshBasicMaterial color="#87b9ff" />
        </mesh>
      ))}
    </>
  );
}

const OBSTACLES: Obstacle[] = [
  { minX: -6.2, maxX: 6.2, minZ: -13.8, maxZ: -6.15 }, // Port Royal
  { minX: -14.4, maxX: -7.2, minZ: -1.8, maxZ: 15.8 },
  { minX: 7.2, maxX: 14.4, minZ: 0.3, maxZ: 15.8 },
  { minX: -14.4, maxX: -7.2, minZ: -13.8, maxZ: -6.2 },
  { minX: 7.2, maxX: 14.4, minZ: -13.8, maxZ: -6.2 },
  { minX: -5.5, maxX: -3.5, minZ: 5.4, maxZ: 9.0 },
  { minX: 3.5, maxX: 5.5, minZ: -0.3, maxZ: 3.3 },
  { minX: -10.8, maxX: -8.8, minZ: -5.5, maxZ: -1.9 },
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
      startPos={[0, 1.55, 14]}
      bounds={{ minX: -13.5, maxX: 13.5, minZ: -13, maxZ: 17 }}
      obstacles={OBSTACLES}
    >
      <OpenStreet onEnter={onEnter} />
    </FirstPersonStage>
  );
}
