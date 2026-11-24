"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type * as THREE from "three";
import gsap from "gsap";
import { CHANNEL, useDevice } from "@/lib/store";
import { setModeTarget, setTransmitGlow, updateDeviceMaterials } from "@/lib/deviceMaterials";
import { deviceAudio } from "@/lib/deviceAudio";

/* ================================================================ in-canvas part */
const SWITCH_TRAVEL = 0.0015; // ±1.5 mm inside the 16 mm slot (13 mm cap)

/** Animates the physical mode switch and drives the runtime LED / screen changes. */
export function ModeEffects() {
  const root = useDevice((s) => s.modelRoot);
  const mode = useDevice((s) => s.mode);
  const transmitting = useDevice((s) => s.transmitting);
  const sw = useRef<{ node: THREE.Object3D; baseX: number } | null>(null);

  useEffect(() => {
    if (!root) return;
    const node = root.getObjectByName("N01_Power_Mode_Switch");
    if (!node) return;
    sw.current = { node, baseX: node.position.x };
    node.position.x = sw.current.baseX - SWITCH_TRAVEL; // FIELD position at start
  }, [root]);

  useEffect(() => {
    setModeTarget(mode === "secure");
    const s = sw.current;
    if (!s) return;
    gsap.to(s.node.position, { x: s.baseX + (mode === "secure" ? SWITCH_TRAVEL : -SWITCH_TRAVEL), duration: 0.28, ease: "back.out(2)" });
  }, [mode]);

  useEffect(() => { setTransmitGlow(transmitting); }, [transmitting]);

  useFrame((state, dt) => updateDeviceMaterials(state.clock.elapsedTime, Math.min(dt, 0.1)));
  return null;
}

/* ================================================================ status panel (HUD) */
/**
 * Compact terminal-style status monitor. It owns no mode state: everything (mode, TX,
 * simulated signal / cipher counters) comes from the shared store, which the physical
 * screen subscribes to as well. The physical display remains the primary interface.
 */
function useNow(active: boolean, ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [active, ms]);
  return now;
}
const pad2 = (n: number) => String(n).padStart(2, "0");
const hms = (sec: number) => `${pad2(Math.floor(sec / 3600))}:${pad2(Math.floor(sec / 60) % 60)}:${pad2(sec % 60)}`;
const meter = (v: number, n = 10) => "▮".repeat(Math.round(v * n)) + "▯".repeat(n - Math.round(v * n));
/** Deterministic pseudo-hex from the shared block counter (visual only). */
const cipherHex = (k: number) => Array.from({ length: 3 }, (_, i) => ((Math.imul(k + i * 7919, 2654435761) >>> 0) & 0xffff).toString(16).padStart(4, "0")).join(" ");

function startTx() {
  const s = useDevice.getState();
  if (s.transmitting || s.mode !== "field") return;
  s.setTransmitting(true);
  deviceAudio.play("squelch"); deviceAudio.startStatic();
}
function stopTx() {
  const s = useDevice.getState();
  if (!s.transmitting) return;
  s.setTransmitting(false);
  deviceAudio.stopStatic(); deviceAudio.play("squelch");
}

function FieldStatus() {
  const transmitting = useDevice((s) => s.transmitting);
  const txSince = useDevice((s) => s.txSince);
  const signal = useDevice((s) => s.sim.signal);
  const now = useNow(transmitting, 250);
  const [level, setLevel] = useState(0.4);
  useEffect(() => {
    if (!transmitting) return;
    const id = window.setInterval(() => setLevel(0.3 + Math.random() * 0.7), 140);
    return () => window.clearInterval(id);
  }, [transmitting]);
  const txSec = txSince ? Math.max(0, Math.floor((now - txSince) / 1000)) : 0;
  return (
    <>
      <div className="nm-cmd">$ radio.service --status</div>
      <div className="nm-line"><b className="nm-ok">[ OK ]</b> SERVICE INITIALIZED</div>
      <dl className="nm-kv">
        <dt>CHANNEL</dt><dd>{CHANNEL}</dd>
        <dt>SIGNAL</dt><dd>{signal}% <span className="nm-bar" aria-hidden>{meter(signal / 100, 5)}</span></dd>
        <dt>TX</dt>
        <dd className={transmitting ? "nm-tx" : ""}>
          {transmitting ? <>ACTIVE {pad2(txSec)}s <span className="nm-bar" aria-hidden>{meter(level, 6)}</span></> : "STANDBY"}
        </dd>
      </dl>
      <button
        type="button"
        className={`nm-ptt${transmitting ? " on" : ""}`}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); startTx(); }}
        onPointerUp={stopTx}
        onPointerCancel={stopTx}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.repeat) startTx(); }}
        onKeyUp={(e) => { if (e.key === "Enter") stopTx(); }}
        aria-pressed={transmitting}
      >
        <span>{transmitting ? "[ TX ]" : "[ PTT ]"}</span> {transmitting ? "transmitting…" : "hold to talk"} <kbd>SPACE</kbd>
      </button>
    </>
  );
}

