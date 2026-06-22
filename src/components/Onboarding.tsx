"use client";

import { useState } from "react";
import { useGame } from "@/lib/game/store";
import Screen from "@/components/ui/Screen";
import Typewriter from "@/components/ui/Typewriter";

const INTRO =
  "Connessione stabilita...\nQui Anonymous. Ti osserviamo da un po'.\nPofi nasconde un segreto piu' antico del paese stesso.\nCi servono occhi nuovi. Scegli un nome in codice.";

export default function Onboarding() {
  const { register } = useGame();
  const [name, setName] = useState("");
  const [introDone, setIntroDone] = useState(false);

  const valid = name.trim().length >= 2;

  return (
    <Screen>
      <div className="flex-1 flex flex-col justify-center gap-6">
        <h1 className="font-pixel text-base glow-magenta text-center leading-relaxed">
          IL SEGRETO<br />DI ARGIL
        </h1>

        <div className="pixel-border bg-[var(--panel)] p-4 min-h-[160px]">
          <p className="text-[var(--term)] text-xl whitespace-pre-line">
            <Typewriter text={INTRO} onDone={() => setIntroDone(true)} />
          </p>
        </div>

        {introDone && (
          <form
            className="flex flex-col gap-3 pop-in"
            onSubmit={(e) => {
              e.preventDefault();
              if (valid) register(name);
            }}
          >
            <label className="font-pixel text-[10px] text-[var(--muted)]">
              NOME IN CODICE
            </label>
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
              className="font-pixel text-[11px] py-3 mt-1 pixel-border bg-[var(--panel-2)] text-[var(--neon)] disabled:opacity-40 active:translate-y-[2px] transition"
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
