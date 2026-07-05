"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useGame } from "@/lib/game/store";
import { sfx } from "@/lib/sfx";
import Screen from "@/components/ui/Screen";
import Modal from "@/components/ui/Modal";
import Typewriter from "@/components/ui/Typewriter";
import MuteButton from "@/components/ui/MuteButton";
import CodeLock from "@/components/CodeLock";
import { NEON_WORD, NEON_OFF } from "./bar3d/neonConfig";
import { BAR_WORLD_ASSETS } from "./bar3d/worldAssets";

// Scene 3D (Three.js): solo lato client per evitare problemi di SSR
const loading3D = () => (
  <div className="flex-1 flex items-center justify-center text-[var(--muted)]">
    caricamento 3D…
  </div>
);
const FirstPersonBar = dynamic(() => import("./bar3d/FirstPersonBar"), {
  ssr: false,
  loading: loading3D,
});
const ExteriorBar = dynamic(() => import("./bar3d/ExteriorBar"), {
  ssr: false,
  loading: loading3D,
});

// ===== Configurazione enigma (Livello 1) =====
// L'insegna (NEON_WORD / NEON_OFF) vive in bar3d/neonConfig.ts: la condivide con
// l'insegna 3D di FirstPersonBar, così restano sempre allineate.
const BOTTLE_COUNT = 7;
const BOTTLE_FLIPPED = 3; // posizione della bottiglia girata
const COCKTAILS = [
  { name: "Zombie", price: "7,5", circled: false },
  { name: "Vesper", price: "5,2", circled: false },
  { name: "Negroni", price: "4,8", circled: true }, // ultima cifra: 8
  { name: "Margarita", price: "6,1", circled: false },
];

const SOLUTION = "638"; // insegna(6) · bottiglie(3) · lavagna(8)
const REWARD_COINS = 1; // 1 coin a livello -> 10 coin totali a chi finisce tutto
const FRAGMENT = "Λ"; // primo frammento del codice madre

const INTRO =
  "Il jukebox si accende da solo. Lo schermo sfarfalla...\n\n>> Qui Anonymous.\n>> Ti osserviamo da settimane, recluta. Noti i dettagli che gli altri ignorano?\n>> Pofi nasconde un segreto piu' antico del paese. Stanotte si comincia, qui.\n>> Sotto il bancone c'e' un cassetto. Tre cifre. Dentro, la tua maschera.\n>> Le cifre sono in bella vista: PRIMA la LUCE, poi il VETRO, infine il GUSTO.\n>> Dimostraci che sai guardare.";

const OUTRO =
  ">> ...la maschera e' tua.\n>> Benvenuto nel collettivo, recluta.\n>> Sai vedere cio' che gli altri non notano: ci servivi proprio tu.\n>> Questo e' solo il primo frammento. Il sentiero sale... fino al Museo di Argil.\n>> Resta all'erta: ogni settimana, un nuovo QR. — A";

type Hotspot = "neon" | "bottles" | "chalk" | "jukebox" | "drawer";

// Note che finiscono nel "Taccuino" quando si esamina un oggetto: così il
// giocatore non deve memorizzare la scena. Registriamo l'OSSERVAZIONE (cosa
// guardare), non la cifra già risolta: contare e leggere tocca a lui.
const NOTES: Record<Hotspot, string> = {
  neon: "Insegna PORTROYAL: alcune lettere sono fulminate. Conta quelle ancora ACCESE.",
  bottles: "Scaffale: una bottiglia è girata al contrario. Leggi il suo NUMERO di posizione.",
  chalk: "Lavagna: un prezzo è cerchiato. Ti serve solo la sua ULTIMA cifra.",
  jukebox: "Ordine del codice → LUCE (insegna) · VETRO (bottiglie) · GUSTO (lavagna).",
  drawer: "Cassetto sotto il bancone: serratura a 3 cifre.",
};

