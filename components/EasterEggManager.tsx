"use client";

import { useEffect, useRef, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { useDevice } from "@/lib/store";
import { deviceAudio } from "@/lib/deviceAudio";
import { emissiveMaterialCount } from "@/lib/deviceMaterials";

const isTyping = () => document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement;

/* ================================================================ diagnostics probe (in-canvas) */
export const diag = { fps: 0, ms: 0, calls: 0, tris: 0, geos: 0, tex: 0, dpr: 1, w: 0, h: 0, programs: 0 };
export function DiagnosticsProbe() {
  const gl = useThree((s) => s.gl);
  const acc = useRef({ t: 0, n: 0 });
  useEffect(() => {
    // count every render pass of a frame (floor reflection, shadows, main pass), not just the last one
    gl.info.autoReset = false;
    return () => { gl.info.autoReset = true; };
  }, [gl]);
  useFrame((_, dt) => {
    // runs first in each frame: gl.info now holds the full previous frame
    const calls = gl.info.render.calls, tris = gl.info.render.triangles;
    gl.info.reset();
    acc.current.t += dt; acc.current.n++;
    if (acc.current.t < 0.5) return;
    diag.fps = acc.current.n / acc.current.t;
    diag.ms = (acc.current.t / acc.current.n) * 1000;
    acc.current = { t: 0, n: 0 };
    diag.calls = calls; diag.tris = tris;
    diag.geos = gl.info.memory.geometries; diag.tex = gl.info.memory.textures;
    diag.programs = gl.info.programs?.length ?? 0;
    diag.dpr = gl.getPixelRatio();
    diag.w = gl.domElement.width; diag.h = gl.domElement.height;
  }, -1000);
  return null;
}

/* ================================================================ overlays */
function Diagnostics({ onClose }: { onClose: () => void }) {
  const [, tick] = useState(0);
  const s = useDevice();
  useEffect(() => { const id = window.setInterval(() => tick((n) => n + 1), 500); return () => window.clearInterval(id); }, []);
  const rows: [string, string][] = [
    ["FPS", diag.fps.toFixed(0)], ["FRAME", `${diag.ms.toFixed(1)} ms`], ["DRAW CALLS", String(diag.calls)],
    ["TRIANGLES", diag.tris.toLocaleString()], ["GEOMETRIES", String(diag.geos)], ["SHADERS", String(diag.programs)],
    ["CANVAS", `${diag.w}×${diag.h} @ ${diag.dpr.toFixed(2)}x`], ["EMISSIVE MATS", String(emissiveMaterialCount())],
    ["POWER", s.powered ? "ON" : "OFF"], ["MODE", s.mode === "secure" ? "SECURE (sim)" : "FIELD COMMS (sim)"],
    ["SOUND", s.soundOn ? "ON" : "MUTED"],
  ];
  return (
    <div className="egg-panel diag" role="dialog" aria-label="Diagnostic mode">
      <div className="egg-head"><span>DIAGNOSTIC MODE</span><button type="button" onClick={onClose} aria-label="Close">×</button></div>
      <div className="diag-grid">{rows.map(([k, v]) => <div key={k}><span>{k}</span><b>{v}</b></div>)}</div>
      <div className="egg-foot">Live renderer statistics from this browser session.</div>
    </div>
  );
}

/* ================================================================ manager */
const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "KeyB", "KeyA"];

export default function EasterEggManager() {
  const overlay = useDevice((s) => s.overlay);
  const close = useDevice((s) => s.closeOverlay);
  const seq = useRef<string[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && useDevice.getState().overlay !== "none") { close(); return; }
      if (isTyping()) return;
      seq.current = [...seq.current, e.code].slice(-KONAMI.length);
      if (KONAMI.every((k, i) => seq.current[i] === k)) {
        seq.current = [];
        useDevice.getState().openOverlay("arcade"); // routed to the ARCADE app on the physical screen
        deviceAudio.play("boot");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  return overlay === "diagnostics" ? <Diagnostics onClose={close} /> : null;
}
