"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CHAPTERS } from "@/lib/game/types";
import Screen from "@/components/ui/Screen";
import AdminGate from "@/components/AdminGate";

/**
 * Generatore dei QR settimanali (uno per capitolo) da stampare e nascondere
 * vicino al luogo reale. Ogni QR punta a /unlock/<token>.
 */
export default function AdminQrPage() {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  return (
    <AdminGate>
      <Screen>
      <div className="flex flex-col gap-4 py-4">
        <h1 className="font-pixel text-sm glow-magenta">QR SETTIMANALI</h1>
        <p className="text-base text-[var(--muted)]">
          Un QR per capitolo: stampalo e nascondilo vicino al luogo reale. Chi lo
          scansiona sblocca quel capitolo nel gioco.
        </p>
        <p className="text-sm text-[var(--muted)]">
          Dominio attuale: <span className="text-[var(--term)]">{origin || "…"}</span>
          . Rigenera i QR dopo la pubblicazione online (cambierà il dominio).
        </p>

        {CHAPTERS.map((ch) => {
          const url = `${origin}/unlock/${ch.token}`;
          return (
            <div
              key={ch.id}
              className="pixel-border bg-[var(--panel)] p-3 flex items-center gap-3"
            >
              <div className="bg-white p-2 rounded shrink-0">
                {origin ? (
                  <QRCodeSVG value={url} size={104} level="M" />
                ) : (
                  <div className="w-[104px] h-[104px]" />
                )}
              </div>
              <div className="min-w-0">
                <p className="font-pixel text-[11px] glow-neon">
                  CAP. {ch.id}
                </p>
                <p className="text-base text-[var(--muted)]">
                  Settimana {ch.unlockWeek}
                </p>
                <p className="text-xs text-[var(--muted)] break-all mt-1">{url}</p>
              </div>
            </div>
          );
        })}
      </div>
      </Screen>
    </AdminGate>
  );
}
