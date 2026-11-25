"use client";

/**
 * The field manual as a hologram standing beside the device (above it on portrait screens).
 * It lives in the 3D scene, so turning the view changes its perspective and the device hides
 * what is behind it. Zooming does not change it: the panel is scaled about the orbit target by the
 * same factor as the camera distance, which keeps its on-screen size and place fixed.
 *
 * The panel is a fixed-size window onto a taller page: the mouse wheel over it (or a vertical
 * drag on it, on touch screens) scrolls the page instead of zooming / rotating the scene.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useDevice } from "@/lib/store";
import { HERO_DIRECTION, HERO_TARGET } from "@/lib/config";
import { fovFor, heroDistance } from "./CameraRig";
import { drawFrame, drawGuide, HOLO_WIDTH, type HoloLayout } from "@/lib/guideHolo";

const noRaycast = () => null;

/**
 * Placement. The panel rides a ring around the orbit target, on the far side of the device from
 * the camera (so it can pass *behind* the deck but never in front of it). `delta` is its angle
 * along the ring (0 = straight behind; negative = screen right), `R` the ring radius at hero
 * distance, `ny` / `h` its screen height and size in the hero view, `aspect` its width / height.
 */
const PLACE: Record<HoloLayout, { delta: number; R: number; ny: number; h: number; aspect: number }> = {
  side: { delta: -0.73, R: 2.2, ny: 0.0, h: 1.5, aspect: 0.6 },
  top: { delta: 0, R: 1.2, ny: 0.56, h: 0.6, aspect: 1.45 },
};
const MAX_DELTA = 1.1;            // keep it beside / behind the deck and on screen
const POS_KEY = "n01-guide-pos";
const wrapPi = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

