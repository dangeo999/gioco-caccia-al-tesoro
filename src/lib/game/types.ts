// ===== Tipi e dati condivisi del gioco =====

/** Metadati di un capitolo mostrati sulla mappa. */
export interface ChapterMeta {
  id: number;
  location: string;
  /** Settimana in cui esce il QR (per il gating reale). */
  unlockWeek: number;
  /** Sbloccato di default all'inizio (solo il Cap. 1 fa da ingresso/tutorial). */
  startsUnlocked: boolean;
  /** Token segreto contenuto nel QR di quel capitolo (URL /unlock/<token>). */
  token: string;
}

/** I 10 capitoli. Ordine 2–9 provvisorio (vedi PIANO-PROGETTO.md). */
export const CHAPTERS: ChapterMeta[] = [
  { id: 1, location: "Bar Port Royal", unlockWeek: 1, startsUnlocked: true, token: "k7m2qx" },
  { id: 2, location: "Torre dell'Orologio", unlockWeek: 2, startsUnlocked: false, token: "v9b4ze" },
  { id: 3, location: "Chiesa di Sant'Antonino", unlockWeek: 3, startsUnlocked: false, token: "r3n8wp" },
  { id: 4, location: "Belvedere sulla valle", unlockWeek: 4, startsUnlocked: false, token: "t6c1hd" },
  { id: 5, location: "Biblioteca Comunale", unlockWeek: 5, startsUnlocked: false, token: "y2f5js" },
  { id: 6, location: "Chiesa di Santa Maria Maggiore", unlockWeek: 6, startsUnlocked: false, token: "g8l0ak" },
  { id: 7, location: "Chiesa di San Pietro Apostolo", unlockWeek: 7, startsUnlocked: false, token: "p4x7mb" },
  { id: 8, location: "Palazzo Baronale Colonna", unlockWeek: 8, startsUnlocked: false, token: "z1d9rv" },
  { id: 9, location: "Torre del Castello", unlockWeek: 9, startsUnlocked: false, token: "n5q3to" },
  { id: 10, location: "Museo Preistorico — Cranio di Argil", unlockWeek: 10, startsUnlocked: false, token: "w0h6ec" },
];

export const TOTAL_CHAPTERS = CHAPTERS.length;

/** Capitoli sbloccati di default (Cap. 1). */
export const DEFAULT_UNLOCKED = CHAPTERS.filter((c) => c.startsUnlocked).map((c) => c.id);

/** Trova il capitolo a partire dal token del QR. */
export function chapterByToken(token: string): ChapterMeta | undefined {
  return CHAPTERS.find((c) => c.token === token);
}

// ===== Codice finale (provvisorio, lato client) =====
//
// ⚠️ Sicurezza: questo codice è deterministico dal nickname + un segreto nel
// bundle, quindi è verificabile OFFLINE dagli organizzatori ma falsificabile da
// chi legge il codice JS. Per la finale "vera" va spostato su Supabase (il
// codice emesso/registrato lato server). Per ora va benissimo per testare.
const CODE_SECRET = "argil-pofi-2026";

/** Hash veloce (cyrb53) — sufficiente per un codice di gioco, non crittografico. */
function cyrb53(str: string, seed = 0): number {
  let h1 = 0xdeadbeef ^ seed;
  let h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** Codice univoco di completamento per un dato nickname. */
export function completionCodeFor(nickname: string): string {
  const key = CODE_SECRET + ":" + nickname.trim().toLowerCase();
  const s = cyrb53(key).toString(36).toUpperCase().padStart(8, "0").slice(0, 8);
  return `ARGIL-${s.slice(0, 4)}-${s.slice(4, 8)}`;
}
