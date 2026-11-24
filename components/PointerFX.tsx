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
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { pointerFx, type Magnet } from "@/lib/pointerFx";
import { CONTROL_LABELS, CONTROL_NODES, type ControlId } from "@/lib/controls";
import type { Dir } from "@/lib/screen/screenOS";
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
      const ink = (getComputedStyle(document.documentElement).getPropertyValue("--ptr").trim() || "255, 255, 255");
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
        ctx.strokeStyle = `rgba(${ink},${(0.85 * Math.pow(1 - k, 1.4)).toFixed(3)})`;
        ctx.stroke();
        // centre point: small, gone before the ring
        const dk = Math.min(1, k / 0.55);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${ink},${(0.95 * (1 - dk)).toFixed(3)})`;
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

  /* ---------- tracking marker (fine pointers only), eased so it glides instead of jittering ---------- */
  useEffect(() => {
    const marker = markerRef.current!;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    let shown = false, raf = 0, last = 0;
    const cur = { x: -100, y: -100 };
    const show = (v: boolean) => { if (v !== shown) { shown = v; marker.classList.toggle("on", v); } };
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
      const m = pointerFx.magnet;
      const gx = m ? m.x : pointerFx.px, gy = m ? m.y : pointerFx.py;
      const k = reduce.matches ? 1 : 1 - Math.exp(-dt * 32);
      cur.x += (gx - cur.x) * k; cur.y += (gy - cur.y) * k;
      marker.style.transform = `translate3d(${cur.x.toFixed(1)}px, ${cur.y.toFixed(1)}px, 0)`;
      if (Math.abs(gx - cur.x) + Math.abs(gy - cur.y) > 0.3 || m) raf = requestAnimationFrame(loop);
      else { raf = 0; last = 0; }
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" || !fine.matches) { pointerFx.overScene = false; return show(false); }
      const t = e.target as Element | null;
      pointerFx.overScene = !!t?.closest?.(".canvas-wrap");
      pointerFx.px = e.clientX; pointerFx.py = e.clientY;
      if (!shown) { cur.x = e.clientX; cur.y = e.clientY; }
      show(pointerFx.overScene); // hidden by CSS while the target lock is on
      kick();
    };
    const onLeave = (e: PointerEvent) => { if (!e.relatedTarget) { show(false); pointerFx.overScene = false; } };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerout", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerout", onLeave);
    };
  }, []);

  /* ---------- magnetic click: a click / tap just outside a control presses that control ---------- */
  useEffect(() => {
    let down: { x: number; y: number; t: number; id: number; type: string } | null = null;
    const onDown = (e: PointerEvent) => {
      const onCanvas = (e.target as Element | null)?.tagName === "CANVAS";
      down = e.isPrimary && onCanvas ? { x: e.clientX, y: e.clientY, t: e.timeStamp, id: e.pointerId, type: e.pointerType } : null;
    };
    const onUp = (e: PointerEvent) => {
      const d = down; down = null;
      if (!d || e.pointerId !== d.id) return;
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 8 || e.timeStamp - d.t > 600) return; // a drag, not a click
      if (pointerFx.lastDirectHit >= d.t - 5) return;   // a control was hit directly: its own handler runs
      if (useDevice.getState().hoveredHotspot) return;
      const m = d.type === "mouse" ? pointerFx.magnet : pointerFx.findMagnet?.(d.x, d.y, 30) ?? null;
      if (m && pointerFx.activate) pointerFx.activate(m.id, m.node, m.dir);
    };
    window.addEventListener("pointerdown", onDown, { capture: true, passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", onDown, { capture: true });
      window.removeEventListener("pointerup", onUp);
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

/* ---------- in-canvas: target lock (hovered control / hotspot / magnet) + sticky-cursor search ---------- */
const DISPLAY_NODES = new Set(["N01_Display_Module", "N01_Display_Bezel", "N01_Display_UI"]);
/** Controls the cursor can "stick" to (small targets; the screen itself is big enough). */
const MAGNET_IDS = new Set<ControlId>(["wheel", "wheel-center", "touchpad", "btn-cancel", "btn-menu", "btn-power", "btn-fullscreen", "btn-confirm", "back", "switch"]);
const MAGNET_PX = 26;
type Rect = { x0: number; y0: number; x1: number; y1: number };

export function TargetLockProjector() {
  const { camera, size } = useThree();
  const root = useDevice((s) => s.modelRoot);
  const box = useRef(new THREE.Box3());
  const v = useRef(new THREE.Vector3());
  const last = useRef<{ key: unknown; x: number; y: number; w: number; h: number }>({ key: null, x: 0, y: 0, w: 0, h: 0 });
  const magnetLabel = useRef<string | null>(null);
  const frame = useRef(0);

  const nodes = useMemo(() => {
    const list: { id: ControlId; node: THREE.Object3D }[] = [];
    root?.traverse((o) => { const id = CONTROL_NODES[o.name]; if (id && MAGNET_IDS.has(id)) list.push({ id, node: o }); });
    return list;
  }, [root]);

  const rectOf = (o: THREE.Object3D): Rect => {
    box.current.setFromObject(o);
    const b = box.current;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < 8; i++) {
      v.current.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).project(camera);
      const px = (v.current.x * 0.5 + 0.5) * size.width, py = (-v.current.y * 0.5 + 0.5) * size.height;
      x0 = Math.min(x0, px); x1 = Math.max(x1, px); y0 = Math.min(y0, py); y1 = Math.max(y1, py);
    }
    return { x0, y0, x1, y1 };
  };

  /** Projected outline (convex hull of the 8 box corners) of a control, in CSS px. */
  const hullOf = (o: THREE.Object3D): [number, number][] => {
    box.current.setFromObject(o);
    const b = box.current;
    const pts: [number, number][] = [];
    for (let i = 0; i < 8; i++) {
      v.current.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).project(camera);
      pts.push([(v.current.x * 0.5 + 0.5) * size.width, (-v.current.y * 0.5 + 0.5) * size.height]);
    }
    pts.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    const cross = (o: number[], a: number[], c: number[]) => (a[0] - o[0]) * (c[1] - o[1]) - (a[1] - o[1]) * (c[0] - o[0]);
    const lower: [number, number][] = [], upper: [number, number][] = [];
    for (const p of pts) { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop(); lower.push(p); }
    for (const p of [...pts].reverse()) { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop(); upper.push(p); }
    return [...lower.slice(0, -1), ...upper.slice(0, -1)];
  };
  /** Distance from (x, y) to a convex polygon (0 inside). */
  const distToHull = (h: [number, number][], x: number, y: number) => {
    let inside = true, best = Infinity;
    for (let i = 0; i < h.length; i++) {
      const [ax, ay] = h[i], [bx, by] = h[(i + 1) % h.length];
      if ((bx - ax) * (y - ay) - (by - ay) * (x - ax) < 0) inside = false;
      const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2 || 1)));
      best = Math.min(best, Math.hypot(x - (ax + t * (bx - ax)), y - (ay + t * (by - ay))));
    }
    return inside ? 0 : best;
  };

  /** Control the cursor should stick to: nearest projected outline within `reach` px; ties → nearest centre. */
  const findMagnet = (x: number, y: number, reach = MAGNET_PX): Magnet | null => {
    let best: { m: Magnet; d: number; c: number } | null = null;
    for (const { id, node } of nodes) {
      const h = hullOf(node);
      const d = distToHull(h, x, y);
      if (d > reach) continue;
      const cx = h.reduce((s, p) => s + p[0], 0) / h.length, cy = h.reduce((s, p) => s + p[1], 0) / h.length;
      const c = Math.hypot(x - cx, y - cy);
      if (!best || d < best.d - 2 || (Math.abs(d - best.d) <= 2 && c < best.c)) {
        let dir: Dir | undefined;
        if (id === "wheel") dir = Math.abs(x - cx) > Math.abs(y - cy) ? (x > cx ? "right" : "left") : (y > cy ? "down" : "up");
        best = { m: { id, node, x: cx, y: cy, dir }, d, c };
      }
    }
    return best?.m ?? null;
  };
  pointerFx.findMagnet = findMagnet;

  useFrame(() => {
    const el = pointerFx.lock;
    const s = useDevice.getState();
    frame.current++;

    // pointer near the device → pause the idle sway (checked every few frames)
    if (root && frame.current % 6 === 0) {
      if (pointerFx.overScene) {
        const r = rectOf(root);
        pointerFx.nearDevice = pointerFx.px > r.x0 - 40 && pointerFx.px < r.x1 + 40 && pointerFx.py > r.y0 - 40 && pointerFx.py < r.y1 + 40;
      } else pointerFx.nearDevice = false;
    }

    // sticky cursor: only when nothing is hit directly
    const canMagnet = pointerFx.overScene && !pointerFx.target && !s.hoveredHotspot && !s.immersive;
    pointerFx.magnet = canMagnet ? findMagnet(pointerFx.px, pointerFx.py) : null;
    const label = pointerFx.magnet ? CONTROL_LABELS[pointerFx.magnet.id] : null;
    if (label !== magnetLabel.current) {
      if (label) s.setHoverLabel(label);
      else if (s.hoverLabel === magnetLabel.current) s.setHoverLabel(null);
      magnetLabel.current = label;
    }

    if (!el) return;
    let key: unknown = null;
    let x0 = 0, y0 = 0, x1 = 0, y1 = 0;
    const tgt = pointerFx.target ?? pointerFx.magnet?.node ?? null;
    // a hovered hotspot marker sits on top of the canvas, so it wins over the 3D control below it
    if (s.hoveredHotspot && !s.pinnedHotspot && document.querySelector(".hs.hovered .hs-dot")) {
      const r = document.querySelector(".hs.hovered .hs-dot")!.getBoundingClientRect();
      const c = 8; // brackets hug the marker
      x0 = r.left + c; y0 = r.top + c; x1 = r.right - c; y1 = r.bottom - c;
      key = s.hoveredHotspot;
    } else if (tgt && !(s.screenFocus && DISPLAY_NODES.has(tgt.name)) && !s.immersive) {
      ({ x0, y0, x1, y1 } = rectOf(tgt));
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
