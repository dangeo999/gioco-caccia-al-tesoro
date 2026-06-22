"use client";

import { useRef, useState } from "react";

/**
 * Joystick analogico a schermo (touch + mouse).
 * Comunica al genitore un vettore direzione normalizzato in [-1, 1].
 */
export default function Joystick({
  onMove,
  onEnd,
}: {
  onMove: (x: number, y: number) => void;
  onEnd: () => void;
}) {
  const baseRef = useRef<HTMLDivElement>(null);
  const active = useRef(false);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const MAX = 44; // raggio massimo della levetta in px

  function update(e: React.PointerEvent) {
    const base = baseRef.current;
    if (!base) return;
    const r = base.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let dx = e.clientX - cx;
    let dy = e.clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > MAX) {
      dx = (dx / dist) * MAX;
      dy = (dy / dist) * MAX;
    }
    setKnob({ x: dx, y: dy });
    onMove(dx / MAX, dy / MAX);
  }

  function stop() {
    active.current = false;
    setKnob({ x: 0, y: 0 });
    onEnd();
  }

  return (
    <div
      ref={baseRef}
      onPointerDown={(e) => {
        active.current = true;
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
        update(e);
      }}
      onPointerMove={(e) => active.current && update(e)}
      onPointerUp={stop}
      onPointerCancel={stop}
      className="relative w-28 h-28 rounded-full bg-[var(--panel)]/70 pixel-border touch-none select-none"
      aria-label="Joystick di movimento"
    >
      <div
        className="absolute left-1/2 top-1/2 w-12 h-12 rounded-full bg-[var(--panel-2)] border-2 border-[var(--neon)]"
        style={{
          transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))`,
        }}
      />
    </div>
  );
}
