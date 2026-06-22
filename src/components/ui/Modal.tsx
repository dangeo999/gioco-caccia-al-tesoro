"use client";

import type { ReactNode } from "react";

/**
 * Finestra modale generica (esame oggetto, dialoghi, vittoria).
 * Si chiude toccando lo sfondo, se `onClose` è fornito.
 */
export default function Modal({
  title,
  children,
  onClose,
}: {
  title?: string;
  children: ReactNode;
  onClose?: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="pixel-border pop-in w-full max-w-[440px] bg-[var(--panel)] p-5 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Chiudi"
            className="absolute top-2 right-3 text-2xl text-[var(--muted)] leading-none active:translate-y-[1px]"
          >
            ✕
          </button>
        )}
        {title && (
          <h2 className="font-pixel text-[11px] leading-relaxed glow-neon mb-3 pr-6">
            {title}
          </h2>
        )}
        <div className="text-xl leading-snug">{children}</div>
      </div>
    </div>
  );
}
