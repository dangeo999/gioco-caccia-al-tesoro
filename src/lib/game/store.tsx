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
import { isSupabaseConfigured } from "@/lib/supabase/client";
import {
  bootstrapRemotePlayer,
  claimRemoteRecoveryPass,
  completeRemoteChapter,
  createRemoteRecoveryPass,
  fetchRemoteState,
  redeemRemoteChapter,
} from "./remote";

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
  /** Suffisso breve assegnato dal server: distingue nickname uguali. */
  publicTag: string | null;
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
  publicTag: null,
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
  backendStatus: "local" | "connecting" | "online" | "error";
  completeLevel: (
    level: number,
    coins: number,
    fragment: string,
    solution?: string,
  ) => void;
  /** Sblocca un capitolo (chiamato dalla pagina /unlock/<token>). */
  unlockChapter: (id: number) => void;
  redeemChapter: (token: string, fallbackId?: number) => Promise<boolean>;
  createRecoveryPass: () => Promise<string>;
  claimRecoveryPass: (token: string) => Promise<boolean>;
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
  const [backendStatus, setBackendStatus] = useState<
    "local" | "connecting" | "online" | "error"
  >("local");

  // Carica il salvataggio al primo mount (solo client).
  useEffect(() => {
    let loaded: SaveData = { ...initial, unlockedChapters: [...DEFAULT_UNLOCKED] };
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) loaded = { ...initial, ...(JSON.parse(raw) as Partial<SaveData>) };
    } catch {
      /* salvataggio corrotto: si riparte puliti */
    }
    setData(loaded);
    setReady(true);

    if (isSupabaseConfigured()) {
      setBackendStatus("connecting");
      void (async () => {
        try {
          const remote = await fetchRemoteState();
          const synced = remote ?? (loaded.nickname
            ? await bootstrapRemotePlayer(loaded.nickname)
            : null);
          if (synced) setData(synced);
          setBackendStatus("online");
        } catch {
          // Il gioco resta utilizzabile offline finché Auth/schema non sono attivi.
          setBackendStatus("error");
        }
      })();
    }
  }, []);

  // Persiste ogni cambiamento.
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {
        /* Safari privato/storage pieno: il backend resta la fonte primaria. */
      }
    }
  }, [data, ready]);

  const register = useCallback((nickname: string) => {
    const clean = nickname.trim().slice(0, 20);
    setData((d) => ({
      ...d,
      nickname: clean,
      playerId: d.playerId ?? genId(),
    }));
    if (isSupabaseConfigured()) {
      setBackendStatus("connecting");
      void bootstrapRemotePlayer(clean)
        .then((remote) => {
          setData(remote);
          setBackendStatus("online");
        })
        .catch(() => setBackendStatus("error"));
    }
  }, []);

  const completeLevel = useCallback(
    (level: number, coins: number, fragment: string, solution?: string) => {
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
      if (solution && isSupabaseConfigured()) {
        void completeRemoteChapter(level, solution, fragment)
          .then((remote) => {
            setData(remote);
            setBackendStatus("online");
          })
          .catch(() => setBackendStatus("error"));
      }
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

  const redeemChapter = useCallback(async (token: string, fallbackId?: number) => {
    if (isSupabaseConfigured()) {
      try {
        const remote = await redeemRemoteChapter(token);
        setData(remote);
        setBackendStatus("online");
        return true;
      } catch {
        setBackendStatus("error");
      }
    }
    if (!isSupabaseConfigured() && fallbackId) {
      unlockChapter(fallbackId);
      return true;
    }
    return false;
  }, [unlockChapter]);

  const createRecoveryPass = useCallback(async () => {
    if (!isSupabaseConfigured()) throw new Error("Backend non ancora attivo");
    return createRemoteRecoveryPass();
  }, []);

  const claimRecoveryPass = useCallback(async (token: string) => {
    if (!isSupabaseConfigured()) return false;
    try {
      const remote = await claimRemoteRecoveryPass(token);
      setData(remote);
      setBackendStatus("online");
      return true;
    } catch {
      setBackendStatus("error");
      return false;
    }
  }, []);

  const restore = useCallback((incoming: SaveData) => {
    setData({ ...initial, ...incoming });
  }, []);

  const reset = useCallback(() => {
    setData({ ...initial, unlockedChapters: [...DEFAULT_UNLOCKED] });
  }, []);

  return (
    <GameContext.Provider
      value={{
        ...data,
        ready,
        backendStatus,
        register,
        completeLevel,
        unlockChapter,
        redeemChapter,
        createRecoveryPass,
        claimRecoveryPass,
        restore,
        reset,
      }}
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
