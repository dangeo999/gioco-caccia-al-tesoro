import type { SaveData } from "./store";

/**
 * Codifica/decodifica il salvataggio in una stringa URL-safe per il "link magico".
 *
 * Essendo serverless, il link porta con sé l'intero stato (è uno snapshot del
 * progresso al momento della copia). Con Supabase diventerà un recupero "vivo".
 */
export function encodeSave(s: SaveData): string {
  const json = JSON.stringify(s);
  // UTF-8 safe → base64 → url-safe
  const b64 = btoa(unescape(encodeURIComponent(json)));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeSave(token: string): SaveData | null {
  try {
    const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(escape(atob(b64)));
    const obj = JSON.parse(json) as unknown;
    if (obj && typeof obj === "object" && "playerId" in obj) {
      return obj as SaveData;
    }
    return null;
  } catch {
    return null;
  }
}
