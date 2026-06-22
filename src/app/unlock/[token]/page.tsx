"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGame } from "@/lib/game/store";
import { chapterByToken } from "@/lib/game/types";
import Screen from "@/components/ui/Screen";

/**
 * Pagina raggiunta scansionando un QR settimanale: /unlock/<token>.
 * Sblocca il capitolo corrispondente nel salvataggio del giocatore.
 * Il nome del luogo resta nascosto (la mappa lo svela solo giocando).
 */
export default function UnlockPage() {
  const params = useParams();
  const router = useRouter();
  const { ready, redeemChapter } = useGame();

  const token = String(params.token ?? "");
  const chapter = chapterByToken(token);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (!ready || !chapter) return;
    let cancelled = false;
    void redeemChapter(token, chapter.id).then((ok) => {
      if (!cancelled) setUnlocked(ok);
    });
    return () => {
      cancelled = true;
    };
  }, [ready, chapter, redeemChapter, token]);

  if (!chapter) {
    return (
      <Screen>
        <div className="flex-1 flex flex-col justify-center items-center text-center gap-4">
          <h1 className="font-pixel text-sm glow-magenta">QR NON VALIDO</h1>
          <p className="text-xl text-[var(--muted)]">
            Questo codice non corrisponde a nessun capitolo.
          </p>
          <button
            onClick={() => router.push("/")}
            className="font-pixel text-[11px] py-3 px-5 pixel-border bg-[var(--panel-2)] text-[var(--neon)]"
          >
            VAI AL GIOCO
          </button>
        </div>
      </Screen>
    );
  }

  return (
    <Screen>
      <div className="flex-1 flex flex-col justify-center items-center text-center gap-5">
        <div className="text-6xl pop-in">🔓</div>
        <h1 className="font-pixel text-sm glow-neon leading-relaxed">
          NUOVO CAPITOLO
          <br />
          SBLOCCATO
        </h1>
        <p className="text-xl text-[var(--term)]">
          Settimana {chapter.unlockWeek} · Capitolo {chapter.id}
        </p>
        <p className="text-base text-[var(--muted)] max-w-[280px]">
          Un nuovo luogo ti aspetta sulla mappa. Cosa nasconde? Scoprilo.
        </p>
        <button
          onClick={() => router.push("/")}
          disabled={!unlocked}
          className="font-pixel text-[11px] py-3 px-5 pixel-border bg-[var(--panel-2)] text-[var(--neon)] disabled:opacity-40 active:translate-y-[2px]"
        >
          {unlocked ? "VAI ALLA MAPPA ▶" : "sblocco…"}
        </button>
      </div>
    </Screen>
  );
}
