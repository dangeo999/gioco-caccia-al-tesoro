"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Preload } from "@react-three/drei";
import { EffectComposer, Pixelation } from "@react-three/postprocessing";
import {
  useCallback,
  createContext,
  Suspense,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as THREE from "three";
import Joystick from "@/components/Joystick";

// Vettori temporanei riusati nel loop (niente allocazioni per frame)
const _dir = new THREE.Vector3();
const _right = new THREE.Vector3();
const _move = new THREE.Vector3();
const _up = new THREE.Vector3(0, 1, 0);
const _targetPos = new THREE.Vector3();
const _targetDir = new THREE.Vector3();
const _viewDir = new THREE.Vector3();
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

export type Bounds = { minX: number; maxX: number; minZ: number; maxZ: number };
export type Obstacle = { minX: number; maxX: number; minZ: number; maxZ: number };

type InteractiveTarget = {
  object: THREE.Object3D;
  label: string;
  maxDistance: number;
  onInteract: () => void;
};

type InteractionContextValue = {
  activeId: string | null;
  guard: React.RefObject<boolean>;
  register: (id: string, target: InteractiveTarget) => () => void;
};

type DebugFrame = {
  camera: [number, number, number];
  yaw: number;
  pitch: number;
  aimPoint: [number, number, number];
  hitDistance: number | null;
  hitObject: string | null;
};

const InteractionCtx = createContext<InteractionContextValue | null>(null);

const toTuple = (v: THREE.Vector3): [number, number, number] => [v.x, v.y, v.z];
const fmt = (n: number) => n.toFixed(2);
const fmtVec = (v: [number, number, number]) => `${fmt(v[0])}, ${fmt(v[1])}, ${fmt(v[2])}`;

function objectLabel(object: THREE.Object3D) {
  let current: THREE.Object3D | null = object;
  while (current) {
    if (current.name) return current.name;
    current = current.parent;
  }
  return object.type;
}

function DebugProbe({
  lookRef,
  onDebugFrame,
}: {
  lookRef: React.RefObject<{ yaw: number; pitch: number }>;
  onDebugFrame: (frame: DebugFrame) => void;
}) {
  const { camera, scene } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const direction = useMemo(() => new THREE.Vector3(), []);
  const lastUpdate = useRef(0);

  useFrame((state) => {
    const now = state.clock.elapsedTime;
    if (now - lastUpdate.current < 0.16) return;
    lastUpdate.current = now;

    camera.getWorldDirection(direction);
    raycaster.set(camera.position, direction);
    raycaster.camera = camera;
    raycaster.far = 45;

    const hit = raycaster.intersectObjects(scene.children, true).find(({ distance, object }) => {
      if (distance < 0.08 || object.type === "Sprite") return false;
      let current: THREE.Object3D | null = object;
      while (current) {
        if (current.renderOrder <= -90 || current.userData.debugSkip) return false;
        current = current.parent;
      }
      const material = (object as THREE.Mesh).material;
      const mats = Array.isArray(material) ? material : [material];
      return !mats.some((mat) => !mat || mat.name === "wall_backdrop_depth_mask" || mat.depthTest === false);
    });

    const aimPoint = hit
      ? hit.point
      : camera.position.clone().addScaledVector(direction, 10);
    const frame: DebugFrame = {
      camera: toTuple(camera.position),
      yaw: lookRef.current.yaw,
      pitch: lookRef.current.pitch,
      aimPoint: toTuple(aimPoint),
      hitDistance: hit ? hit.distance : null,
      hitObject: hit ? objectLabel(hit.object) : null,
    };

    (window as Window & { __pofiDebug?: DebugFrame }).__pofiDebug = frame;
    document.documentElement.dataset.pofiDebug = JSON.stringify(frame);
    onDebugFrame(frame);
  });

  return null;
}

/** Controller prima persona: muove la camera (joystick/tasti), ruota con il drag. */
function FPController({
  moveRef,
  keysRef,
  lookRef,
  startPos,
  bounds,
  obstacles,
  sprintRef,
}: {
  moveRef: React.RefObject<{ x: number; y: number }>;
  keysRef: React.RefObject<{ x: number; y: number }>;
  lookRef: React.RefObject<{ yaw: number; pitch: number }>;
  startPos: [number, number, number];
  bounds: Bounds;
  obstacles: Obstacle[];
  sprintRef: React.RefObject<boolean>;
}) {
  const { camera } = useThree();
  const init = useRef(false);
  const walkTime = useRef(0);

  useFrame((_, delta) => {
    if (!init.current) {
      camera.position.set(startPos[0], startPos[1], startPos[2]);
      camera.rotation.order = "YXZ";
      init.current = true;
    }
    camera.rotation.y = lookRef.current.yaw;
    camera.rotation.x = lookRef.current.pitch;
    camera.rotation.z = 0;

    // somma joystick + tastiera
    let vx = moveRef.current.x + keysRef.current.x;
    let vy = moveRef.current.y + keysRef.current.y;
    if (Math.abs(vx) + Math.abs(vy) > 0.02) {
      const mag = Math.hypot(vx, vy);
      if (mag > 1) {
        vx /= mag;
        vy /= mag;
      }
      camera.getWorldDirection(_dir);
      _dir.y = 0;
      _dir.normalize();
      _right.crossVectors(_dir, _up).normalize();
      _move.set(0, 0, 0);
      _move.addScaledVector(_dir, -vy);
      _move.addScaledVector(_right, vx);
      if (_move.lengthSq() > 0) {
        const speed = sprintRef.current ? 2.7 : 1.9;
        _move.normalize().multiplyScalar(speed * Math.min(delta, 0.05));
        const radius = 0.28;
        const blocked = (x: number, z: number) => obstacles.some((box) =>
          x + radius > box.minX && x - radius < box.maxX &&
          z + radius > box.minZ && z - radius < box.maxZ
        );
        const nextX = clamp(camera.position.x + _move.x, bounds.minX, bounds.maxX);
        const nextZ = clamp(camera.position.z + _move.z, bounds.minZ, bounds.maxZ);
        // Assi separati: se si urta uno spigolo si scivola lungo il muro.
        if (!blocked(nextX, camera.position.z)) camera.position.x = nextX;
        if (!blocked(camera.position.x, nextZ)) camera.position.z = nextZ;
      }
      walkTime.current += delta * (sprintRef.current ? 13 : 9);
      camera.position.y = startPos[1] + Math.sin(walkTime.current) * 0.035;
    } else {
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, startPos[1], 0.16);
    }
  });

  return null;
}

