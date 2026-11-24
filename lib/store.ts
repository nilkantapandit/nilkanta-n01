"use client";

import { create } from "zustand";
import type * as THREE from "three";
import type { Line } from "@/lib/terminal/registry";

export type OperatingMode = "field" | "secure";
/** One line of a physical-screen notification (rendered terminal-style on the N-01 display). */
export type NoticeLine = { kind: "cmd" | "ok" | "info" | "prompt"; text: string };
export type Notice = { id: number; kind: "mode" | "tx"; lines: NoticeLine[]; at: number; ms: number };
/** The terminal session on the physical screen (shared, survives app switches and notifications). */
export type TerminalSession = { lines: Line[]; input: string; hist: string[]; hi: number };

export const CHANNEL = "CH_03";
let noticeSeq = 0;

export type Theme = "dark" | "light";
const THEME_KEY = "n01-theme";
function initialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  try {
    const saved = window.localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

const DECK_KEY = "n01-deck";
function initialDeck(): Theme | "auto" {
  if (typeof window === "undefined") return "auto";
  try {
    const saved = window.localStorage.getItem(DECK_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  return "auto";
}
/** Effective deck colour: white Flipper-style shell + orange LCD ("light") or charcoal + amber CRT ("dark"). */
export const deckOf = (s: { theme: Theme; deckPref: Theme | "auto" }): Theme => (s.deckPref === "auto" ? s.theme : s.deckPref);

export type Overlay = "none" | "hire" | "matrix" | "arcade" | "secret" | "diagnostics";

type DeviceState = {
  /** Root of the loaded GLB scene (set once by N01Model). */
  modelRoot: THREE.Object3D | null;
  setModelRoot: (o: THREE.Object3D | null) => void;

  /* ---------- technical callouts ---------- */
  calloutsVisible: boolean;
  hoveredHotspot: string | null;
  pinnedHotspot: string | null;
  setCalloutsVisible: (v: boolean) => void;
  setHoveredHotspot: (id: string | null) => void;
  togglePinnedHotspot: (id: string) => void;
  clearPinnedHotspot: () => void;

  /* ---------- physical screen (mirrored from lib/screen/screenOS for the HTML layer) ---------- */
  screenPhase: "off" | "booting" | "online" | "shutdown";
  screenApp: string;
  /** Inspect mode: camera moved in front of the screen and locked while the visitor operates it. */
  screenFocus: boolean;
  setScreenFocus: (v: boolean) => void;
  /** Immersive mode (Fullscreen key): browser fullscreen + HUD hidden. */
  immersive: boolean;
  setImmersive: (v: boolean) => void;

  /* ---------- device power / modes ---------- */
  powered: boolean;
  powerTransition: "idle" | "booting" | "shutting-down";
  setPowered: (v: boolean) => void;
  setPowerTransition: (t: DeviceState["powerTransition"]) => void;
  mode: OperatingMode;
  setMode: (m: OperatingMode) => void;
  toggleMode: () => void;
  /** Simulated push-to-talk (FIELD COMMS only). Nothing is ever transmitted. */
  transmitting: boolean;
  txSince: number | null;
  setTransmitting: (v: boolean) => void;

  /* ---------- simulation state shared by the status panel and the physical screen ---------- */
  sim: { signal: number; cipherBlocks: number; secureSince: number | null };
  stepSim: () => void;

  /* ---------- notifications shown on the physical screen (non-destructive layer) ---------- */
  notice: Notice | null;
  pushNotice: (kind: Notice["kind"], lines: NoticeLine[], ms?: number) => void;
  dismissNotice: () => void;

  /* ---------- terminal session on the physical screen ---------- */
  terminal: TerminalSession;
  updateTerminal: (patch: Partial<TerminalSession> | ((t: TerminalSession) => Partial<TerminalSession>)) => void;

  /* ---------- overlays / easter eggs ---------- */
  overlay: Overlay;
  openOverlay: (o: Overlay) => void;
  closeOverlay: () => void;
  toast: { id: number; text: string } | null;
  showToast: (text: string) => void;

  /* ---------- hint bar ---------- */
  hoverLabel: string | null;
  setHoverLabel: (t: string | null) => void;

  /* ---------- appearance ---------- */
  /** Light = Flipper-style (light shell, orange LCD); dark = amber CRT. Persisted per browser. */
  theme: Theme;
  setTheme: (t: Theme) => void;
  /** Deck (device shell + screen) colour, independent of the background: "auto" follows `theme`. */
  deckPref: Theme | "auto";
  setDeck: (t: Theme) => void;

  /* ---------- audio ---------- */
  soundOn: boolean;
  setSoundOn: (v: boolean) => void;

  /** Test/debug switch to hold the device still. */
  freezeIdle: boolean;
  setFreezeIdle: (v: boolean) => void;

  /** Bumping this asks the camera rig to glide back to the hero view. */
  resetSignal: number;
  requestReset: () => void;
  /** Bumping this asks the camera rig to turn the view square-on to the device screen. */
  /** Bumped by the `shutdown` / `poweroff` terminal commands: the screen OS powers the N-01 down. */
  powerOffSignal: number;
  powerOffCmd: string | null;
  requestPowerOff: (cmd?: string) => void;
  faceScreenSignal: number;
  requestFaceScreen: () => void;
};

export const useDevice = create<DeviceState>((set, get) => ({
  modelRoot: null,
  setModelRoot: (o) => set({ modelRoot: o }),

  calloutsVisible: true,
  hoveredHotspot: null,
  pinnedHotspot: null,
  setCalloutsVisible: (v) => set({ calloutsVisible: v, pinnedHotspot: v ? get().pinnedHotspot : null }),
  setHoveredHotspot: (id) => set({ hoveredHotspot: id }),
  togglePinnedHotspot: (id) => set({ pinnedHotspot: get().pinnedHotspot === id ? null : id }),
  clearPinnedHotspot: () => set({ pinnedHotspot: null }),

  screenPhase: "off",
  screenApp: "menu",
  screenFocus: false,
  setScreenFocus: (v) => set({ screenFocus: v, pinnedHotspot: v ? null : get().pinnedHotspot }),
  immersive: false,
  setImmersive: (v) => set({ immersive: v }),

  powered: false,
  powerTransition: "idle",
  setPowered: (v) => set({ powered: v }),
  setPowerTransition: (t) => set({ powerTransition: t }),
  mode: "field",
  setMode: (m) => {
    const st = get();
    if (st.mode === m) return;
    if (st.transmitting) st.setTransmitting(false); // leaving FIELD COMMS ends a simulated transmission
    set({ mode: m, sim: { ...get().sim, secureSince: m === "secure" ? Date.now() : null, cipherBlocks: 0 } });
    get().pushNotice("mode", m === "secure"
      ? [
          { kind: "cmd", text: "mode --set secure" },
          { kind: "ok", text: "Switching operating mode..." },
          { kind: "ok", text: "Secure interface initialized." },
          { kind: "ok", text: "Session status updated." },
          { kind: "prompt", text: "" },
        ]
      : [
          { kind: "cmd", text: "mode --set field-comms" },
          { kind: "ok", text: "Communication service initialized." },
          { kind: "ok", text: `Channel ${CHANNEL} selected.` },
          { kind: "ok", text: "Signal monitor active." },
          { kind: "prompt", text: "" },
        ], 2800);
  },
  toggleMode: () => get().setMode(get().mode === "field" ? "secure" : "field"),
  transmitting: false,
  txSince: null,
  setTransmitting: (v) => {
    const st = get();
    if (v === st.transmitting) return;
    if (v && st.mode !== "field") return;
    if (v) {
      set({ transmitting: true, txSince: Date.now() });
      st.pushNotice("tx", [
        { kind: "cmd", text: "radio --ptt" },
        { kind: "ok", text: `TX ACTIVE · ${CHANNEL} · simulated` },
        { kind: "info", text: "release to end transmission" },
      ], 2000);
    } else {
      const secs = st.txSince ? Math.max(0, Math.round((Date.now() - st.txSince) / 1000)) : 0;
      set({ transmitting: false, txSince: null });
      st.pushNotice("tx", [
        { kind: "cmd", text: "radio --ptt release" },
        { kind: "ok", text: `Transmission ended · ${String(secs).padStart(2, "0")}s · simulated` },
        { kind: "ok", text: "TX → STANDBY" },
        { kind: "prompt", text: "" },
      ], 2000);
    }
  },

  sim: { signal: 82, cipherBlocks: 0, secureSince: null },
  stepSim: () => {
    const { sim, mode } = get();
    const drift = Math.round((Math.random() - 0.5) * 6);
    set({ sim: { ...sim, signal: Math.max(64, Math.min(96, sim.signal + drift)), cipherBlocks: mode === "secure" ? sim.cipherBlocks + 24 + Math.floor(Math.random() * 18) : sim.cipherBlocks } });
  },

  notice: null,
  pushNotice: (kind, lines, ms = 2600) => set({ notice: { id: ++noticeSeq, kind, lines, at: performance.now(), ms } }),
  dismissNotice: () => set({ notice: null }),

  terminal: { lines: [], input: "", hist: [], hi: -1 },
  updateTerminal: (patch) => set({ terminal: { ...get().terminal, ...(typeof patch === "function" ? patch(get().terminal) : patch) } }),

  overlay: "none",
  openOverlay: (o) => set({ overlay: o }),
  closeOverlay: () => set({ overlay: "none" }),
  toast: null,
  showToast: (text) => set({ toast: { id: Date.now(), text } }),

  hoverLabel: null,
  setHoverLabel: (t) => set({ hoverLabel: t }),

  theme: initialTheme(),
  setTheme: (t) => {
    try { window.localStorage.setItem(THEME_KEY, t); } catch {}
    if (typeof document !== "undefined") document.documentElement.dataset.theme = t;
    set({ theme: t });
  },

  deckPref: initialDeck(),
  setDeck: (t) => {
    try { window.localStorage.setItem(DECK_KEY, t); } catch {}
    set({ deckPref: t });
  },

  soundOn: false,
  setSoundOn: (v) => set({ soundOn: v }),

  freezeIdle: false,
  setFreezeIdle: (v) => set({ freezeIdle: v }),

  resetSignal: 0,
  requestReset: () => set({ resetSignal: get().resetSignal + 1 }),
  powerOffSignal: 0,
  powerOffCmd: null,
  requestPowerOff: (cmd) => set({ powerOffSignal: get().powerOffSignal + 1, powerOffCmd: cmd ?? null }),
  faceScreenSignal: 0,
  requestFaceScreen: () => set({ faceScreenSignal: get().faceScreenSignal + 1 }),
}));

// Development-only handle for automated browser tests (stripped from production builds' behaviour).
if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") {
  (window as unknown as { __n01?: typeof useDevice }).__n01 = useDevice;
}
