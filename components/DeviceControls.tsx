"use client";

import { setHoverTarget, clearHoverTarget } from "@/lib/pointerFx";
import { useMemo, useRef } from "react";
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
  const linkClicks = useRef<number[]>([]);
  const logoClicks = useRef<number[]>([]);
  const lastWheel = useRef(0);

  return useMemo(() => {
    /** Keep orbiting off while a control is held (focus mode keeps it off anyway). */
    const holdControls = () => {
      if (!controls) return;
      controls.enabled = false;
      const release = () => {
        if (!useDevice.getState().screenFocus) controls.enabled = true;
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

    return {
      onPointerOver: (e: ThreeEvent<PointerEvent>) => {
        const r = resolve(e.object);
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
        const r = resolve(e.object);
        if (!r) return;
        e.stopPropagation();
        holdControls();
        if (r.id === "touchpad") { focusScreen(); startGesture(e, "touchpad"); }
        if (r.id === "display" && e.object.name === SCREEN_MESH_NAME) {
          if (!useDevice.getState().screenFocus) { focusScreen(); return; } // first tap only brings the screen up
          startGesture(e, "screen");
        }
      },
      onWheel: (e: ThreeEvent<WheelEvent>) => {
        const r = resolve(e.object);
        if (!r || r.id !== "wheel") return;
        e.stopPropagation();
        const now = performance.now();
        if (now - lastWheel.current < 140) return;
        lastWheel.current = now;
        const dir = Math.sign(e.deltaY) || 1;
        focusScreen();
        spinWheel(r.node, dir);
        screenOS.nav(dir > 0 ? "down" : "up");
      },
      onClick: (e: ThreeEvent<MouseEvent>) => {
        const r = resolve(e.object);
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
