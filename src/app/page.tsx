"use client";

import { useGame } from "@/lib/game/store";
import Onboarding from "@/components/Onboarding";
import BarPortRoyal from "@/components/levels/BarPortRoyal";

export default function Home() {
  const { ready, nickname } = useGame();

  // Evita il "flash" prima di aver letto il salvataggio dal telefono.
  if (!ready) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="font-pixel text-[10px] text-[var(--muted)] cursor">
          caricamento
        </p>
      </div>
    );
  }

  if (!nickname) return <Onboarding />;

  // Niente più schermata dei livelli: dopo l'onboarding si entra diretti nel bar.
  return <BarPortRoyal />;
}
