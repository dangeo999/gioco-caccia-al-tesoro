"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_UNLOCKED,
  TOTAL_CHAPTERS,
  completionCodeFor,
} from "./types";

/**
 * Stato di salvataggio del giocatore.
 *
 * Nel pilota vive nel localStorage del telefono: niente password, niente PIN.
 * `playerId` è la credenziale anonima alla base del futuro "link magico".
 * In una fase successiva questo stesso oggetto verrà sincronizzato con Supabase.
 */
export interface SaveData {
  nickname: string | null;
  playerId: string | null;
  coins: number;
  fragments: string[]; // glifi/frammenti raccolti livello dopo livello
  completedLevels: number[];
  /** Capitoli sbloccati (dai QR settimanali). */
  unlockedChapters: number[];
  /** Codice finale, generato al completamento dei 10 capitoli. */
  completionCode: string | null;
}

const STORAGE_KEY = "argil-save-v1";

const initial: SaveData = {
  nickname: null,
  playerId: null,
  coins: 0,
  fragments: [],
  completedLevels: [],
  unlockedChapters: [...DEFAULT_UNLOCKED],
  completionCode: null,
};

interface GameContextValue extends SaveData {
  /** false finché non abbiamo letto il localStorage (evita flash). */
  ready: boolean;
  register: (nickname: string) => void;
  completeLevel: (level: number, coins: number, fragment: string) => void;
  /** Sblocca un capitolo (chiamato dalla pagina /unlock/<token>). */
  unlockChapter: (id: number) => void;
  /** Ripristina un salvataggio (dal "link magico" su un altro telefono). */
  restore: (data: SaveData) => void;
  reset: () => void;
}

const GameContext = createContext<GameContextValue | null>(null);

/** Genera un ID anonimo non indovinabile per il giocatore. */
function genId(): string {
  const rnd =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return "anon-" + rnd;
}

export function GameProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<SaveData>(initial);
  const [ready, setReady] = useState(false);

  // Carica il salvataggio al primo mount (solo client).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setData({ ...initial, ...(JSON.parse(raw) as Partial<SaveData>) });
    } catch {
      /* salvataggio corrotto: si riparte puliti */
    }
    setReady(true);
  }, []);

  // Persiste ogni cambiamento.
  useEffect(() => {
    if (ready) localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data, ready]);

  const register = useCallback((nickname: string) => {
    setData((d) => ({
      ...d,
      nickname: nickname.trim().slice(0, 20),
      playerId: d.playerId ?? genId(),
    }));
  }, []);

  const completeLevel = useCallback(
    (level: number, coins: number, fragment: string) => {
      setData((d) => {
        if (d.completedLevels.includes(level)) return d; // niente doppio premio
        const completedLevels = [...d.completedLevels, level];
        // Codice finale alla conquista del 10° capitolo.
        const completionCode =
          d.completionCode ??
          (completedLevels.length >= TOTAL_CHAPTERS && d.nickname
            ? completionCodeFor(d.nickname)
            : null);
        return {
          ...d,
          coins: d.coins + coins,
          fragments: fragment ? [...d.fragments, fragment] : d.fragments,
          completedLevels,
          completionCode,
        };
      });
    },
    [],
  );

  const unlockChapter = useCallback((id: number) => {
    setData((d) =>
      d.unlockedChapters.includes(id)
        ? d
        : { ...d, unlockedChapters: [...d.unlockedChapters, id] },
    );
  }, []);

  const restore = useCallback((incoming: SaveData) => {
    setData({ ...initial, ...incoming });
  }, []);

  const reset = useCallback(() => {
    setData({ ...initial, unlockedChapters: [...DEFAULT_UNLOCKED] });
  }, []);

  return (
    <GameContext.Provider
      value={{ ...data, ready, register, completeLevel, unlockChapter, restore, reset }}
    >
      {children}
    </GameContext.Provider>
  );
}

export function useGame(): GameContextValue {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame() va usato dentro <GameProvider>");
  return ctx;
}
