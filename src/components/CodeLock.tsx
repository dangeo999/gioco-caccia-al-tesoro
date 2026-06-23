"use client";

import { useState } from "react";
import { sfx } from "@/lib/sfx";

/**
 * Serratura a combinazione numerica con tastierino.
 * Riutilizzabile per qualsiasi livello "raccogli le cifre → apri".
 */
export default function CodeLock({
  solution,
  slotLabels,
  hint,
  hints,
  onSolved,
}: {
  solution: string;
  /** Etichette sotto ogni cifra (es. ["Insegna","Bottiglie","Lavagna"]). */
  slotLabels: string[];
  /** Suggerimento singolo, mostrato dopo 2 errori. */
  hint?: string;
  /** Suggerimenti progressivi: uno in più a ogni errore. Hanno priorità su `hint`. */
  hints?: string[];
  onSolved: () => void;
}) {
  const len = solution.length;
  const [entry, setEntry] = useState("");
  const [wrong, setWrong] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const press = (d: string) => {
    setWrong(false);
    if (entry.length < len) {
      sfx.digit();
      setEntry(entry + d);
    }
  };
  const back = () => setEntry((e) => e.slice(0, -1));

  // Aiuto crescente: dopo ogni errore mostra un suggerimento più esplicito.
  const escalating =
    hints && hints.length > 0 && attempts >= 1
      ? hints[Math.min(attempts, hints.length) - 1]
      : undefined;
  const shownHint = escalating ?? (hint && attempts >= 2 ? hint : undefined);
  const submit = () => {
    if (entry === solution) {
      sfx.solved();
      onSolved();
    } else {
      sfx.wrong();
      setWrong(true);
      setAttempts((a) => a + 1);
      setEntry("");
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Slot delle cifre */}
      <div className={`flex gap-3 ${wrong ? "shake" : ""}`}>
        {Array.from({ length: len }).map((_, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="pixel-border w-12 h-14 flex items-center justify-center bg-[var(--panel-2)] text-3xl text-[var(--neon)]">
              {entry[i] ?? ""}
            </div>
            <span className="text-sm text-[var(--muted)]">{slotLabels[i]}</span>
          </div>
        ))}
      </div>

      {/* Tastierino */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-[260px]">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button
            key={d}
            onClick={() => press(d)}
            className="pixel-border bg-[var(--panel-2)] py-3 text-2xl active:translate-y-[2px]"
          >
            {d}
          </button>
        ))}
        <button
          onClick={back}
          className="pixel-border bg-[var(--panel)] py-3 text-2xl active:translate-y-[2px]"
        >
          ⌫
        </button>
        <button
          onClick={() => press("0")}
          className="pixel-border bg-[var(--panel-2)] py-3 text-2xl active:translate-y-[2px]"
        >
          0
        </button>
        <button
          onClick={submit}
          disabled={entry.length !== len}
          className="pixel-border bg-[var(--panel)] py-3 text-[var(--term)] text-base active:translate-y-[2px] disabled:opacity-40"
        >
          OK
        </button>
      </div>

      {wrong && (
        <p className="text-[var(--magenta)] text-lg">
          Codice errato. Tentativo {attempts}. Riprova.
        </p>
      )}
      {shownHint && (
        <p className="text-[var(--muted)] text-base text-center">💡 {shownHint}</p>
      )}
    </div>
  );
}