// Ordine nel Taccuino e quali indizi forniscono una cifra del codice.
const CLUE_ORDER: { id: Hotspot; title: string }[] = [
  { id: "neon", title: "Insegna al neon" },
  { id: "bottles", title: "Scaffale bottiglie" },
  { id: "chalk", title: "Lavagna cocktail" },
  { id: "jukebox", title: "Jukebox (ordine)" },
  { id: "drawer", title: "Cassetto" },
];
const DIGIT_CLUES: Hotspot[] = ["neon", "bottles", "chalk"];

export default function BarPortRoyal() {
  const { completeLevel } = useGame();
  const [phase, setPhase] = useState<
    "intro" | "exterior" | "explore" | "win"
  >("intro");
  const [open, setOpen] = useState<Hotspot | null>(null);
  const [notes, setNotes] = useState<Partial<Record<Hotspot, string>>>({});
  const [showNotes, setShowNotes] = useState(false);

  // Precarica il mondo 3D esterno mentre scorre l'intro (~9s): chunk JS della scena
  // + GLB della strada (pesante) + decodifica Draco. È lavoro impegnativo, quindi lo
  // schedulo nei MOMENTI DI INATTIVITÀ (requestIdleCallback): così l'animazione
  // dell'intro resta fluida e il caricamento riempie le pause senza farla scattare.
  useEffect(() => {
    let idleId: number | undefined;
    let timeoutId: number | undefined;
    const preload = () => {
      void import("./bar3d/ExteriorBar");
      const url = BAR_WORLD_ASSETS.exterior.visual?.url;
      if (url) {
        import("@react-three/drei")
          .then((m) => m.useGLTF.preload(url))
          .catch(() => {});
      }
    };
    if (typeof window.requestIdleCallback === "function") {
      idleId = window.requestIdleCallback(preload, { timeout: 3000 });
    } else {
      timeoutId = window.setTimeout(preload, 1500);
    }
    return () => {
      if (idleId !== undefined && typeof window.cancelIdleCallback === "function") {
        window.cancelIdleCallback(idleId);
      }
      if (timeoutId !== undefined) clearTimeout(timeoutId);
    };
  }, []);

  // Esame di un oggetto: suono, annotazione nel taccuino, apertura modale.
  function examine(id: Hotspot) {
    sfx.open();
    setNotes((n) => (n[id] ? n : { ...n, [id]: NOTES[id] }));
    setOpen(id);
  }
  function closeExamine() {
    sfx.close();
    setOpen(null);
  }

  function handleSolved() {
    setOpen(null);
    sfx.reward();
    completeLevel(1, REWARD_COINS, FRAGMENT, SOLUTION);
    setPhase("win");
  }

  const digitsFound = DIGIT_CLUES.filter((id) => notes[id]).length;
  const allDigitsSeen = digitsFound === DIGIT_CLUES.length;

  // ---- INTRO ----
  if (phase === "intro") {
    return (
      <Screen>
        <div className="flex-1 flex flex-col fade-in">
          <div className="flex justify-end">
            <MuteButton className="text-2xl px-1" />
          </div>
          <div className="flex-1 flex flex-col justify-center gap-5">
            <h1 className="font-pixel text-xs glow-neon text-center leading-relaxed">
              CAP. 1 — BAR PORT ROYAL
            </h1>
            <div className="pixel-border overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/levels/bar/facade-night.png"
                alt="Bar Port Royal di notte"
                className="w-full h-auto block"
              />
            </div>
            <div className="pixel-border bg-[var(--panel)] p-4 min-h-[180px]">
              <p className="text-[var(--term)] text-xl whitespace-pre-line">
                <Typewriter text={INTRO} speed={20} />
              </p>
            </div>
            <button
              onClick={() => setPhase("exterior")}
              className="font-pixel text-[11px] py-3 pixel-border bg-[var(--panel-2)] text-[var(--neon)] active:translate-y-[2px]"
            >
              VAI AL BAR
            </button>
          </div>
        </div>
      </Screen>
    );
  }

  // ---- VITTORIA ----
  if (phase === "win") {
    return (
      <Screen>
        <div className="flex-1 flex flex-col justify-center items-center gap-6 text-center fade-in">
          <div className="text-7xl pop-in">🎭</div>
          <h1 className="font-pixel text-sm glow-magenta leading-relaxed">
            RECLUTATO
          </h1>
          <div className="pixel-border bg-[var(--panel)] p-4 w-full">
            <p className="text-[var(--term)] text-xl whitespace-pre-line text-left">
              <Typewriter text={OUTRO} speed={20} />
            </p>
          </div>
          <div className="rise-in flex flex-col items-center gap-2">
            <div className="flex gap-6 text-2xl">
              <span className="text-[var(--amber)]">◆ +{REWARD_COINS}</span>
              <span className="glow-neon">Frammento {FRAGMENT}</span>
            </div>
            <p className="text-base text-[var(--muted)]">
              Frammento aggiunto al codice di Argil.
            </p>
          </div>
          <button
            onClick={() => setPhase("intro")}
            className="font-pixel text-[11px] py-3 px-5 pixel-border bg-[var(--panel-2)] text-[var(--neon)] active:translate-y-[2px]"
          >
            TORNA ALL&apos;INIZIO
          </button>
        </div>
      </Screen>
    );
  }

  // ---- ESTERNO (3D prima persona, parti fuori dal bar) ----
  if (phase === "exterior") {
    return (
      <Screen>
        <div className="flex-1 flex flex-col fade-in">
          <ExteriorBar
            onEnter={() => setPhase("explore")}
            onExit={() => setPhase("intro")}
          />
        </div>
      </Screen>
    );
  }

  // ---- INTERNO (3D prima persona) ----
  return (
    <Screen>
      <div className="flex-1 flex flex-col fade-in">
        <FirstPersonBar
          onInteract={examine}
          onExit={() => setPhase("exterior")}
        />
      </div>

      {/* Taccuino degli indizi (così non bisogna memorizzare nulla) */}
      <button
        onClick={() => setShowNotes(true)}
        className="fixed z-30 font-pixel text-[10px] px-3 py-3 pixel-border bg-[var(--panel-2)]/90 text-[var(--amber)] active:translate-y-[2px]"
        style={{
          bottom: "max(0.75rem, env(safe-area-inset-bottom))",
          right: "max(0.75rem, env(safe-area-inset-right))",
        }}
      >
        📓 {digitsFound}/3
      </button>

      {showNotes && (
        <Modal title="TACCUINO" onClose={() => setShowNotes(false)}>
          <p className="text-[var(--muted)] text-base mb-3">
            Cifre trovate:{" "}
            <b className="text-[var(--amber)]">{digitsFound}/3</b>. Avvicinati
            agli oggetti del bar e tocca <b>USA</b> per annotare cosa osservare.
          </p>
          <ul className="space-y-2">
            {CLUE_ORDER.map(({ id, title }) => {
              const seen = notes[id];
              return (
                <li
                  key={id}
                  className={`pixel-border p-2 ${seen ? "bg-[var(--panel)]" : "opacity-50"}`}
                >
                  <div className="flex items-center gap-2 text-[var(--term)]">
                    <span className={seen ? "text-[var(--neon)]" : "text-[var(--muted)]"}>
                      {seen ? "✓" : "○"}
                    </span>
                    <b>{title}</b>
                  </div>
                  <p className="text-base text-[var(--muted)] mt-1">
                    {seen ?? "Non ancora esaminato."}
                  </p>
                </li>
              );
            })}
          </ul>
        </Modal>
      )}

      {/* Modali di esame */}
      {open === "neon" && (
        <Modal title="INSEGNA AL NEON" onClose={closeExamine}>
          <p className="mb-4">Alcune lettere sono fulminate.</p>
          <div className="flex justify-center gap-1 text-3xl font-pixel mb-4 flex-wrap">
            {NEON_WORD.split("").map((ch, i) => (
              <span key={i} className={NEON_OFF.has(i) ? "neon-off" : "neon-on"}>
                {ch}
              </span>
            ))}
          </div>
          <p className="text-[var(--muted)] text-lg">
            Quante lettere sono ancora <span className="glow-neon">ACCESE</span>?
            <br />→ è la cifra della <b>LUCE</b>.
          </p>
        </Modal>
      )}

      {open === "bottles" && (
        <Modal title="SCAFFALE BOTTIGLIE" onClose={closeExamine}>
          <p className="mb-4">Una bottiglia è girata al contrario.</p>
          <div className="flex justify-center gap-2 mb-4">
            {Array.from({ length: BOTTLE_COUNT }).map((_, i) => {
              const n = i + 1;
              const flipped = n === BOTTLE_FLIPPED;
              return (
                <div key={n} className="flex flex-col items-center gap-1">
                  <span
                    className={`text-3xl ${flipped ? "rotate-180 inline-block" : ""}`}
                    style={{ color: flipped ? "var(--amber)" : undefined }}
                  >
                    🍾
                  </span>
                  <span className="text-sm text-[var(--muted)]">{n}</span>
                </div>
              );
            })}
          </div>
          <p className="text-[var(--muted)] text-lg">
            Che numero ha la bottiglia girata?
            <br />→ è la cifra del <b>VETRO</b>.
          </p>
        </Modal>
      )}

      {open === "chalk" && (
        <Modal title="LAVAGNA COCKTAIL" onClose={closeExamine}>
          <ul className="mb-4 space-y-1">
            {COCKTAILS.map((c) => (
              <li
                key={c.name}
                className={`flex justify-between text-2xl px-2 py-1 ${
                  c.circled
                    ? "outline-2 outline-dashed outline-[var(--magenta)] rounded text-[var(--magenta)]"
                    : ""
                }`}
              >
                <span>{c.name}</span>
                <span>€ {c.price}</span>
              </li>
            ))}
          </ul>
          <p className="text-[var(--muted)] text-lg">
            Guarda l&apos;ultima cifra del prezzo <b>cerchiato</b>.
            <br />→ è la cifra del <b>GUSTO</b>.
          </p>
        </Modal>
      )}

      {open === "jukebox" && (
        <Modal title="JUKEBOX" onClose={closeExamine}>
          <p className="text-[var(--term)]">
            Sullo schermo lampeggia:
            <br />
            <br />
            &gt;&gt; Prima la <b className="glow-neon">LUCE</b> (insegna),
            <br />
            &gt;&gt; poi il <b className="glow-neon">VETRO</b> (bottiglie),
            <br />
            &gt;&gt; infine il <b className="glow-neon">GUSTO</b> (lavagna).
          </p>
        </Modal>
      )}

      {open === "drawer" && (
        <Modal title="CASSETTO — TRE CIFRE" onClose={closeExamine}>
          {!allDigitsSeen && (
            <p className="text-[var(--amber)] text-base mb-3">
              ⚠ Ti manca qualcosa: esamina insegna, bottiglie e lavagna prima di
              comporre il codice ({digitsFound}/3).
            </p>
          )}
          <CodeLock
            solution={SOLUTION}
            slotLabels={["Insegna", "Bottiglie", "Lavagna"]}
            hints={[
              "Apri il 📓 Taccuino: le tre cifre vengono dagli indizi che hai esaminato.",
              "Ordine giusto → LUCE (insegna) · VETRO (bottiglie) · GUSTO (lavagna).",
              "Conta: lettere accese dell'insegna · numero della bottiglia girata · ultima cifra del prezzo cerchiato.",
            ]}
            onSolved={handleSolved}
          />
        </Modal>
      )}
    </Screen>
  );
}