function SecureStatus() {
  const since = useDevice((s) => s.sim.secureSince);
  const blocks = useDevice((s) => s.sim.cipherBlocks);
  const now = useNow(true, 1000);
  const up = since ? Math.max(0, Math.floor((now - since) / 1000)) : 0;
  return (
    <>
      <div className="nm-cmd">$ securityd --status</div>
      <div className="nm-line"><b className="nm-ok">[ OK ]</b> SECURITY SERVICE ACTIVE</div>
      <dl className="nm-kv">
        <dt>SESSION</dt><dd><span className="nm-lock" aria-hidden>■</span> LOCKED</dd>
        <dt>CIPHER</dt><dd className="nm-hex">{cipherHex(blocks)}</dd>
        <dt>BLOCKS</dt><dd>{blocks.toLocaleString("en-US")}</dd>
        <dt>UPTIME</dt><dd>{hms(up)}</dd>
      </dl>
    </>
  );
}

/** Website-level operating modes: status monitor + mode select (the physical orange switch does the same). */
export default function OperatingModeSelector() {
  const mode = useDevice((s) => s.mode);
  const setMode = useDevice((s) => s.setMode);
  const transmitting = useDevice((s) => s.transmitting);
  const powered = useDevice((s) => s.powered);
  const immersive = useDevice((s) => s.immersive);
  const ready = useDevice((s) => !!s.modelRoot);
  // Compact by default so it never hides callouts: it shows the full status for a few seconds
  // after load / a mode or TX change, then folds to one line. Hover / keyboard focus opens it;
  // clicking the title pins it open (or closed again).
  const [pinned, setPinned] = useState(false);
  const [hover, setHover] = useState(false);
  const [peek, setPeek] = useState(true);
  useEffect(() => {
    setPeek(true);
    const id = window.setTimeout(() => setPeek(false), 4500);
    return () => window.clearTimeout(id);
  }, [mode, transmitting]);
  const collapsed = !(pinned || hover || peek || transmitting);

  // one simulation clock for the shared state (signal drift, cipher counter)
  useEffect(() => {
    const id = window.setInterval(() => { if (!document.hidden) useDevice.getState().stepSim(); }, 1200);
    return () => window.clearInterval(id);
  }, []);

  // Hold Space to talk: works anywhere while the N-01 is on in FIELD_COMMS — including while the
  // screen is being operated — except when actually typing text (the on-screen terminal, or any
  // other text field), where Space must type a space. Capture phase so a focused button can't
  // swallow it as a click.
  useEffect(() => {
    let held = false;
    const typingText = () => {
      const a = document.activeElement;
      if (a instanceof HTMLTextAreaElement || (a instanceof HTMLElement && a.isContentEditable)) return true;
      if (!(a instanceof HTMLInputElement)) return false;
      if (a.classList.contains("screen-input")) return useDevice.getState().screenApp === "terminal"; // menus aren't text
      return !["button", "checkbox", "radio", "range"].includes(a.type);
    };
    const down = (e: KeyboardEvent) => {
      if (e.code !== "Space" || typingText()) return;
      const s = useDevice.getState();
      if (!s.powered || s.mode !== "field") return;
      e.preventDefault(); e.stopPropagation();
      if (e.repeat || held) return;
      held = true; startTx();
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "Space" || !held) return;
      e.preventDefault(); e.stopPropagation(); // no button "click" on release
      held = false; stopTx();
    };
    const release = () => { if (held) { held = false; stopTx(); } };
    window.addEventListener("keydown", down, true); window.addEventListener("keyup", up, true);
    window.addEventListener("blur", release);
    return () => { window.removeEventListener("keydown", down, true); window.removeEventListener("keyup", up, true); window.removeEventListener("blur", release); };
  }, []);

  if (!powered || !ready || immersive) return null;
  const secure = mode === "secure";
  const pick = (m: "field" | "secure") => { if (m !== mode) { setMode(m); deviceAudio.play("switch"); } };
  return (
    <section
      className={`n01-mode ${secure ? "secure" : "field"}${transmitting ? " tx" : ""}${collapsed ? " collapsed" : ""}`}
      aria-label="N-01 operating mode status"
      data-pinned={pinned || undefined}
      onPointerEnter={(e) => { if (e.pointerType === "mouse") setHover(true); }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") setHover(false); }}
      onFocus={() => setHover(true)}
      onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHover(false); }}
    >
      <header className="nm-head">
        <button type="button" className="nm-title" onClick={() => { if (!pinned) setPinned(true); else { setPinned(false); setPeek(false); setHover(false); } }} aria-expanded={!collapsed}>
          N01://MODE <span aria-hidden>{collapsed ? "▸" : "▾"}</span>
        </button>
        <span className="nm-dot" aria-hidden />
      </header>
      <div className="nm-modeline" aria-live="polite">
        <span className="nm-strong">{secure ? "SECURE_MODE" : "FIELD_COMMS"}</span>
        <span className="nm-tag">{transmitting ? "[TX]" : "[ACTIVE]"}</span>
      </div>
      {!collapsed && (
        <>
          <div className="nm-body">{secure ? <SecureStatus /> : <FieldStatus />}</div>
          <div className="nm-select">
            <span className="nm-k">MODE SELECT</span>
            <div className="nm-seg" role="radiogroup" aria-label="Operating mode">
              <button type="button" role="radio" aria-checked={!secure} className={!secure ? "on" : ""} onClick={() => pick("field")}>FIELD_COMMS</button>
              <span aria-hidden>/</span>
              <button type="button" role="radio" aria-checked={secure} className={secure ? "on" : ""} onClick={() => pick("secure")}>SECURE_MODE</button>
            </div>
          </div>
          <footer className="nm-note"># simulated · no real {secure ? "encryption" : "radio transmission"}</footer>
        </>
      )}
    </section>
  );
}
