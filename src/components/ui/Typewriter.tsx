"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Effetto macchina-da-scrivere stile terminale.
 * Usato per i messaggi di Anonymous (incipit, reclutamento...).
 */
export default function Typewriter({
  text,
  speed = 26,
  className,
  onDone,
}: {
  text: string;
  speed?: number;
  className?: string;
  onDone?: () => void;
}) {
  const [shown, setShown] = useState("");
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    setShown("");
    let i = 0;
    const id = setInterval(() => {
      i++;
      setShown(text.slice(0, i));
      if (i >= text.length) {
        clearInterval(id);
        onDoneRef.current?.();
      }
    }, speed);
    return () => clearInterval(id);
  }, [text, speed]);

  return <span className={`cursor ${className ?? ""}`}>{shown}</span>;
}
