"use client";

import { BAR_WORLD_ASSETS } from "./worldAssets";

type AssetKey = "exterior" | "interior";
type FetchPriority = "high" | "low" | "auto";

const MODEL_URLS: Record<AssetKey, string | undefined> = {
  exterior: BAR_WORLD_ASSETS.exterior.visual?.url,
  interior: BAR_WORLD_ASSETS.interior.visual?.url,
};

const COMPONENT_PRELOADERS: Record<AssetKey, () => Promise<unknown>> = {
  exterior: () => import("./ExteriorBar"),
  interior: () => import("./FirstPersonBar"),
};

const componentPreloads = new Map<AssetKey, Promise<unknown>>();
const modelPreloads = new Map<string, Promise<void>>();
let dreiPreload: Promise<typeof import("@react-three/drei")> | null = null;
let fullPreloadStarted = false;
let interiorPreloadStarted = false;

function getDrei() {
  dreiPreload ??= import("@react-three/drei");
  return dreiPreload;
}

function addModelHint(url: string, priority: FetchPriority) {
  if (typeof document === "undefined") return;
  const existing = document.head.querySelector<HTMLLinkElement>(
    `link[rel="preload"][href="${url}"]`,
  );
  if (existing) {
    existing.setAttribute("fetchpriority", priority);
    return;
  }

  const link = document.createElement("link");
  link.rel = "preload";
  link.as = "fetch";
  link.href = url;
  link.crossOrigin = "anonymous";
  link.setAttribute("fetchpriority", priority);
  document.head.appendChild(link);
}

function preloadComponent(key: AssetKey) {
  if (!componentPreloads.has(key)) {
    componentPreloads.set(key, COMPONENT_PRELOADERS[key]().catch(() => undefined));
  }
  return componentPreloads.get(key)!;
}

function preloadModel(key: AssetKey, priority: FetchPriority) {
  const url = MODEL_URLS[key];
  if (!url) return Promise.resolve();

  addModelHint(url, priority);
  if (!modelPreloads.has(url)) {
    modelPreloads.set(
      url,
      getDrei()
        .then(({ useGLTF }) => {
          useGLTF.preload(url);
        })
        .catch(() => undefined),
    );
  }
  return modelPreloads.get(url)!;
}

function scheduleSoon(task: () => void, timeout = 700) {
  if (typeof window === "undefined") return;

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(task, { timeout });
  } else {
    window.setTimeout(task, timeout);
  }
}

export function preloadExteriorBar3d() {
  void preloadComponent("exterior");
  void preloadModel("exterior", "high");
}

export function preloadInteriorBar3d() {
  if (interiorPreloadStarted) return;
  interiorPreloadStarted = true;
  void preloadComponent("interior");
  void preloadModel("interior", "low");
}

export function boostInteriorBar3dPreload() {
  const url = MODEL_URLS.interior;
  if (url) addModelHint(url, "high");
  preloadInteriorBar3d();
}

export function startBar3dPreload() {
  if (fullPreloadStarted) return;
  fullPreloadStarted = true;

  // L'esterno serve per primo, quindi parte subito. Del MODELLO interno NON
  // facciamo il preload qui: su mobile terrebbe due scansioni pesanti in
  // memoria contemporaneamente (strada + bar) e contribuisce ai crash su
  // iPhone. Scaldiamo solo il chunk JS della scena interna (leggero); il
  // modello vero si carica quando si entra davvero nel bar (vedi enterBar).
  preloadExteriorBar3d();
  scheduleSoon(() => {
    void preloadComponent("interior");
  });
}
