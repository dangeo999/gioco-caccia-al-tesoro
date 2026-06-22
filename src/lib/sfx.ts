// Motore audio del gioco: effetti sonori SINTETIZZATI con Web Audio (nessun
// file da caricare) + vibrazione su mobile. Un unico interruttore "muto"
// (persistito) governa suoni e vibrazione.

let audioCtx: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return null;
    audioCtx = new AC();
  }
  // L'audio parte solo dopo un gesto utente: lo riprendiamo qui (i suoni sono
  // sempre innescati da tap/click, quindi è consentito).
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

const MUTE_KEY = "argil-muted";
let muted = false;
if (typeof window !== "undefined") {
  muted = localStorage.getItem(MUTE_KEY) === "1";
}

export function isMuted(): boolean {
  return muted;
}
export function setMuted(v: boolean): void {
  muted = v;
  if (typeof window !== "undefined") {
    localStorage.setItem(MUTE_KEY, v ? "1" : "0");
  }
}

/** Una nota sintetizzata con inviluppo morbido. */
function tone(
  freq: number,
  dur: number,
  type: OscillatorType = "square",
  gain = 0.05,
  when = 0,
): void {
  const c = ctx();
  if (!c || muted) return;
  const t = c.currentTime + when;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t);
  osc.stop(t + dur + 0.03);
}

function haptic(pattern: number | number[]): void {
  if (muted) return;
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

export const sfx = {
  digit: () => {
    tone(660, 0.05, "square", 0.04);
    haptic(8);
  },
  open: () => tone(520, 0.07, "sine", 0.05),
  close: () => tone(360, 0.06, "sine", 0.04),
  wrong: () => {
    tone(150, 0.22, "sawtooth", 0.06);
    haptic([20, 40, 20]);
  },
  solved: () => {
    [523, 659, 784, 1047].forEach((f, i) =>
      tone(f, 0.16, "triangle", 0.05, i * 0.08),
    );
    haptic(30);
  },
  reward: () => {
    [659, 784, 988, 1319].forEach((f, i) =>
      tone(f, 0.2, "triangle", 0.06, i * 0.1),
    );
    haptic([10, 30, 10, 40]);
  },
  unlock: () => {
    [440, 660, 880].forEach((f, i) => tone(f, 0.14, "sine", 0.05, i * 0.07));
    haptic(20);
  },
};
