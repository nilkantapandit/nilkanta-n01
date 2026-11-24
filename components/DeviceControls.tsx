"use client";

import { setHoverTarget, clearHoverTarget, pointerFx } from "@/lib/pointerFx";
import { useEffect, useMemo, useRef } from "react";
import { useThree, type ThreeEvent } from "@react-three/fiber";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import gsap from "gsap";
import { useDevice } from "@/lib/store";
import { CONTROL_LABELS, CONTROL_NODES, type ControlId } from "@/lib/controls";
import { screenOS, type Dir } from "@/lib/screen/screenOS";
import { deviceAudio } from "@/lib/deviceAudio";
import { flashControl, touchpadGlow } from "@/lib/deviceMaterials";
import { focusScreenInput } from "./ScreenInput";
import { backAction, focusScreen, toggleImmersive } from "@/lib/screen/actions";
import { SCREEN_MESH_NAME } from "./DeviceScreen";

/** The physical controls are the website's navigation bar: every key talks to the Screen OS. */

function resolve(obj: THREE.Object3D | null): { id: ControlId; node: THREE.Object3D } | null {
  let o: THREE.Object3D | null = obj;
  while (o) {
    const id = CONTROL_NODES[o.name];
    if (id) return { id, node: o };
    o = o.parent;
  }
  return null;
}

const _n = new THREE.Vector3(), _p = new THREE.Vector3(), _q = new THREE.Quaternion();
/** Is the display square-on enough to operate (within ~15°)? Display front = local +Z. */
function screenFacesCamera(display: THREE.Object3D, camera: THREE.Camera) {
  display.getWorldQuaternion(_q);
  _n.set(0, 0, 1).applyQuaternion(_q);
  display.getWorldPosition(_p);
  const v = camera.position.clone().sub(_p).normalize();
  return _n.dot(v) > 0.966;
}

/**
 * The control under the pointer — but only when it is the nearest thing hit. r3f also delivers
 * pointer / wheel events to objects hidden behind the first hit (e.g. the nav wheel seen through
 * the chassis from the side), which must not react.
 */
function frontControl(e: { object: THREE.Object3D; intersections: { object: THREE.Object3D }[] }) {
  const r = resolve(e.object);
  if (!r) return null;
  const front = resolve(e.intersections[0]?.object ?? null);
  return front && front.id === r.id ? r : null;
}

const basePos = new WeakMap<THREE.Object3D, THREE.Vector3>();
/** Short physical press along the key's axis + a brief orange illumination. */
function press(node: THREE.Object3D, depth = 0.0008) {
  if (!basePos.has(node)) basePos.set(node, node.position.clone());
  const b = basePos.get(node)!;
  gsap.killTweensOf(node.position);
  node.position.z = b.z;
  gsap.to(node.position, { z: b.z - depth, duration: 0.06, yoyo: true, repeat: 1, ease: "power1.out" });
  flashControl(node.name);
}

let wheelAngle = 0;
function spinWheel(node: THREE.Object3D, dir: number) {
  wheelAngle -= dir * (Math.PI / 10);
  gsap.to(node.rotation, { z: wheelAngle, duration: 0.25, ease: "power2.out" });
  flashControl(node.name);
}

