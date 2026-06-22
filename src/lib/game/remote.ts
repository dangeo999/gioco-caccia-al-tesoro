"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { SaveData } from "./store";

type RpcState = {
  playerId?: unknown;
  nickname?: unknown;
  publicTag?: unknown;
  coins?: unknown;
  completionCode?: unknown;
  unlockedChapters?: unknown;
  completedLevels?: unknown;
  fragments?: unknown;
};

function numberArray(value: unknown): number[] {
  return Array.isArray(value)
    ? value.filter((item): item is number => Number.isInteger(item))
    : [];
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function remoteStateToSave(value: unknown): SaveData | null {
  if (!value || typeof value !== "object") return null;
  const state = value as RpcState;
  if (typeof state.playerId !== "string" || typeof state.nickname !== "string") return null;
  return {
    playerId: state.playerId,
    nickname: state.nickname,
    publicTag: typeof state.publicTag === "string" ? state.publicTag : null,
    coins: typeof state.coins === "number" ? state.coins : 0,
    completionCode:
      typeof state.completionCode === "string" ? state.completionCode : null,
    unlockedChapters: numberArray(state.unlockedChapters),
    completedLevels: numberArray(state.completedLevels),
    fragments: stringArray(state.fragments),
  };
}

async function ensureAnonymousSession(): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;
  const { data } = await supabase.auth.getSession();
  if (data.session) return true;
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return true;
}

async function rpcState(
  name: string,
  params: Record<string, unknown> = {},
): Promise<SaveData> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase non configurato");
  await ensureAnonymousSession();
  const { data, error } = await supabase.rpc(name, params);
  if (error) throw error;
  const save = remoteStateToSave(data);
  if (!save) throw new Error(`Risposta non valida da ${name}`);
  return save;
}

export async function bootstrapRemotePlayer(nickname: string): Promise<SaveData> {
  return rpcState("bootstrap_player", { p_nickname: nickname });
}

export async function fetchRemoteState(): Promise<SaveData | null> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return null;
  await ensureAnonymousSession();
  const { data, error } = await supabase.rpc("my_game_state");
  if (error) throw error;
  if (data === null) return null;
  return remoteStateToSave(data);
}

export async function completeRemoteChapter(
  chapterId: number,
  solution: string,
  fragment: string,
): Promise<SaveData> {
  return rpcState("complete_chapter", {
    p_chapter_id: chapterId,
    p_solution: solution,
    p_fragment: fragment || null,
  });
}

export async function redeemRemoteChapter(token: string): Promise<SaveData> {
  return rpcState("redeem_chapter", { p_token: token });
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  bytes.forEach((byte) => (binary += String.fromCharCode(byte)));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function createRemoteRecoveryPass(): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) throw new Error("Supabase non configurato");
  await ensureAnonymousSession();
  const token = randomToken();
  const { error } = await supabase.rpc("create_recovery_pass", { p_token: token });
  if (error) throw error;
  return token;
}

export async function claimRemoteRecoveryPass(token: string): Promise<SaveData> {
  return rpcState("claim_recovery_pass", { p_token: token });
}
