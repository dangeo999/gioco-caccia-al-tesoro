"use client";

import { useState } from "react";
import { useGame } from "@/lib/game/store";
import { sfx } from "@/lib/sfx";
import Screen from "@/components/ui/Screen";
import Typewriter from "@/components/ui/Typewriter";
import AnonMaskPhoto from "@/components/AnonMaskPhoto";

type Phase = "intro" | "identity";

const BOOT =
  "> connessione sicura ........ [OK]\n" +
  "> sorveglianza di Pofi ...... [OK]\n" +
  "> identità in ingresso: SCONOSCIUTA\n" +
  ">\n" +
  "> Ti osserviamo da settimane, recluta.\n" +
  "> Noti ciò che gli altri ignorano.";

export default function Onboarding() {
  const { register } = useGame();
  const [phase, setPhase] = useState<Phase>("intro");
  const [connected, setConnected] = useState(false);
  const [bootDone, setBootDone] = useState(false);
  const [name, setName] = useState("");
  const valid = name.trim().length >= 2;

  return (
    <Screen>
      <div className="scan-sweep" aria-hidden />
      <div className="relative flex-1 flex flex-col items-center justify-center gap-5 py-4 overflow-y-auto">
        <h1 className="font-pixel text-xs text-center leading-relaxed text-[var(--text)]">
          <span className="glitch" data-text="IL SEGRETO DI ARGIL">
            IL SEGRETO DI ARGIL
          </span>
        </h1>

        {/* La maschera resta in scena per tutta l'iniziazione (continuità). */}
        <AnonMaskPhoto size={132} glitch />

        {/* ---- INTRO, prima del tocco: connessione (sblocca anche l'audio). ---- */}
        {phase === "intro" && !connected && (
          <div className="flex flex-col items-center gap-4 fade-in">
            <button
              onClick={() => {
                sfx.boot();
                setConnected(true);
              }}
              className="font-pixel text-[10px] text-[var(--term)] px-5 py-3 pixel-border pulse-glow active:translate-y-[2px]"
            >
              ▶ STABILISCI CONNESSIONE
            </button>
            <span className="cursor text-[var(--muted)] text-base">
              in ascolto sulla rete
            </span>
          </div>
        )}

        {/* ---- INTRO, dopo il tocco: boot + manifesto sulla stessa schermata. ---- */}
        {phase === "intro" && connected && (
          <div className="w-full flex flex-col gap-4 fade-in">
            <div className="pixel-border bg-black/70 p-3 crt-flicker">
              <p className="text-[var(--term)] text-base whitespace-pre-line leading-snug">
                <Typewriter
                  text={BOOT}
                  speed={14}
                  onDone={() => setBootDone(true)}
                />
              </p>
              {bootDone && (
                <div className="mt-3 text-center font-pixel text-[10px] leading-relaxed text-[var(--text)] space-y-1 fade-in">
                  <p>NON ABBIAMO VOLTO. NON ABBIAMO NOME.</p>
                  <p className="text-[var(--magenta)]">
                    <span className="glitch" data-text="NOI SIAMO LEGIONE.">
                      NOI SIAMO LEGIONE.
                    </span>
                  </p>
                </div>
              )}
            </div>
            {bootDone && (
              <button
                onClick={() => {
                  sfx.unlock();
                  setPhase("identity");
                }}
                className="font-pixel text-[11px] py-3 pixel-border bg-[var(--panel-2)] text-[var(--neon)] active:translate-y-[2px] pop-in"
              >
                INDOSSA LA MASCHERA ▸
              </button>
            )}
          </div>
        )}

        {/* ---- IDENTITY: scelta dell'alias. ---- */}
        {phase === "identity" && (
          <form
            className="w-full flex flex-col gap-3 fade-in"
            onSubmit={(e) => {
              e.preventDefault();
              if (valid) {
                sfx.solved();
                register(name);
              }
            }}
          >
            <div className="pixel-border bg-black/70 p-3">
              <p className="text-[var(--term)] text-base leading-snug">
                root@argil:~# nuova_identità
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
              className="font-pixel text-[11px] py-3 pixel-border bg-[var(--panel-2)] text-[var(--neon)] disabled:opacity-40 active:translate-y-[2px]"
            >
              ENTRA NEL COLLETTIVO
            </button>
            <p className="text-base text-[var(--muted)] text-center">
              Nessuna password. Il progresso resta su questo telefono.
            </p>
          </form>
        )}
      </div>
    </Screen>
  );
}
