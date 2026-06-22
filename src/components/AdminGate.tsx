"use client";

import { useEffect, useState, type ReactNode } from "react";
import Screen from "@/components/ui/Screen";

// Protezione leggera dell'area organizzatori (impedisce che i token QR siano
// esposti pubblicamente). NON è sicurezza vera: la passphrase è nel bundle.
// Con Supabase arriverà l'autenticazione reale.
const ADMIN_PASS = "argil-staff";
const SESSION_KEY = "argil-admin-ok";

export default function AdminGate({ children }: { children: ReactNode }) {
  const [ok, setOk] = useState(false);
  const [pass, setPass] = useState("");
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === "1") setOk(true);
  }, []);

  if (ok) return <>{children}</>;

  return (
    <Screen>
      <form
        className="flex-1 flex flex-col justify-center gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (pass === ADMIN_PASS) {
            sessionStorage.setItem(SESSION_KEY, "1");
            setOk(true);
          } else {
            setErr(true);
          }
        }}
      >
        <h1 className="font-pixel text-sm glow-magenta text-center">
          AREA ORGANIZZATORI
        </h1>
        <p className="text-center text-base text-[var(--muted)]">
          Inserisci la passphrase per accedere.
        </p>
        <input
          type="password"
          autoFocus
          value={pass}
          onChange={(e) => {
            setPass(e.target.value);
            setErr(false);
          }}
          className="bg-[var(--panel-2)] pixel-border px-3 py-2 text-2xl text-[var(--neon)] outline-none"
        />
        {err && (
          <p className="text-[var(--magenta)] text-center text-lg">
            Passphrase errata.
          </p>
        )}
        <button
          type="submit"
          className="font-pixel text-[11px] py-3 pixel-border bg-[var(--panel-2)] text-[var(--neon)] active:translate-y-[2px]"
        >
          ENTRA
        </button>
      </form>
    </Screen>
  );
}
