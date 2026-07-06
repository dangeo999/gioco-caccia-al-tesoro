"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

/** Spione diagnostico (solo con ?debug=1 nell'URL).
 *  Legge da three.js quanto pesa la scena in GPU e lo manda a /api/debug, così
 *  chi sviluppa può leggere i numeri dai log del server mentre si gioca da un
 *  altro dispositivo (es. iPad/iPhone sulla stessa rete). Cattura anche la
 *  perdita del contesto WebGL (il segnale del crash per esaurimento memoria).
 *  Non renderizza nulla e, senza ?debug=1, non fa assolutamente niente. */
function debugEnabled() {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("debug");
}

function deviceInfo() {
  const nav = navigator as Navigator & {
    deviceMemory?: number;
    hardwareConcurrency?: number;
  };
  return {
    ua: navigator.userAgent,
    dpr: window.devicePixelRatio,
    vw: window.innerWidth,
    vh: window.innerHeight,
    deviceMemory: nav.deviceMemory ?? null,
    cores: nav.hardwareConcurrency ?? null,
  };
}

// Etichetta breve del dispositivo, calcolata una sola volta e allegata a OGNI
// messaggio (anche i tick), così più dispositivi che giocano insieme restano
// distinguibili nei log invece di finire mescolati.
let deviceTag: string | null = null;
function getDeviceTag() {
  if (deviceTag) return deviceTag;
  const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
  let kind = "altro";
  if (/iPhone/.test(ua)) kind = "iPhone";
  else if (/iPad/.test(ua)) kind = "iPad";
  // iPadOS in Safari si maschera da Mac desktop: se è touch, è un iPad.
  else if (/Macintosh/.test(ua) && typeof navigator !== "undefined" && navigator.maxTouchPoints > 1)
    kind = "iPad";
  else if (/Macintosh|Mac OS/.test(ua)) kind = "Mac";
  else if (/Android/.test(ua)) kind = "Android";
  else if (/Windows/.test(ua)) kind = "Windows";
  const id = Math.random().toString(36).slice(2, 6);
  deviceTag = `${kind}-${id}`;
  return deviceTag;
}

function send(payload: Record<string, unknown>) {
  try {
    void fetch("/api/debug", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ t: Date.now(), dev: getDeviceTag(), ...payload }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* mai far crashare il gioco per la telemetria */
  }
}

export default function DebugTelemetry({ scene }: { scene: string }) {
  const gl = useThree((s) => s.gl);
  const enabled = useRef(debugEnabled());
  const frames = useRef(0);
  const lastReport = useRef(0);
  const lastFpsMark = useRef(0);
  const peak = useRef({ textures: 0, geometries: 0, calls: 0, triangles: 0 });

  function snapshot() {
    const info = gl.info;
    const textures = info.memory.textures;
    const geometries = info.memory.geometries;
    const calls = info.render.calls;
    const triangles = info.render.triangles;
    peak.current.textures = Math.max(peak.current.textures, textures);
    peak.current.geometries = Math.max(peak.current.geometries, geometries);
    peak.current.calls = Math.max(peak.current.calls, calls);
    peak.current.triangles = Math.max(peak.current.triangles, triangles);
    return {
      textures,
      geometries,
      programs: info.programs?.length ?? 0,
      calls,
      triangles,
      peakTextures: peak.current.textures,
      peakGeometries: peak.current.geometries,
      peakCalls: peak.current.calls,
      peakTriangles: peak.current.triangles,
    };
  }

  useEffect(() => {
    if (!enabled.current) return;
    const canvas = gl.domElement;
    const onLost = (e: Event) => {
      // preventDefault permette il tentativo di ripristino e ci lascia
      // registrare l'evento prima che la scheda muoia del tutto.
      e.preventDefault();
      send({ event: "WEBGL_CONTEXT_LOST", scene, ...snapshot() });
    };
    const onRestored = () => send({ event: "webglcontextrestored", scene });
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    send({ event: "enter", scene, ...deviceInfo(), ...snapshot() });

    const onHide = () => send({ event: "pagehide", scene, ...snapshot() });
    window.addEventListener("pagehide", onHide);

    return () => {
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      window.removeEventListener("pagehide", onHide);
      send({ event: "leave", scene, ...snapshot() });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene]);

  useFrame(() => {
    if (!enabled.current) return;
    frames.current++;
    const now = performance.now();
    if (lastFpsMark.current === 0) lastFpsMark.current = now;
    if (now - lastReport.current >= 2000) {
      const dt = now - lastFpsMark.current || 1;
      const fps = Math.round((frames.current * 1000) / dt);
      frames.current = 0;
      lastFpsMark.current = now;
      lastReport.current = now;
      send({ event: "tick", scene, fps, ...snapshot() });
    }
  });

  return null;
}
