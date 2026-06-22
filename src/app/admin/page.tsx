"use client";

import { useState } from "react";
import Link from "next/link";
import { completionCodeFor } from "@/lib/game/types";
import Screen from "@/components/ui/Screen";
import AdminGate from "@/components/AdminGate";

/**
 * Pagina riservata agli organizzatori: verifica il codice finale di un
 * giocatore. Si digita il suo nickname e si confronta il codice atteso con
 * quello che il giocatore mostra sul telefono.
 *
 * ⚠️ Provvisorio (verifica offline). Per la finale: spostare su Supabase.
 */
export default function AdminPage() {
  const [nick, setNick] = useState("");
  const code = nick.trim().length >= 2 ? completionCodeFor(nick) : null;

  return (
    <AdminGate>
      <Screen>
      <div className="flex flex-col gap-5 py-4">
        <h1 className="font-pixel text-sm glow-magenta">ADMIN · VERIFICA</h1>
        <p className="text-base text-[var(--muted)]">
          Pagina riservata agli organizzatori. Digita il nickname del giocatore
          per vedere il codice che un genuino completatore deve mostrarti.
        </p>

        <label className="font-pixel text-[10px] text-[var(--muted)]">
          NICKNAME GIOCATORE
        </label>
        <input
          value={nick}
          onChange={(e) => setNick(e.target.value)}
          placeholder="es. NightOwl"
          className="bg-[var(--panel-2)] pixel-border px-3 py-2 text-2xl text-[var(--neon)] outline-none"
        />

        <div className="pixel-border bg-[var(--panel)] p-4 text-center">
          <p className="text-base text-[var(--muted)]">Codice atteso</p>
          <p className="text-3xl text-[var(--amber)] tracking-widest mt-1">
            {code ?? "—"}
          </p>
        </div>

        <p className="text-sm text-[var(--muted)]">
          Se il codice mostrato dal giocatore coincide, ha davvero completato il
          gioco. (Verifica offline provvisoria: la versione a prova di
          manomissione arriverà con Supabase.)
        </p>

        <Link
          href="/admin/qr"
          className="font-pixel text-[10px] py-3 text-center pixel-border bg-[var(--panel-2)] text-[var(--neon)]"
        >
          GENERATORE QR →
        </Link>
      </div>
      </Screen>
    </AdminGate>
  );
}
