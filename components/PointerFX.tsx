"use client";

/**
 * Pointer effects, each with one job:
 *  - Click  → one thin expanding pulse (sonar style) from the exact click point.
 *  - Cursor → a minimal tracking marker over the 3D scene (mouse only).
 *  - Hover  → target-lock brackets around the control / hotspot under the pointer.
 *  - Select → unchanged: the existing technical callout + leader line.
 *
 * The pulse canvas is pointer-events: none and only animates while a pulse is alive.
 * Click detection is a single capture-phase window listener (pointerdown → pointerup with
 * little movement), so it fires exactly once per click whatever is underneath and never
 * stops or alters the underlying handlers. Camera drags don't pulse.
 */
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { pointerFx } from "@/lib/pointerFx";
import { useDevice } from "@/lib/store";

type Pulse = { x: number; y: number; t0: number };

const DURATION = 620; // ms
const MAX_R = 46; // css px
const MAX_PULSES = 6;
const CLICK_SLOP = 8; // px of movement still treated as a click
const CLICK_MS = 600;

export default function PointerFX() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const markerRef = useRef<HTMLDivElement>(null);
  const lockRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    pointerFx.lock = lockRef.current;
    return () => { pointerFx.lock = null; };
  }, []);

  /* ---------- click pulse ---------- */
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    const pulses: Pulse[] = [];
    let raf = 0;
    let dpr = 1;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
    };
    resize();

    const draw = () => {
      const now = performance.now();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const still = reduce.matches;
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i];
        const k = Math.max(0, (now - p.t0) / (still ? 320 : DURATION));
        if (k >= 1) { pulses.splice(i, 1); continue; }
        const e = 1 - Math.pow(1 - k, 3); // fast out, settles at the edge
        const r = still ? 12 : 3 + (MAX_R - 3) * e; // always grows outward
        // ring: thin, fades as it expands
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.lineWidth = 1;
        ctx.strokeStyle = `rgba(255,255,255,${(0.85 * Math.pow(1 - k, 1.4)).toFixed(3)})`;
        ctx.stroke();
        // centre point: small, gone before the ring
        const dk = Math.min(1, k / 0.55);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${(0.95 * (1 - dk)).toFixed(3)})`;
        ctx.fill();
      }
      if (pulses.length) raf = requestAnimationFrame(draw);
      else { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); raf = 0; }
    };

    const spawn = (x: number, y: number) => {
      if (pulses.length >= MAX_PULSES) pulses.shift();
      pulses.push({ x, y, t0: performance.now() });
      if (process.env.NODE_ENV !== "production") { const w = window as unknown as { __n01pulseCount?: number }; w.__n01pulseCount = (w.__n01pulseCount ?? 0) + 1; }
      if (!raf) raf = requestAnimationFrame(draw);
    };

    let down: { id: number; x: number; y: number; t: number } | null = null;
    const onDown = (e: PointerEvent) => {
      if (!e.isPrimary || e.button > 0) return;
      down = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp };
    };
    const onUp = (e: PointerEvent) => {
      if (!down || e.pointerId !== down.id) return;
      const d = down; down = null;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > CLICK_SLOP || e.timeStamp - d.t > CLICK_MS) return;
      spawn(d.x, d.y); // the exact press position
    };
    const onCancel = () => { down = null; };

    window.addEventListener("pointerdown", onDown, { capture: true, passive: true });
    window.addEventListener("pointerup", onUp, { capture: true, passive: true });
    window.addEventListener("pointercancel", onCancel, { capture: true, passive: true });
    window.addEventListener("resize", resize);
    if (process.env.NODE_ENV !== "production") Object.assign(window, { __n01pulses: pulses });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointerdown", onDown, { capture: true });
      window.removeEventListener("pointerup", onUp, { capture: true });
      window.removeEventListener("pointercancel", onCancel, { capture: true });
      window.removeEventListener("resize", resize);
    };
  }, []);

  /* ---------- tracking marker (fine pointers only) ---------- */
  useEffect(() => {
    const marker = markerRef.current!;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    let shown = false;
    const show = (v: boolean) => { if (v !== shown) { shown = v; marker.classList.toggle("on", v); } };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || !fine.matches) return show(false);
      const t = e.target as Element | null;
      const overScene = !!t?.closest?.(".canvas-wrap");
      marker.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
      show(overScene); // hidden by CSS while the target lock is on
    };
    const onLeave = (e: PointerEvent) => { if (!e.relatedTarget) show(false); };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onLeave);
    };
  }, []);

  return (
    <>
      <canvas ref={canvasRef} className="pulse-layer" aria-hidden="true" />
      <div ref={lockRef} className="target-lock" aria-hidden="true"><i /><i /><i /><i /></div>
      <div ref={markerRef} className="cursor-marker" aria-hidden="true"><i /></div>
    </>
  );
}

/* ---------- in-canvas: projects the hovered control / hotspot into the lock brackets ---------- */
const DISPLAY_NODES = new Set(["N01_Display_Module", "N01_Display_Bezel", "N01_Display_UI"]);

export function TargetLockProjector() {
  const { camera, size } = useThree();
  const box = useRef(new THREE.Box3());
  const v = useRef(new THREE.Vector3());
  const last = useRef<{ key: unknown; x: number; y: number; w: number; h: number }>({ key: null, x: 0, y: 0, w: 0, h: 0 });

  useFrame(() => {
    const el = pointerFx.lock;
    if (!el) return;
    const s = useDevice.getState();
    let key: unknown = null;
    let x0 = 0, y0 = 0, x1 = 0, y1 = 0;

    const tgt = pointerFx.target;
    // a hovered hotspot marker sits on top of the canvas, so it wins over the 3D control below it
    if (s.hoveredHotspot && !s.pinnedHotspot && document.querySelector(".hs.hovered .hs-dot")) {
      const dot = document.querySelector(".hs.hovered .hs-dot");
      if (dot) {
        const r = dot.getBoundingClientRect();
        const c = 8; // brackets hug the marker
        x0 = r.left + c; y0 = r.top + c; x1 = r.right - c; y1 = r.bottom - c;
        key = s.hoveredHotspot;
      }
    } else if (tgt && !(s.screenFocus && DISPLAY_NODES.has(tgt.name)) && !s.immersive) {
      box.current.setFromObject(tgt);
      x0 = y0 = Infinity; x1 = y1 = -Infinity;
      const b = box.current;
      for (let i = 0; i < 8; i++) {
        v.current.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).project(camera);
        const px = (v.current.x * 0.5 + 0.5) * size.width, py = (-v.current.y * 0.5 + 0.5) * size.height;
        x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
      }
      key = tgt;
    }

    const L = last.current;
    if (!key) {
      if (L.key) { el.classList.remove("on"); L.key = null; }
      return;
    }
    const pad = 6;
    let w = Math.max(18, x1 - x0 + pad * 2), h = Math.max(18, y1 - y0 + pad * 2);
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    w = Math.round(w); h = Math.round(h);
    const x = Math.round(cx - w / 2), y = Math.round(cy - h / 2);
    if (key !== L.key) {
      el.classList.remove("on");
      void el.offsetWidth; // restart the lock-in animation for the new target
      el.classList.add("on");
      L.key = key;
    }
    if (x !== L.x || y !== L.y || w !== L.w || h !== L.h) {
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      L.x = x; L.y = y; L.w = w; L.h = h;
    }
  });
  return null;
}