/** Oggetto 3D interattivo: scatola cliccabile con etichetta. */
export function Obj({
  onClick,
  position,
  size,
  color,
  emissive,
  label,
  labelY = 1,
  maxDistance = 4.2,
  opacity = 1,
}: {
  onClick: () => void;
  position: [number, number, number];
  size: [number, number, number];
  color: string;
  emissive?: string;
  label: string;
  labelY?: number;
  maxDistance?: number;
  opacity?: number;
}) {
  const interaction = useContext(InteractionCtx);
  const registerTarget = interaction?.register;
  const id = useId();
  const groupRef = useRef<THREE.Group>(null);
  const [hover, setHover] = useState(false);

  useEffect(() => {
    if (!registerTarget || !groupRef.current) return;
    return registerTarget(id, {
      object: groupRef.current,
      label,
      maxDistance,
      onInteract: onClick,
    });
  }, [id, label, maxDistance, onClick, registerTarget]);

  const focused = interaction?.activeId === id;
  return (
    <group ref={groupRef} position={position}>
      <mesh
        scale={hover || focused ? 1.06 : 1}
        onClick={(e) => {
          e.stopPropagation();
          if (!interaction?.guard.current && e.distance <= maxDistance) onClick();
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHover(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHover(false);
          document.body.style.cursor = "auto";
        }}
      >
        <boxGeometry args={size} />
        <meshStandardMaterial
          color={color}
          emissive={emissive ?? "#000000"}
          emissiveIntensity={emissive ? 1.4 : 0}
          transparent={opacity < 1}
          opacity={opacity}
          depthWrite={opacity > 0.1}
        />
      </mesh>
    </group>
  );
}

function InteractionScanner({
  registryRef,
  activeRef,
  onActiveChange,
}: {
  registryRef: React.RefObject<Map<string, InteractiveTarget>>;
  activeRef: React.RefObject<string | null>;
  onActiveChange: (id: string | null) => void;
}) {
  const { camera } = useThree();

  useFrame(() => {
    camera.getWorldDirection(_viewDir);
    let bestId: string | null = null;
    let bestScore = -Infinity;
    registryRef.current.forEach((target, id) => {
      target.object.getWorldPosition(_targetPos);
      _targetDir.subVectors(_targetPos, camera.position);
      const distance = _targetDir.length();
      if (distance > target.maxDistance || distance < 0.15) return;
      const alignment = _targetDir.normalize().dot(_viewDir);
      // Con FOV mobile stretto basta che l'oggetto sia chiaramente davanti:
      // il punteggio continua comunque a preferire quello più vicino al mirino.
      if (alignment < 0.55) return;
      const score = alignment - distance * 0.012;
      if (score > bestScore) {
        bestScore = score;
        bestId = id;
      }
    });
    if (bestId !== activeRef.current) {
      activeRef.current = bestId;
      onActiveChange(bestId);
    }
  });

  return null;
}

/** Palco riutilizzabile in prima persona: Canvas + controlli + resa pixel. */
export default function FirstPersonStage({
  children,
  onExit,
  hint,
  startPos = [0, 1.5, 3.2],
  startYaw = 0,
  bounds = { minX: -4, maxX: 4, minZ: -4, maxZ: 4 },
  obstacles = [],
  exitLabel = "‹ esci",
  debug = false,
}: {
  children: ReactNode;
  onExit: () => void;
  hint?: string;
  startPos?: [number, number, number];
  startYaw?: number;
  bounds?: Bounds;
  obstacles?: Obstacle[];
  exitLabel?: string;
  debug?: boolean;
}) {
  const moveRef = useRef({ x: 0, y: 0 });
  const keysRef = useRef({ x: 0, y: 0 });
  const sprintRef = useRef(false);
  const lookRef = useRef({ yaw: startYaw, pitch: 0 });
  const lookPointer = useRef<number | null>(null);
  const last = useRef({ x: 0, y: 0 });
  const dragMoved = useRef(false);
  const registryRef = useRef(new Map<string, InteractiveTarget>());
  const activeRef = useRef<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hasLooked, setHasLooked] = useState(false);
  const [debugFrame, setDebugFrame] = useState<DebugFrame | null>(null);

  const register = useCallback((id: string, target: InteractiveTarget) => {
    registryRef.current.set(id, target);
    return () => {
      registryRef.current.delete(id);
      if (activeRef.current === id) {
        activeRef.current = null;
        setActiveId(null);
      }
    };
  }, []);

  const interactionValue = useMemo(
    () => ({ activeId, guard: dragMoved, register }),
    [activeId, register],
  );

  const interact = useCallback(() => {
    // Il pulsante USA e il tasto E sono azioni esplicite: devono funzionare
    // anche immediatamente dopo uno swipe della visuale.
    if (!activeRef.current) return;
    registryRef.current.get(activeRef.current)?.onInteract();
  }, []);

  // Tastiera (desktop): WASD / frecce
  useEffect(() => {
    const km: Record<string, [number, number]> = {
      KeyW: [0, -1], ArrowUp: [0, -1],
      KeyS: [0, 1], ArrowDown: [0, 1],
      KeyA: [-1, 0], ArrowLeft: [-1, 0],
      KeyD: [1, 0], ArrowRight: [1, 0],
    };
    const pressed = new Set<string>();
    const recompute = () => {
      let x = 0;
      let y = 0;
      pressed.forEach((c) => {
        const v = km[c];
        if (v) {
          x += v[0];
          y += v[1];
        }
      });
      keysRef.current = {
        x: clamp(x, -1, 1),
        y: clamp(y, -1, 1),
      };
    };
    const down = (e: KeyboardEvent) => {
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") sprintRef.current = true;
      if (e.code === "KeyE") interact();
      if (km[e.code]) {
        pressed.add(e.code);
        recompute();
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "ShiftLeft" || e.code === "ShiftRight") sprintRef.current = false;
      if (km[e.code]) {
        pressed.delete(e.code);
        recompute();
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [interact]);

  const activeTarget = activeId ? registryRef.current.get(activeId) : undefined;

  return (
    <div className="relative flex-1 pixel-border overflow-hidden touch-none select-none">
      <Canvas
        shadows="soft"
        dpr={[1, 1.25]}
        gl={{ antialias: false }}
        camera={{ fov: 82, near: 0.1, far: 100 }}
      >
        <InteractionCtx.Provider value={interactionValue}>
          <Suspense fallback={null}>
            {children}
            {/* Scalda la GPU (upload texture + compila shader) prima che il
                giocatore prenda il controllo: niente hitch nei primi secondi. */}
            <Preload all />
          </Suspense>
        </InteractionCtx.Provider>
        <InteractionScanner
          registryRef={registryRef}
          activeRef={activeRef}
          onActiveChange={setActiveId}
        />
        <FPController
          moveRef={moveRef}
          keysRef={keysRef}
          lookRef={lookRef}
          startPos={startPos}
          bounds={bounds}
          obstacles={obstacles}
          sprintRef={sprintRef}
        />
        {debug && <DebugProbe lookRef={lookRef} onDebugFrame={setDebugFrame} />}
        <EffectComposer multisampling={0}>
          <Pixelation granularity={3} />
        </EffectComposer>
      </Canvas>

      {/* Superficie touch indipendente dal canvas: cattura un dito e mantiene
          il gesto anche quando scivola fuori dall'area. Lo yaw non è limitato,
          quindi la rotazione orizzontale è realmente a 360°. */}
      <div
        data-testid="look-zone"
        aria-label="Area visuale: trascina per girarti"
        className="game-look-zone absolute inset-0 z-10 touch-none select-none"
        onPointerDown={(e) => {
          if (lookPointer.current !== null) return;
          e.preventDefault();
          lookPointer.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          dragMoved.current = false;
          last.current = { x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          if (lookPointer.current !== e.pointerId) return;
          const dx = e.clientX - last.current.x;
          const dy = e.clientY - last.current.y;
          if (Math.abs(dx) + Math.abs(dy) > 3) {
            dragMoved.current = true;
            setHasLooked(true);
          }
          last.current = { x: e.clientX, y: e.clientY };
          const sensitivity = 0.0062;
          lookRef.current.yaw -= dx * sensitivity;
          lookRef.current.pitch = clamp(
            lookRef.current.pitch - dy * sensitivity,
            -0.82,
            0.82,
          );
        }}
        onPointerUp={(e) => {
          if (lookPointer.current !== e.pointerId) return;
          lookPointer.current = null;
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId);
          }
        }}
        onPointerCancel={(e) => {
          if (lookPointer.current === e.pointerId) lookPointer.current = null;
        }}
      />

      <button
        onClick={onExit}
        className="absolute top-2 left-2 z-30 text-lg text-[var(--muted)] bg-[var(--panel)]/70 px-2 rounded"
      >
        {exitLabel}
      </button>
      <p className="absolute top-2 right-2 z-30 text-sm text-[var(--muted)] bg-[var(--panel)]/70 px-2 rounded text-right max-w-[55%]">
        {hint ?? "Trascina per guardarti intorno · joystick per muoverti"}
      </p>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 text-[var(--neon)] text-xl opacity-70 pointer-events-none">
        +
      </div>

      {debug && debugFrame && (
        <div
          data-testid="debug-coord"
          className="absolute left-2 top-12 z-40 pointer-events-none font-pixel text-[7px] leading-relaxed text-[var(--neon)] bg-black/75 px-2 py-2 pixel-border max-w-[260px]"
        >
          <div className="text-white/85">DEBUG COORD</div>
          <div>CAM {fmtVec(debugFrame.camera)}</div>
          <div>
            LOOK Y {fmt(THREE.MathUtils.radToDeg(debugFrame.yaw))} P{" "}
            {fmt(THREE.MathUtils.radToDeg(debugFrame.pitch))}
          </div>
          <div>MIRINO {fmtVec(debugFrame.aimPoint)}</div>
          <div>
            HIT {debugFrame.hitObject ?? "nessuno"}{" "}
            {debugFrame.hitDistance != null ? `${fmt(debugFrame.hitDistance)}m` : ""}
          </div>
        </div>
      )}

      {!hasLooked && (
        <div className="absolute right-3 bottom-32 z-20 pointer-events-none font-pixel text-[7px] leading-relaxed text-right text-white/80 bg-black/55 px-2 py-2 rounded pulse-glow">
          TRASCINA PER GIRARTI ↔
        </div>
      )}

      {activeTarget && (
        <button
          onClick={(e) => {
            // I click con detail 0 arrivano da tastiera/tecnologie assistive.
            if (e.detail === 0) interact();
          }}
          onPointerDown={(e) => {
            // Il tap esplicito deve partire anche se un altro dito sta ancora
            // tenendo premuto il joystick (Safari/iOS incluso).
            e.preventDefault();
            interact();
          }}
          // Sollevato sopra il joystick (sinistra) e il taccuino (destra) per
          // non sovrapporsi ai comandi su schermi stretti.
          className="absolute left-1/2 bottom-44 -translate-x-1/2 z-30 font-pixel text-[9px] leading-relaxed px-4 py-3 pixel-border bg-[var(--panel-2)]/95 text-[var(--neon)] max-w-[80%] text-center active:translate-y-[2px]"
        >
          USA · {activeTarget.label}
          <span className="hidden sm:inline text-[var(--muted)]"> [E]</span>
        </button>
      )}

      <div
        className="absolute bottom-3 left-3 z-30"
        onPointerDown={(e) => e.stopPropagation()}
        onPointerMove={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        <Joystick
          onMove={(x, y) => (moveRef.current = { x, y })}
          onEnd={() => (moveRef.current = { x: 0, y: 0 })}
        />
      </div>
    </div>
  );
}
