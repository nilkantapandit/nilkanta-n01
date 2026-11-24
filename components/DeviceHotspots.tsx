"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { HOTSPOTS, type Hotspot } from "@/lib/hotspots";
import { useDevice } from "@/lib/store";
import { useIsMobile } from "@/lib/useIsMobile";
import TechnicalCallout from "./TechnicalCallout";
import { deviceAudio } from "@/lib/deviceAudio";

/**
 * Hotspot system in two halves:
 *  - <HotspotProjector/> lives inside the R3F canvas. Every frame it reads the real GLB node
 *    transforms, projects each anchor to screen space and writes the position/visibility
 *    straight onto the marker DOM elements (no React re-render per frame).
 *  - <DeviceHotspots/> is a single DOM overlay with the 12 markers, leader lines and cards.
 */
const markerEls = new Map<string, HTMLDivElement>();

const _n = new THREE.Vector3();
const _p = new THREE.Vector3();
const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();

/** Keeps the open callout card inside the viewport by flipping the leader-line direction. */
function placeCard(el: HTMLDivElement, x: number, y: number, pref: [number, number], W: number, H: number) {
  const card = el.querySelector<HTMLDivElement>(".callout-card");
  const cw = (card?.offsetWidth ?? 240) + 12;
  const ch = (card?.offsetHeight ?? 150) + 12;
  const M = 12, TOP = 90, BOTTOM = 90;
  let [dx, dy] = pref;
  const side = (d: number) => (d < -10 ? -1 : d > 10 ? 1 : 0);
  const left = (d: number) => (side(d) === -1 ? x + d - cw : side(d) === 1 ? x + d : x + d - cw / 2);
  if (left(dx) < M || left(dx) + cw > W - M) {
    const flipped = side(dx) === 0 ? (x < W / 2 ? 140 : -140) : -dx;
    if (!(left(flipped) < M || left(flipped) + cw > W - M)) dx = flipped;
  }
  const top = (d: number) => (d < 0 ? y + d - ch : y + d);
  if (top(dy) < TOP || top(dy) + ch > H - BOTTOM) {
    const flipped = -dy;
    if (!(top(flipped) < TOP || top(flipped) + ch > H - BOTTOM)) dy = flipped;
  }
  const len = Math.hypot(dx, dy);
  el.style.setProperty("--dx", `${dx}px`);
  el.style.setProperty("--dy", `${dy}px`);
  el.style.setProperty("--len", `${len}px`);
  el.style.setProperty("--ang", `${Math.atan2(dy, dx)}rad`);
  el.style.setProperty("--tx", side(dx) === -1 ? "-100%" : side(dx) === 1 ? "0%" : "-50%");
  el.style.setProperty("--ty", dy < 0 ? "-100%" : "0%");
}

export function HotspotProjector() {
  const root = useDevice((s) => s.modelRoot);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const anchors = useMemo(() => {
    if (!root) return [];
    return HOTSPOTS.flatMap((h) => {
      const node = root.getObjectByName(h.node);
      if (!node) {
        console.warn(`[N-01] hotspot "${h.id}": node ${h.node} not found in GLB`);
        return [];
      }
      return [{ id: h.id, node, offset: new THREE.Vector3(...h.offset), normal: new THREE.Vector3(...h.normal), card: h.card }];
    });
  }, [root]);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __n01anchors?: number }).__n01anchors = anchors.length;
    }
  }, [anchors]);

  useFrame(() => {
    // Matrices are normally refreshed at render time; update them now so markers never lag a frame.
    camera.updateMatrixWorld();
    for (const a of anchors) {
      a.node.updateWorldMatrix(true, false);
      const el = markerEls.get(a.id);
      if (!el) continue;
      _p.copy(a.offset);
      a.node.localToWorld(_p);
      a.node.getWorldQuaternion(_q);
      _n.copy(a.normal).applyQuaternion(_q);
      const facing = _n.dot(_v.copy(camera.position).sub(_p).normalize());
      _v.copy(_p).project(camera);
      const onScreen = _v.z < 1 && Math.abs(_v.x) < 1.2 && Math.abs(_v.y) < 1.2;
      const alpha = onScreen ? THREE.MathUtils.smoothstep(facing, -0.02, 0.28) : 0;
      const x = ((_v.x + 1) / 2) * size.width;
      const y = ((1 - _v.y) / 2) * size.height;
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      el.style.opacity = alpha.toFixed(3);
      const vis = alpha > 0.25;
      el.style.pointerEvents = vis ? "auto" : "none";
      el.dataset.visible = vis ? "1" : "0";
      if (el.classList.contains("open")) placeCard(el, x, y, a.card, size.width, size.height);
    }
  });
  return null;
}

function Marker({ hotspot }: { hotspot: Hotspot }) {
  const ref = useRef<HTMLDivElement>(null);
  const hovered = useDevice((s) => s.hoveredHotspot === hotspot.id);
  const pinned = useDevice((s) => s.pinnedHotspot === hotspot.id);
  const anyPinned = useDevice((s) => s.pinnedHotspot !== null);
  const setHovered = useDevice((s) => s.setHoveredHotspot);
  const togglePinned = useDevice((s) => s.togglePinnedHotspot);
  const mobile = useIsMobile();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    markerEls.set(hotspot.id, el);
    return () => { markerEls.delete(hotspot.id); };
  }, [hotspot.id]);

  const showFloat = !mobile && (pinned || (hovered && !anyPinned));
  const [dx, dy] = hotspot.card;
  // Seed the leader-line / card variables so the first frame never covers the dot.
  const initial = {
    opacity: 0,
    "--dx": `${dx}px`, "--dy": `${dy}px`, "--len": `${Math.hypot(dx, dy)}px`, "--ang": `${Math.atan2(dy, dx)}rad`,
    "--tx": dx < -10 ? "-100%" : dx > 10 ? "0%" : "-50%", "--ty": dy < 0 ? "-100%" : "0%",
  } as React.CSSProperties;
  return (
    <div
      ref={ref}
      className={`hs${pinned ? " pinned" : ""}${hovered ? " hovered" : ""}${showFloat ? " open" : ""}`}
      data-hotspot={hotspot.id}
      style={initial}
      onPointerEnter={(e) => { if (e.pointerType === "mouse") setHovered(hotspot.id); }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") setHovered(null); }}
    >
      <button
        type="button"
        className="hs-dot"
        aria-label={`${hotspot.title}: ${hotspot.subtitle}`}
        aria-expanded={pinned}
        onFocus={() => setHovered(hotspot.id)}
        onBlur={() => setHovered(null)}
        onClick={(e) => { e.stopPropagation(); deviceAudio.play("tick"); togglePinned(hotspot.id); }}
      />
      {showFloat && <TechnicalCallout hotspot={hotspot} variant="float" pinned={pinned} onClose={() => togglePinned(hotspot.id)} />}
    </div>
  );
}

/** DOM overlay with all technical callout markers (positions driven by HotspotProjector). */
export default function DeviceHotspots() {
  const mobile = useIsMobile();
  // Markers stay up while the screen is operated on desktop; on phones they step aside so taps
  // reach the keys / screen (they come back when the visitor exits the screen).
  const visible = useDevice((s) => s.calloutsVisible && !s.immersive && s.overlay === "none" && !!s.modelRoot && !(mobile && s.screenFocus));
  if (!visible) return null;
  return (
    <div className="hs-layer" aria-label="Technical callouts">
      {HOTSPOTS.map((h) => <Marker key={h.id} hotspot={h} />)}
    </div>
  );
}
