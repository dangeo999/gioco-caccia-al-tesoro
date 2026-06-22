import type { ReactNode } from "react";

/**
 * Cornice "telefono": centra il contenuto su desktop e lo limita in larghezza,
 * così il gioco è pensato e testato mobile-first ma resta usabile ovunque.
 */
export default function Screen({ children }: { children: ReactNode }) {
  return (
    <main className="flex-1 w-full flex justify-center">
      <div
        className="w-full max-w-[480px] min-h-dvh flex flex-col"
        // Spazi sicuri per notch / barra home (iPhone) e bordi curvi (Android)
        style={{
          paddingTop: "max(1.1rem, env(safe-area-inset-top))",
          paddingBottom: "max(1.1rem, env(safe-area-inset-bottom))",
          paddingLeft: "max(1rem, env(safe-area-inset-left))",
          paddingRight: "max(1rem, env(safe-area-inset-right))",
        }}
      >
        {children}
      </div>
    </main>
  );
}