function canvasTexture() {
  const t = new THREE.CanvasTexture(document.createElement("canvas"));
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

export default function GuideHologram() {
  const open = useDevice((s) => s.guideOpen);
  const immersive = useDevice((s) => s.immersive);
  const theme = useDevice((s) => s.theme);
  const size = useThree((s) => s.size);
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3 } | null;
  const aspect = size.width / size.height;
  const layout: HoloLayout = aspect >= 1.15 ? "side" : "top";
  const place = PLACE[layout];
  const touch = useMemo(() => typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches, []);

  const group = useRef<THREE.Group>(null);
  const scan = useRef<THREE.Mesh>(null);
  const thumb = useRef<THREE.Mesh>(null);
  const pageMat = useRef<THREE.MeshBasicMaterial>(null);
  const frameMat = useRef<THREE.MeshBasicMaterial>(null);
  const fade = useRef(0);
  const scroll = useRef({ cur: 0, target: 0 }); // page px scrolled from the top
  const calm = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  const pageTex = useMemo(canvasTexture, []);
  const frameTex = useMemo(canvasTexture, []);
  const [pageH, setPageH] = useState(2000);
  const viewH = HOLO_WIDTH / place.aspect; // page px visible in the window
  const maxScroll = Math.max(0, pageH - viewH);

  useEffect(() => {
    const canvas = pageTex.image as HTMLCanvasElement;
    const draw = () => { setPageH(drawGuide(canvas, layout, theme === "light" ? "light" : "dark")); pageTex.dispose(); pageTex.needsUpdate = true; };
    draw();
    let alive = true;
    document.fonts?.load(`700 30px "JetBrains Mono"`).then(() => alive && draw()).catch(() => {});
    return () => { alive = false; };
  }, [pageTex, layout, theme]);
  useEffect(() => {
    drawFrame(frameTex.image as HTMLCanvasElement, theme === "light" ? "light" : "dark", place.aspect, touch);
    frameTex.dispose(); frameTex.needsUpdate = true;
  }, [frameTex, theme, place.aspect, touch]);
  useEffect(() => () => { pageTex.dispose(); frameTex.dispose(); }, [pageTex, frameTex]);
  useEffect(() => { scroll.current.target = Math.min(scroll.current.target, maxScroll); }, [maxScroll]);

  // Calibrate in the hero view: panel height (world) and ring height so it sits at `ny`.
  const base = useMemo(() => {
    const d0 = heroDistance(aspect);
    const T = new THREE.Vector3(...HERO_TARGET);
    const dir = new THREE.Vector3(...HERO_DIRECTION).normalize();
    const cam = new THREE.PerspectiveCamera(fovFor(aspect), aspect, 0.05, 60);
    cam.position.copy(T).addScaledVector(dir, d0);
    cam.lookAt(T);
    cam.updateMatrixWorld();
    const az = Math.atan2(dir.x, dir.z);
    const phi = az + Math.PI + place.delta;
    const at = (y: number) => new THREE.Vector3(T.x + place.R * Math.sin(phi), y, T.z + place.R * Math.cos(phi));
    const ny = (y: number) => at(y).project(cam).y;
    const y0 = T.y, y1 = T.y + 1;
    const yc = y0 + ((place.ny - ny(y0)) / (ny(y1) - ny(y0))) * (y1 - y0);
    const D = at(yc).sub(cam.position).dot(dir.clone().negate());
    const tanH = Math.tan(THREE.MathUtils.degToRad(fovFor(aspect) / 2));
    const hgt = place.h * D * tanH;
    return { d0, dy: yc - T.y, w: hgt * place.aspect, h: hgt };
  }, [aspect, place]);

  // where along the ring the visitor has dragged it (remembered)
  const delta = useRef(place.delta);
  useEffect(() => {
    let v = place.delta;
    try { const s = localStorage.getItem(`${POS_KEY}-${layout}`); if (s !== null && isFinite(+s)) v = THREE.MathUtils.clamp(+s, -MAX_DELTA, MAX_DELTA); } catch {}
    delta.current = v;
  }, [layout, place.delta]);
  const az = useRef<number | null>(null); // smoothed camera azimuth the ring follows

  /* ---- input: wheel / drag over the panel scroll it instead of moving the camera ---- */
  useEffect(() => {
    const el = gl.domElement;
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    const plane = new THREE.Plane();
    const hit = new THREE.Vector3();
    const n = new THREE.Vector3();
    const over = (cx: number, cy: number) => {
      const g = group.current;
      if (!g || !g.visible || fade.current < 0.5) return false;
      const r = el.getBoundingClientRect();
      if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return false;
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      g.updateMatrixWorld();
      n.set(0, 0, 1).applyQuaternion(g.quaternion);
      plane.setFromNormalAndCoplanarPoint(n, g.position);
      if (!ray.ray.intersectPlane(plane, hit)) return false;
      const dist = hit.distanceTo(ray.ray.origin);
      g.worldToLocal(hit);
      if (Math.abs(hit.x) > 0.5 || Math.abs(hit.y) > 0.5) return false;
      // the deck is in front here → the click / scroll belongs to the deck, not the panel behind it
      const root = useDevice.getState().modelRoot;
      const front = root ? ray.intersectObject(root, true)[0] : undefined;
      return !(front && front.distance < dist);
    };
    const by = (px: number) => { scroll.current.target = THREE.MathUtils.clamp(scroll.current.target + px, 0, maxScroll); };

    const onWheel = (e: WheelEvent) => {
      if (!over(e.clientX, e.clientY)) return;
      e.preventDefault(); e.stopImmediatePropagation();
      by((e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY) * 1.4);
    };
    let drag: { id: number; x0: number; y0: number; x: number; y: number; px: number; pxRad: number; axis: "" | "x" | "y" } | null = null;
    const onDown = (e: PointerEvent) => {
      if (e.target !== el || !over(e.clientX, e.clientY)) return;
      e.stopImmediatePropagation();       // keep OrbitControls / device controls out of it
      const r = el.getBoundingClientRect();
      const g = group.current!;
      // page px per screen px (vertical scroll) and screen px per radian along the ring (move)
      const top = g.localToWorld(new THREE.Vector3(0, 0.5, 0)).project(camera);
      const bot = g.localToWorld(new THREE.Vector3(0, -0.5, 0)).project(camera);
      const screenH = Math.abs(top.y - bot.y) * 0.5 * r.height || 1;
      const sx = (d: number) => ringPoint(d).project(camera).x * 0.5 * r.width;
      const pxRad = (sx(delta.current + 0.02) - sx(delta.current)) / 0.02;
      drag = { id: e.pointerId, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, px: viewH / screenH, pxRad: Math.abs(pxRad) < 40 ? Math.sign(pxRad || -1) * 40 : pxRad, axis: "" };
      document.body.classList.add("holo-drag");
    };
    const onMove = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      e.stopImmediatePropagation();
      if (!drag.axis) {
        const dx = e.clientX - drag.x0, dy = e.clientY - drag.y0;
        if (Math.hypot(dx, dy) < 6) return;
        drag.axis = Math.abs(dx) > Math.abs(dy) ? "x" : "y";
      }
      if (drag.axis === "y") by((drag.y - e.clientY) * drag.px);
      else delta.current = THREE.MathUtils.clamp(delta.current + (e.clientX - drag.x) / drag.pxRad, -MAX_DELTA, MAX_DELTA);
      drag.x = e.clientX; drag.y = e.clientY;
    };
    const onUp = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      e.stopImmediatePropagation();
      if (drag.axis === "x") { try { localStorage.setItem(`${POS_KEY}-${layout}`, delta.current.toFixed(3)); } catch {} }
      drag = null;
      document.body.classList.remove("holo-drag");
    };
    window.addEventListener("wheel", onWheel, { capture: true, passive: false });
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("pointermove", onMove, true);
    window.addEventListener("pointerup", onUp, true);
    window.addEventListener("pointercancel", onUp, true);
    if (process.env.NODE_ENV !== "production") Object.assign(window, { __n01holo: { scroll: scroll.current, over, maxScroll, viewH, delta } });
    return () => {
      window.removeEventListener("wheel", onWheel, true);
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("pointercancel", onUp, true);
    };
  }, [gl, camera, maxScroll, viewH, layout]); // eslint-disable-line react-hooks/exhaustive-deps

  const target = useMemo(() => new THREE.Vector3(), []);
  /** World position on the ring for angle d (zoom-scaled about the target). */
  const ringPoint = (d: number) => {
    const T = controls?.target ?? new THREE.Vector3(...HERO_TARGET);
    const k = camera.position.distanceTo(T) / base.d0;
    const phi = (az.current ?? Math.atan2(camera.position.x - T.x, camera.position.z - T.z)) + Math.PI + d;
    return new THREE.Vector3(T.x + place.R * k * Math.sin(phi), T.y + base.dy * k, T.z + place.R * k * Math.cos(phi));
  };
  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const want = open && !immersive ? 1 : 0;
    fade.current += (want - fade.current) * Math.min(1, dt * 6);
    g.visible = fade.current > 0.01;
    if (!g.visible) return;
    target.copy(controls?.target ?? new THREE.Vector3(...HERO_TARGET));
    const dist = camera.position.distanceTo(target);
    const k = dist / base.d0;
    // the ring follows the camera round, a little late — turning shows the perspective,
    // and the panel drifts back into view instead of being left off screen
    const camAz = Math.atan2(camera.position.x - target.x, camera.position.z - target.z);
    if (az.current === null) az.current = camAz;
    az.current += wrapPi(camAz - az.current) * Math.min(1, dt * 1.6);
    const P = ringPoint(delta.current);
    g.position.copy(P);
    // face the (smoothed) viewing direction, upright
    const lookX = target.x + Math.sin(az.current) * dist, lookZ = target.z + Math.cos(az.current) * dist;
    g.rotation.set(0, Math.atan2(lookX - P.x, lookZ - P.z), 0);
    g.scale.set(base.w * k, base.h * k, k);

    // scroll: show the [cur, cur + viewH] slice of the page
    const s = scroll.current;
    s.cur += (s.target - s.cur) * Math.min(1, dt * 14);
    const frac = Math.min(1, viewH / pageH);
    pageTex.repeat.set(1, frac);
    pageTex.offset.set(0, Math.max(0, 1 - frac - s.cur / pageH));
    if (thumb.current) {
      const th = Math.max(0.08, frac * 0.9);
      thumb.current.visible = maxScroll > 0;
      thumb.current.scale.set(0.006, th, 1);
      thumb.current.position.y = 0.45 - th / 2 - (maxScroll ? (s.cur / maxScroll) * (0.9 - th) : 0);
    }

    const t = state.clock.elapsedTime;
    const flicker = calm ? 1 : 0.93 + 0.07 * Math.sin(t * 23.0) * Math.sin(t * 3.1);
    const a = fade.current * flicker;
    if (pageMat.current) pageMat.current.opacity = a;
    if (frameMat.current) frameMat.current.opacity = a;
    if (thumb.current) (thumb.current.material as THREE.MeshBasicMaterial).opacity = 0.85 * a;
    if (scan.current) {
      scan.current.visible = !calm;
      scan.current.position.y = 0.5 - ((t * 0.22) % 1);
      (scan.current.material as THREE.MeshBasicMaterial).opacity = 0.1 * fade.current;
    }
  });

  const light = theme === "light";
  const blending = light ? THREE.NormalBlending : THREE.AdditiveBlending;
  const accent = light ? "#e8650a" : "#ff8a2a";
  return (
    <group ref={group} visible={false} renderOrder={5}>
      <mesh raycast={noRaycast} renderOrder={5}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial ref={pageMat} map={pageTex} transparent depthWrite={false} toneMapped={false} fog={false} blending={blending} />
      </mesh>
      <mesh raycast={noRaycast} renderOrder={6} position-z={0.0005}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial ref={frameMat} map={frameTex} transparent depthWrite={false} toneMapped={false} fog={false} blending={blending} />
      </mesh>
      <mesh ref={thumb} raycast={noRaycast} renderOrder={7} position={[0.5 - 0.022, 0, 0.001]}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={accent} transparent depthWrite={false} toneMapped={false} fog={false} blending={blending} />
      </mesh>
      <mesh ref={scan} raycast={noRaycast} renderOrder={6} scale={[1, 0.012, 1]} position-z={0.001}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={accent} transparent depthWrite={false} toneMapped={false} fog={false} blending={blending} />
      </mesh>
    </group>
  );
}
