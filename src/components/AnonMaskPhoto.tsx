"use client";

/* eslint-disable @next/next/no-img-element */
import { useState, type CSSProperties } from "react";
import AnonMask from "./AnonMask";

/** Percorso della foto reale della maschera (da salvare in public/). */
const SRC = "/anon-mask.png";

/**
 * Maschera di Guy Fawkes come FOTO reale, con emersione dal nero, glow
 * pulsante e glitch cromatico opzionale. Se il file non c'è ancora, ripiega
 * sulla maschera vettoriale (AnonMask) così l'app non mostra mai un'immagine
 * rotta.
 */
export default function AnonMaskPhoto({
  size = 160,
  glitch = false,
  className = "",
  style,
}: {
  size?: number;
  glitch?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return <AnonMask size={size} className={className} style={style} />;
  }

  return (
    <div
      className={`mask-photo-wrap mask-glow ${className}`}
      style={{ width: size, height: size, ...style }}
    >
      <img
        src={SRC}
        alt="Maschera di Guy Fawkes"
        className="mask-emerge"
        onError={() => setFailed(true)}
      />
      {glitch && (
        <>
          <img src={SRC} alt="" aria-hidden className="g g-cyan" />
          <img src={SRC} alt="" aria-hidden className="g g-mag" />
        </>
      )}
    </div>
  );
}
