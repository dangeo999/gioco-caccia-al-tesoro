"use client";

import { useState } from "react";
import { useGame } from "@/lib/game/store";
import Onboarding from "@/components/Onboarding";
import TownMap from "@/components/TownMap";
import BarPortRoyal from "@/components/levels/BarPortRoyal";

export default function Home() {
  const { ready, nickname } = useGame();
  const [level, setLevel] = useState<number | null>(null);

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

  if (level === 1) return <BarPortRoyal onExit={() => setLevel(null)} />;

  return <TownMap onPlay={(id) => setLevel(id)} />;
}
