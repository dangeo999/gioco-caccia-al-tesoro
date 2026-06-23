"use client";

import { useEffect, useState } from "react";
import { useGame } from "@/lib/game/store";
import { sfx } from "@/lib/sfx";
import Screen from "@/components/ui/Screen";
import Typewriter from "@/components/ui/Typewriter";
import AnonMaskPhoto from "@/components/AnonMaskPhoto";

type Phase = "idle" | "boot" | "reveal" | "identity";

const BOOT =
  "> stabilire connessione sicura ........ [OK]\n" +
  "> instradamento su nodi cifrati ....... [OK]\n" +
  "> bypass sorveglianza di Pofi ......... [OK]\n" +
  "> identità in ingresso: SCONOSCIUTA\n" +
  ">\n" +
  "> Ti osserviamo da settimane, recluta.\n" +
  "> Noti i dettagli che gli altri ignorano.\n" +
  "> Per questo sei qui.";

export default function Onboarding() {
  const { register } = useGame();
  const [phase, setPhase] = useState<Phase>("idle");
  const [bootDone, setBootDone] = useState(false);
  const [name, setName] = useState("");
  const valid = name.trim().length >= 2;

  // La maschera entra con un'interferenza sonora.
  useEffect(() => {
    if (phase === "reveal") sfx.glitch();
  }, [phase]);

  // ---- IDLE: un tocco "stabilisce la connessione" (sblocca anche l'audio). ----
  if (phase === "idle") {
    return (
      <Screen>
        <button
          onClick={() => {
            sfx.boot();
            setPhase("boot");
          }}
          className="flex-1 w-full flex flex-col items-center justify-center gap-7 fade-in"
        >
          <AnonMaskPhoto size={158} />
          <span className="font-pixel text-[10px] text-[var(--term)] px-5 py-3 pixel-border pulse-glow">
            ▶ STABILISCI CONNESSIONE
          </span>
          <span className="text-[var(--muted)] text-base">tocca lo schermo</span>
        </button>
      </Screen>
    );
  }

  return (
    <Screen>
      <div className="relative flex-1 flex flex-col justify-center gap-6">
        <h1 className="font-pixel text-sm text-center leading-relaxed text-[var(--text)]">
          <span className="glitch" data-text="IL SEGRETO DI ARGIL">
            IL SEGRETO DI ARGIL
          </span>
        </h1>

        {/* salta durante le scene narrative */}
        {(phase === "boot" || phase === "reveal") && (
          <button
            onClick={() => {
              sfx.open();
              setPhase("identity");
            }}
            className="absolute top-0 right-0 z-20 text-base text-[var(--muted)] px-2"
          >
            salta ▸
          </button>
        )}

        {/* ---- BOOT: traccia da terminale ---- */}
        {phase === "boot" && (
          <>
            <div className="pixel-border bg-black/70 p-4 min-h-[220px] crt-flicker">
              <p className="text-[var(--term)] text-lg whitespace-pre-line leading-snug">
                <Typewriter
                  text={BOOT}
                  speed={14}
                  onDone={() => setBootDone(true)}
                />
              </p>
            </div>
            {bootDone && (
              <button
                onClick={() => {
                  sfx.open();
                  setPhase("reveal");
                }}
                className="font-pixel text-[11px] py-3 pixel-border bg-[var(--panel-2)] text-[var(--neon)] active:translate-y-[2px] pop-in"
              >
                CONTINUA ▸
              </button>
            )}
          </>
        )}

        {/* ---- REVEAL: maschera + manifesto ---- */}
        {phase === "reveal" && (
          <div className="flex flex-col items-center gap-5 fade-in">
            <AnonMaskPhoto size={188} glitch className="mask-in" />
            <div className="text-center font-pixel text-[11px] leading-relaxed text-[var(--text)] space-y-2">
              <p>NOI NON ABBIAMO VOLTO.</p>
              <p>NOI NON ABBIAMO NOME.</p>
              <p className="text-[var(--magenta)]">
                <span className="glitch" data-text="NOI SIAMO LEGIONE.">
                  NOI SIAMO LEGIONE.
                </span>
              </p>
            </div>
            <button
              onClick={() => {
                sfx.unlock();
                setPhase("identity");
              }}
              className="font-pixel text-[11px] py-3 px-5 pixel-border bg-[var(--panel-2)] text-[var(--neon)] active:translate-y-[2px] pop-in"
            >
              INDOSSA LA MASCHERA
            </button>
          </div>
        )}

        {/* ---- IDENTITY: scelta dell'alias ---- */}
        {phase === "identity" && (
          <form
            className="flex flex-col gap-3 fade-in"
            onSubmit={(e) => {
              e.preventDefault();
              if (valid) {
                sfx.solved();
                register(name);
              }
            }}
          >
            <div className="pixel-border bg-black/70 p-3">
              <p className="text-[var(--term)] text-lg leading-snug">
                root@argil:~# nuova_identità
                <br />
                &gt; il collettivo non usa nomi veri.
                <br />
                &gt; scegli il tuo{" "}
                <span className="text-[var(--neon)]">alias</span>:
              </p>
            </div>
            <input
              autoFocus
              value={name}
              maxLength={20}
              onChange={(e) => setName(e.target.value)}
              placeholder="es. NightOwl"
              className="bg-[var(--panel-2)] pixel-border px-3 py-2 text-2xl text-[var(--neon)] outline-none"
            />
            <button
              type="submit"
              disabled={!valid}
              className="font-pixel text-[11px] py-3 mt-1 pixel-border bg-[var(--panel-2)] text-[var(--neon)] disabled:opacity-40 active:translate-y-[2px]"
            >
              ENTRA NEL COLLETTIVO
            </button>
            <p className="text-base text-[var(--muted)] text-center">
              Nessuna password. Il tuo progresso resta su questo telefono.
            </p>
          </form>
        )}
      </div>
    </Screen>
  );
}
