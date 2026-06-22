"use client";

import { useEffect, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { useGame } from "@/lib/game/store";
import { CHAPTERS } from "@/lib/game/types";
import { encodeSave } from "@/lib/game/backup";
import Screen from "@/components/ui/Screen";
import Modal from "@/components/ui/Modal";
import Joystick from "@/components/Joystick";

// Posizioni dei luoghi sulla mappa, in % (il 10 = Museo in cima alla collina).
const POS: Record<number, { x: number; y: number }> = {
  1: { x: 50, y: 82 },
  2: { x: 30, y: 68 },
  3: { x: 70, y: 65 },
  4: { x: 18, y: 52 },
  5: { x: 47, y: 54 },
  6: { x: 76, y: 48 },
  7: { x: 30, y: 36 },
  8: { x: 62, y: 34 },
  9: { x: 44, y: 22 },
  10: { x: 70, y: 14 },
};

const SPEED = 22; // % della mappa al secondo
const ENTER_DIST = 7; // quanto vicino bisogna essere per "entrare"

const KEY_VEC: Record<string, [number, number]> = {
  ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0],
  w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
};

type Near = { id: number; status: "play" | "done" | "locked"; week: number };

export default function TownMap({ onPlay }: { onPlay: (id: number) => void }) {
  const {
    nickname,
    playerId,
    coins,
    completedLevels,
    fragments,
    unlockedChapters,
    completionCode,
    reset,
  } = useGame();

  const [showBackup, setShowBackup] = useState(false);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);

  const backupLink =
    origin +
    "/recupera#" +
    encodeSave({
      nickname,
      playerId,
      coins,
      fragments,
      completedLevels,
      unlockedChapters,
      completionCode,
    });

  const dir = useRef({ x: 0, y: 0 }); // dal joystick
  const keys = useRef<Record<string, boolean>>({});
  const pos = useRef({ x: 50, y: 88 });
  const facing = useRef(1);

  const ominoRef = useRef<HTMLDivElement>(null);
  const facingRef = useRef<HTMLDivElement>(null);
  const bobRef = useRef<HTMLDivElement>(null);

  const [near, setNear] = useState<Near | null>(null);

  // Tastiera (desktop)
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (KEY_VEC[e.key]) {
        keys.current[e.key] = true;
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => {
      if (KEY_VEC[e.key]) keys.current[e.key] = false;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  // Game loop
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let lastNearId = -99;

    // posizione iniziale
    if (ominoRef.current) {
      ominoRef.current.style.left = pos.current.x + "%";
      ominoRef.current.style.top = pos.current.y + "%";
    }

    const loop = (t: number) => {
      const dt = Math.min((t - last) / 1000, 0.05);
      last = t;

      let vx = dir.current.x;
      let vy = dir.current.y;
      for (const k in keys.current) {
        if (keys.current[k]) {
          vx += KEY_VEC[k][0];
          vy += KEY_VEC[k][1];
        }
      }
      const mag = Math.hypot(vx, vy);
      if (mag > 1) {
        vx /= mag;
        vy /= mag;
      }
      const moving = mag > 0.05;

      if (moving) {
        pos.current.x = Math.max(5, Math.min(95, pos.current.x + vx * SPEED * dt));
        pos.current.y = Math.max(9, Math.min(93, pos.current.y + vy * SPEED * dt));
        if (vx < -0.05) facing.current = -1;
        else if (vx > 0.05) facing.current = 1;
      }

      if (ominoRef.current) {
        ominoRef.current.style.left = pos.current.x + "%";
        ominoRef.current.style.top = pos.current.y + "%";
      }
      if (facingRef.current) {
        facingRef.current.style.transform = `scaleX(${facing.current})`;
      }
      if (bobRef.current) {
        bobRef.current.classList.toggle("walk-bob", moving);
      }

      // luogo più vicino entro il raggio di ingresso
      let bestId = -1;
      let bestD = 999;
      for (const ch of CHAPTERS) {
        const p = POS[ch.id];
        const d = Math.hypot(pos.current.x - p.x, pos.current.y - p.y);
        if (d < bestD) {
          bestD = d;
          bestId = ch.id;
        }
      }
      const newNearId = bestD <= ENTER_DIST ? bestId : -1;
      if (newNearId !== lastNearId) {
        lastNearId = newNearId;
        if (newNearId === -1) {
          setNear(null);
        } else {
          const ch = CHAPTERS.find((c) => c.id === newNearId)!;
          const done = completedLevels.includes(ch.id);
          setNear({
            id: ch.id,
            status: done
              ? "done"
              : unlockedChapters.includes(ch.id)
                ? "play"
                : "locked",
            week: ch.unlockWeek,
          });
        }
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [completedLevels, unlockedChapters]);

  // Sentiero che collega i luoghi 1→10 (per l'SVG di sfondo)
  const trail = CHAPTERS.map((c) => `${POS[c.id].x},${POS[c.id].y}`).join(" ");

  return (
    <Screen>
      {/* HUD */}
      <header className="flex items-center justify-between mb-2">
        <div className="leading-tight">
          <p className="font-pixel text-[9px] text-[var(--muted)]">RECLUTA</p>
          <p className="text-2xl text-[var(--neon)]">{nickname}</p>
        </div>
        <div className="text-right leading-tight">
          <p className="font-pixel text-[9px] text-[var(--muted)]">
            ◆ {coins} · {fragments.length}/10
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => {
                setCopied(false);
                setShowBackup(true);
              }}
              className="text-sm text-[var(--neon)] underline"
            >
              backup
            </button>
            <button
              onClick={() => {
                if (confirm("Azzerare il salvataggio? (solo per test)")) reset();
              }}
              className="text-sm text-[var(--muted)] underline"
            >
              reset (test)
            </button>
          </div>
        </div>
      </header>

      {completionCode ? (
        <div className="pixel-border bg-[var(--panel)] p-3 mb-2 text-center pop-in">
          <p className="font-pixel text-[10px] glow-magenta mb-1">
            HAI COMPLETATO IL GIOCO
          </p>
          <p className="text-base text-[var(--muted)]">
            Mostra questo codice agli organizzatori alla caccia:
          </p>
          <p className="text-2xl text-[var(--amber)] tracking-widest mt-1">
            {completionCode}
          </p>
        </div>
      ) : (
        <p className="text-center text-base text-[var(--muted)] mb-2">
          Muovi l&apos;omino col joystick (o le frecce) e raggiungi un luogo illuminato.
        </p>
      )}

      {/* Mappa esplorabile */}
      <div className="relative flex-1 pixel-border overflow-hidden bg-gradient-to-b from-[#171028] via-[#13182a] to-[#101a16]">
        {/* etichetta */}
        <span className="absolute top-2 left-1/2 -translate-x-1/2 font-pixel text-[10px] glow-magenta">
          POFI
        </span>
        <span className="absolute top-2 right-3 text-sm text-[var(--muted)]">↑ Museo</span>

        {/* sentiero */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <polyline
            points={trail}
            fill="none"
            stroke="rgba(138,138,160,0.25)"
            strokeWidth="0.8"
            strokeDasharray="2 2"
          />
        </svg>

        {/* marker dei luoghi */}
        {CHAPTERS.map((ch) => {
          const p = POS[ch.id];
          const done = completedLevels.includes(ch.id);
          const playable = unlockedChapters.includes(ch.id) && !done;
          return (
            <div
              key={ch.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              <div
                className={`w-8 h-8 rounded-md pixel-border flex items-center justify-center font-pixel text-[10px]
                  ${done ? "bg-[var(--panel)] text-[var(--term)]" : playable ? "bg-[var(--panel-2)] text-[var(--neon)] pulse-glow" : "bg-[var(--panel)] text-[var(--muted)] opacity-60"}`}
              >
                {done ? "✓" : playable ? ch.id : "🔒"}
              </div>
            </div>
          );
        })}

        {/* l'omino (segnaposto) */}
        <div ref={ominoRef} className="absolute -translate-x-1/2 -translate-y-1/2 z-20">
          <div ref={facingRef}>
            <div ref={bobRef} className="flex flex-col items-center">
              {/* maschera */}
              <div className="w-4 h-4 bg-[#e9e9f2] rounded-sm border border-[#bfbfd0]" />
              {/* cappuccio/corpo */}
              <div className="w-5 h-5 -mt-0.5 bg-[#15151f] rounded-sm border border-[var(--edge)]" />
            </div>
          </div>
          {/* ombra */}
          <div className="mx-auto mt-0.5 w-5 h-1.5 rounded-full bg-black/40 blur-[1px]" />
        </div>

        {/* Joystick */}
        <div className="absolute bottom-3 left-3 z-30">
          <Joystick
            onMove={(x, y) => (dir.current = { x, y })}
            onEnd={() => (dir.current = { x: 0, y: 0 })}
          />
        </div>

        {/* Pannello "entra" / info luogo vicino */}
        {near && (
          <div className="absolute bottom-4 right-3 z-30 max-w-[60%] text-right">
            {near.status === "play" && (
              <button
                onClick={() => onPlay(near.id)}
                className="font-pixel text-[11px] px-4 py-3 pixel-border bg-[var(--panel-2)] text-[var(--neon)] pulse-glow active:translate-y-[2px]"
              >
                ENTRA ▶
              </button>
            )}
            {near.status === "locked" && (
              <p className="pixel-border bg-[var(--panel)] px-3 py-2 text-base text-[var(--muted)]">
                Chiuso · QR settimana {near.week}
              </p>
            )}
            {near.status === "done" && (
              <p className="pixel-border bg-[var(--panel)] px-3 py-2 text-base text-[var(--term)]">
                Già completato ✓
              </p>
            )}
          </div>
        )}
      </div>

      {showBackup && (
        <Modal title="BACKUP PROGRESSO" onClose={() => setShowBackup(false)}>
          <p className="text-base text-[var(--muted)] mb-3">
            Salva questo link (o scansiona il QR da un altro telefono) per
            recuperare il progresso se cambi dispositivo. È una fotografia di
            adesso: ricopialo dopo aver giocato altro.
          </p>
          <div className="bg-white p-2 rounded mx-auto w-fit mb-3">
            <QRCodeSVG value={backupLink} size={160} level="L" />
          </div>
          <p className="text-xs text-[var(--muted)] break-all bg-[var(--panel-2)] p-2 pixel-border mb-3">
            {backupLink}
          </p>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(backupLink);
                setCopied(true);
              } catch {
                /* clipboard non disponibile */
              }
            }}
            className="w-full font-pixel text-[10px] py-3 pixel-border bg-[var(--panel-2)] text-[var(--neon)] active:translate-y-[2px]"
          >
            {copied ? "COPIATO ✓" : "COPIA LINK"}
          </button>
        </Modal>
      )}
    </Screen>
  );
}