export function useControlHandlers() {
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const { camera, scene, size } = useThree();
  if (process.env.NODE_ENV !== "production" && typeof window !== "undefined") {
    // dev-only: what would a click at (x, y) hit? Used by the automated browser tests.
    (window as unknown as { __n01pick?: (x: number, y: number) => unknown }).__n01pick = (x, y) => {
      const rc = new THREE.Raycaster();
      rc.setFromCamera(new THREE.Vector2((x / size.width) * 2 - 1, -(y / size.height) * 2 + 1), camera);
      const hits = rc.intersectObjects(scene.children, true).filter((h) => h.object.name).slice(0, 4);
      return hits.map((h) => ({ name: h.object.name, control: resolve(h.object)?.id ?? null, d: +h.distance.toFixed(3) }));
    };
  }
  // Scrolling over the D-pad (wheel or its centre key — hit directly, or snapped to by the sticky
  // cursor) moves the on-screen selection and NEVER zooms the camera, at any viewing angle.
  // Capture phase on window runs before OrbitControls' own wheel listener on the canvas.
  useEffect(() => {
    let last = 0;
    const onWheel = (e: WheelEvent) => {
      if (!(e.target as Element | null)?.closest?.(".canvas-wrap")) return;
      const hovered = pointerFx.target ? CONTROL_NODES[pointerFx.target.name] : undefined;
      const id = hovered ?? pointerFx.magnet?.id;
      if (id !== "wheel" && id !== "wheel-center") return;
      e.preventDefault();
      e.stopImmediatePropagation();
      const now = performance.now();
      if (now - last < 140) return;
      last = now;
      const dir = Math.sign(e.deltaY) || 1;
      const wheel = scene.getObjectByName("N01_Nav_Wheel");
      focusScreen();
      if (wheel) spinWheel(wheel, dir);
      screenOS.nav(dir > 0 ? "down" : "up");
    };
    window.addEventListener("wheel", onWheel, { capture: true, passive: false });
    return () => window.removeEventListener("wheel", onWheel, { capture: true });
  }, [scene]);

  const linkClicks = useRef<number[]>([]);
  const logoClicks = useRef<number[]>([]);

  return useMemo(() => {
    /** Keep orbiting off while a control is held (focus mode keeps it off anyway). */
    const holdControls = () => {
      if (!controls) return;
      controls.enabled = false;
      const release = () => {
        controls.enabled = true; // the camera stays free while operating the screen
        window.removeEventListener("pointerup", release);
        window.removeEventListener("pointercancel", release);
      };
      window.addEventListener("pointerup", release);
      window.addEventListener("pointercancel", release);
    };

    /**
     * Swipe / tap / long-press for the touch surface and the screen itself.
     * Direction from screen-space movement; long-press from event timestamps.
     */
    const startGesture = (e: ThreeEvent<PointerEvent>, kind: "touchpad" | "screen") => {
      const sx = e.nativeEvent.clientX, sy = e.nativeEvent.clientY, t0 = e.nativeEvent.timeStamp;
      const uv = e.uv?.clone() ?? null;
      const SWIPE_PX = e.nativeEvent.pointerType === "touch" ? 16 : 24;
      const LONG_MS = 650;
      let longFired = false;
      if (kind === "touchpad") touchpadGlow(true, 1);
      const timer = kind === "touchpad" ? window.setTimeout(() => {
        longFired = true;
        deviceAudio.play("lock");
        focusScreen();
        screenOS.openApp("secret");
      }, LONG_MS) : undefined;
      const move = (ev: PointerEvent) => { if (Math.hypot(ev.clientX - sx, ev.clientY - sy) > 12) window.clearTimeout(timer); };
      const finish = (ev: PointerEvent) => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", finish);
        window.removeEventListener("pointercancel", finish);
        window.clearTimeout(timer);
        if (kind === "touchpad") touchpadGlow(false);
        if (ev.type === "pointercancel") return;
        const dx = ev.clientX - sx, dy = ev.clientY - sy;
        const dist = Math.hypot(dx, dy);
        if (longFired) {
          if (dist <= SWIPE_PX * 1.5) return;
          if (screenOS.app === "secret") screenOS.back(); // it was a late swipe, undo the long-press
        }
        if (dist > SWIPE_PX) {
          const dir: Dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
          screenOS.nav(dir);
        } else if (kind === "touchpad" && ev.timeStamp - t0 >= LONG_MS) {
          deviceAudio.play("lock");
          screenOS.openApp("secret");
        } else if (kind === "touchpad") {
          screenOS.select();
        } else if (uv) {
          screenOS.click(uv.x, uv.y);
          if (screenOS.app === "terminal") focusScreenInput();
        }
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", finish);
      window.addEventListener("pointercancel", finish);
    };

    // Magnetic cursor: a click that lands just outside a key / the wheel is routed here.
    pointerFx.activate = (id, node, dir) => {
      switch (id) {
        case "wheel": {
          focusScreen();
          const d = dir ?? "down";
          spinWheel(node, d === "right" || d === "down" ? 1 : -1);
          screenOS.nav(d);
          break;
        }
        case "wheel-center": press(node, 0.0012); focusScreen(); screenOS.select(); break;
        case "touchpad": focusScreen(); touchpadGlow(true, 1); window.setTimeout(() => touchpadGlow(false), 180); screenOS.select(); break;
        case "btn-confirm": press(node); focusScreen(); screenOS.select(); break;
        case "btn-cancel": case "back": press(node); backAction(); break;
        case "btn-menu": press(node); focusScreen(); screenOS.menu(); break;
        case "btn-power": press(node); screenOS.power(); break;
        case "btn-fullscreen": press(node); deviceAudio.play("tick"); void toggleImmersive(); break;
        case "switch": useDevice.getState().toggleMode(); deviceAudio.play("switch"); break;
      }
    };

    return {
      onPointerOver: (e: ThreeEvent<PointerEvent>) => {
        const r = frontControl(e);
        if (!r) return;
        e.stopPropagation();
        useDevice.getState().setHoverLabel(CONTROL_LABELS[r.id]);
        setHoverTarget(r.node);
        document.body.style.cursor = "pointer";
        if (r.id === "wheel" && controls) controls.enableZoom = false;
        if (r.id === "touchpad") touchpadGlow(true, 0.5);
      },
      onPointerOut: (e: ThreeEvent<PointerEvent>) => {
        const r = resolve(e.object);
        if (!r) return;
        useDevice.getState().setHoverLabel(null);
        clearHoverTarget(r.node);
        document.body.style.cursor = "";
        if (controls) controls.enableZoom = true;
        if (r.id === "touchpad") touchpadGlow(false);
      },
      onPointerDown: (e: ThreeEvent<PointerEvent>) => {
        const r = frontControl(e);
        if (!r) return;
        e.stopPropagation();
        pointerFx.lastDirectHit = performance.now();
        holdControls();
        if (r.id === "touchpad") { focusScreen(); startGesture(e, "touchpad"); }
        if (r.id === "display" && e.object.name === SCREEN_MESH_NAME) {
          if (!useDevice.getState().screenFocus) focusScreen();
          // seen at an angle: this tap turns the view to face the screen; taps act once it faces you
          if (!screenFacesCamera(r.node, camera)) { useDevice.getState().requestFaceScreen(); return; }
          startGesture(e, "screen");
        }
      },
      onClick: (e: ThreeEvent<MouseEvent>) => {
        const r = frontControl(e);
        if (!r) return;
        if (e.delta > 6) return; // it was a drag, not a click
        e.stopPropagation();
        const s = useDevice.getState();
        switch (r.id) {
          case "display":
            if (e.object.name !== SCREEN_MESH_NAME) focusScreen(); // bezel / frame
            break; // screen surface handled by the gesture logic
          case "touchpad": break;
          case "wheel": {
            focusScreen();
            const p = r.node.worldToLocal(e.point.clone());
            const dir: Dir = Math.abs(p.x) > Math.abs(p.y) ? (p.x > 0 ? "right" : "left") : (p.y > 0 ? "up" : "down");
            spinWheel(r.node, dir === "right" || dir === "down" ? 1 : -1);
            screenOS.nav(dir);
            break;
          }
          case "wheel-center": press(r.node, 0.0012); focusScreen(); screenOS.select(); break;
          case "btn-confirm": press(r.node); focusScreen(); screenOS.select(); break;
          case "btn-cancel": press(r.node); backAction(); break;
          case "back": press(r.node); backAction(); break;
          case "btn-menu": press(r.node); focusScreen(); screenOS.menu(); break;
          case "btn-power": press(r.node); screenOS.power(); break;
          case "btn-fullscreen": press(r.node); deviceAudio.play("tick"); void toggleImmersive(); break;
          case "switch": s.toggleMode(); deviceAudio.play("switch"); break;
          case "link-led": {
            const p = r.node.worldToLocal(e.point.clone());
            if (p.y > -0.0055) break;                      // only the lowest (LINK) LED counts
            const now = e.nativeEvent.timeStamp;
            linkClicks.current = [...linkClicks.current.filter((t) => now - t < 900), now];
            if (linkClicks.current.length >= 3) { linkClicks.current = []; s.openOverlay("diagnostics"); deviceAudio.play("beep"); }
            break;
          }
          case "logo": {
            const now = e.nativeEvent.timeStamp;
            logoClicks.current = [...logoClicks.current.filter((t) => now - t < 2000), now];
            if (logoClicks.current.length >= 5) {
              logoClicks.current = [];
              s.showToast("MAKER'S MARK · \"Built one component at a time.\" — N");
              deviceAudio.play("confirm");
            }
            break;
          }
        }
      },
    };
  }, [controls, camera, scene, size]);
}
