"use client";

import { useEffect, useState } from "react";
import { isMuted, setMuted } from "@/lib/sfx";

/** Interruttore audio/vibrazione (persistito). */
export default function MuteButton({ className }: { className?: string }) {
  const [m, setM] = useState(false);

  useEffect(() => setM(isMuted()), []);

  return (
    <button
      type="button"
      aria-label={m ? "Riattiva audio" : "Disattiva audio"}
      onClick={() => {
        const next = !m;
        setMuted(next);
        setM(next);
      }}
      className={className}
    >
      {m ? "🔇" : "🔊"}
    </button>
  );
}
