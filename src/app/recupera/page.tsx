"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGame } from "@/lib/game/store";
import { decodeSave } from "@/lib/game/backup";
import Screen from "@/components/ui/Screen";

/**
 * Ripristina il progresso da un "link magico" (snapshot del salvataggio).
 * Il dato sta nell'hash dell'URL: /recupera#<save-codificato>.
 */
export default function RecuperaPage() {
  const router = useRouter();
  const { ready, restore } = useGame();
  const [status, setStatus] = useState<"loading" | "ok" | "err">("loading");
  const [nick, setNick] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    const token =
      typeof window !== "undefined" ? window.location.hash.slice(1) : "";
    const save = token ? decodeSave(decodeURIComponent(token)) : null;
    if (!save) {
      setStatus("err");
      return;
    }
    restore(save);
    setNick(save.nickname);
    setStatus("ok");
  }, [ready, restore]);

  return (
    <Screen>
      <div className="flex-1 flex flex-col justify-center items-center text-center gap-5">
        {status === "loading" && (
          <p className="font-pixel text-[10px] text-[var(--muted)] cursor">
            ripristino
          </p>
        )}

        {status === "ok" && (
          <>
            <div className="text-6xl pop-in">📥</div>
            <h1 className="font-pixel text-sm glow-neon">PROGRESSO RIPRISTINATO</h1>
            <p className="text-xl text-[var(--term)]">Bentornato, {nick}.</p>
            <button
              onClick={() => router.push("/")}
              className="font-pixel text-[11px] py-3 px-5 pixel-border bg-[var(--panel-2)] text-[var(--neon)] active:translate-y-[2px]"
            >
              CONTINUA ▶
            </button>
          </>
        )}

        {status === "err" && (
          <>
            <h1 className="font-pixel text-sm glow-magenta">LINK NON VALIDO</h1>
            <p className="text-xl text-[var(--muted)] max-w-[280px]">
              Questo link di recupero è incompleto o danneggiato.
            </p>
            <button
              onClick={() => router.push("/")}
              className="font-pixel text-[11px] py-3 px-5 pixel-border bg-[var(--panel-2)] text-[var(--neon)]"
            >
              VAI AL GIOCO
            </button>
          </>
        )}
      </div>
    </Screen>
  );
}
