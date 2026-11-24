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

/** Window placement in the hero view: NDC centre, NDC height, width/height, depth behind target, yaw. */
const PLACE: Record<HoloLayout, { nx: number; ny: number; h: number; aspect: number; back: number; yaw: number }> = {
  side: { nx: 0.63, ny: -0.01, h: 1.55, aspect: 0.6, back: 1.1, yaw: -0.2 },
  top: { nx: 0.0, ny: 0.56, h: 0.6, aspect: 1.45, back: 0.9, yaw: 0 },
};

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

  // Panel pose in the hero view, as an offset from the hero target (scale 1 = hero distance).
  const base = useMemo(() => {
    const d0 = heroDistance(aspect);
    const T = new THREE.Vector3(...HERO_TARGET);
    const dir = new THREE.Vector3(...HERO_DIRECTION).normalize();
    const cam = T.clone().addScaledVector(dir, d0);
    const fwd = dir.clone().negate();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, fwd);
    const D = d0 + place.back;
    const tanH = Math.tan(THREE.MathUtils.degToRad(fovFor(aspect) / 2));
    const centre = cam.clone().addScaledVector(fwd, D)
      .addScaledVector(right, place.nx * D * tanH * aspect)
      .addScaledVector(up, place.ny * D * tanH);
    const hgt = place.h * D * tanH;
    const o = new THREE.Object3D();
    o.position.copy(centre);
    o.lookAt(cam);
    o.rotateY(place.yaw);
    return { offset: centre.sub(T), quat: o.quaternion.clone(), w: hgt * place.aspect, h: hgt, d0 };
  }, [aspect, place]);

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
      g.worldToLocal(hit);
      return Math.abs(hit.x) <= 0.5 && Math.abs(hit.y) <= 0.5;
    };
    const by = (px: number) => { scroll.current.target = THREE.MathUtils.clamp(scroll.current.target + px, 0, maxScroll); };

    const onWheel = (e: WheelEvent) => {
      if (!over(e.clientX, e.clientY)) return;
      e.preventDefault(); e.stopImmediatePropagation();
      by((e.deltaMode === 1 ? e.deltaY * 40 : e.deltaY) * 1.4);
    };
    let drag: { id: number; y: number; px: number } | null = null;
    const onDown = (e: PointerEvent) => {
      if (e.target !== el || !over(e.clientX, e.clientY)) return;
      e.stopImmediatePropagation();       // keep OrbitControls / device controls out of it
      const r = el.getBoundingClientRect();
      // page px per screen px: the window shows viewH page px across the panel's on-screen height
      const g = group.current!;
      const top = g.localToWorld(new THREE.Vector3(0, 0.5, 0)).project(camera);
      const bot = g.localToWorld(new THREE.Vector3(0, -0.5, 0)).project(camera);
      const screenH = Math.abs(top.y - bot.y) * 0.5 * r.height || 1;
      drag = { id: e.pointerId, y: e.clientY, px: viewH / screenH };
    };
    const onMove = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      e.stopImmediatePropagation();
      by((drag.y - e.clientY) * drag.px);
      drag.y = e.clientY;
    };
    const onUp = (e: PointerEvent) => { if (drag && e.pointerId === drag.id) { e.stopImmediatePropagation(); drag = null; } };
    window.addEventListener("wheel", onWheel, { capture: true, passive: false });
    window.addEventListener("pointerdown", onDown, true);
    window.addEventListener("pointermove", onMove, true);
    window.addEventListener("pointerup", onUp, true);
    window.addEventListener("pointercancel", onUp, true);
    if (process.env.NODE_ENV !== "production") Object.assign(window, { __n01holo: { scroll: scroll.current, over, maxScroll, viewH } });
    return () => {
      window.removeEventListener("wheel", onWheel, true);
      window.removeEventListener("pointerdown", onDown, true);
      window.removeEventListener("pointermove", onMove, true);
      window.removeEventListener("pointerup", onUp, true);
      window.removeEventListener("pointercancel", onUp, true);
    };
  }, [gl, camera, maxScroll, viewH]);

  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const want = open && !immersive ? 1 : 0;
    fade.current += (want - fade.current) * Math.min(1, dt * 6);
    g.visible = fade.current > 0.01;
    if (!g.visible) return;
    target.copy(controls?.target ?? new THREE.Vector3(...HERO_TARGET));
    const k = camera.position.distanceTo(target) / base.d0;
    g.position.copy(target).addScaledVector(base.offset, k);
    g.quaternion.copy(base.quat);
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
