"use client";

import * as THREE from "three";

/**
 * Runtime-only material controller. It never edits the GLB: it remembers each emissive
 * material's original colour/intensity at load and derives the live values every frame from
 * power level, touch glow, operating mode, transmit state and per-key press illumination.
 */
type Entry = { mat: THREE.MeshStandardMaterial; baseIntensity: number; baseEmissive: THREE.Color };
const entries = new Map<string, Entry[]>();

/** Per-control press illumination (cloned materials, so one key can light up on its own). */
type Flash = { mats: THREE.MeshStandardMaterial[]; base: { c: THREE.Color; i: number }[]; v: number };
const flashes = new Map<string, Flash>();

const state = { power: 0, glow: 0, glowTarget: 0, modeMix: 0, modeTarget: 0, tx: false };

const SECURE_LED = new THREE.Color(1.0, 0.55, 0.08);
const SECURE_SCREEN = new THREE.Color(0.5, 0.06, 0.0);
const PRESS = new THREE.Color(1.0, 0.42, 0.08);
const _c = new THREE.Color();

/**
 * Give each listed control node its own material instances (runtime clones) so it can be
 * illuminated individually. Must run before initDeviceMaterials.
 */
export function prepareControlMaterials(root: THREE.Object3D, nodeNames: string[]) {
  flashes.clear();
  for (const name of nodeNames) {
    const node = root.getObjectByName(name);
    if (!node) continue;
    const mats: THREE.MeshStandardMaterial[] = [];
    node.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh) return;
      const cloneOne = (m: THREE.Material) => {
        const c = (m as THREE.MeshStandardMaterial).clone();
        mats.push(c);
        return c;
      };
      mesh.material = Array.isArray(mesh.material) ? mesh.material.map(cloneOne) : cloneOne(mesh.material);
    });
    flashes.set(name, { mats, base: mats.map((m) => ({ c: m.emissive.clone(), i: m.emissiveIntensity })), v: 0 });
  }
}

export function initDeviceMaterials(root: THREE.Object3D) {
  entries.clear();
  // The baked "terminal artwork" text mesh is replaced by the live screen — hide it (runtime only).
  const ui = root.getObjectByName("N01_Display_UI");
  if (ui) ui.visible = false;
  const seen = new Set<THREE.Material>();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      const sm = m as THREE.MeshStandardMaterial;
      if (!sm.isMeshStandardMaterial || seen.has(sm) || sm.userData.n01Led) continue;
      seen.add(sm);
      if (sm.emissive && sm.emissive.r + sm.emissive.g + sm.emissive.b > 0.001) {
        const list = entries.get(sm.name) ?? [];
        list.push({ mat: sm, baseIntensity: sm.emissiveIntensity, baseEmissive: sm.emissive.clone() });
        entries.set(sm.name, list);
      }
    }
  });
  let n = 0;
  entries.forEach((l) => (n += l.length));
  return n;
}

export const setPowerLevel = (v: number) => { state.power = THREE.MathUtils.clamp(v, 0, 1); };
export const getPowerLevel = () => state.power;
export const touchpadGlow = (on: boolean, amount = 1) => { state.glowTarget = on ? amount : 0; };
export const setModeTarget = (secure: boolean) => { state.modeTarget = secure ? 1 : 0; };
export const setTransmitGlow = (on: boolean) => { state.tx = on; };
export const emissiveMaterialCount = () => { let n = 0; entries.forEach((l) => (n += l.length)); return n; };
/** Light up one physical control briefly (subtle orange illumination on press). */
export const flashControl = (nodeName: string) => { const f = flashes.get(nodeName); if (f) f.v = 1; };

/** Called once per frame from the scene. */
export function updateDeviceMaterials(t: number, dt: number) {
  const k = 1 - Math.exp(-dt * 5);
  state.glow += (state.glowTarget - state.glow) * k;
  state.modeMix += (state.modeTarget - state.modeMix) * (1 - Math.exp(-dt * 2.5));
  for (const [name, list] of entries) {
    for (const e of list) {
      let mul = state.power;
      _c.copy(e.baseEmissive);
      switch (name) {
        case "N01_Mat_Touchpad_Edge_Glow":
          mul *= 1 + state.glow * 3.5;
          break;
        case "N01_Mat_LED_Green":
          _c.lerp(SECURE_LED, state.modeMix);
          mul *= 1 - state.modeMix * (0.3 + 0.25 * Math.sin(t * 2.2));
          break;
        case "N01_Mat_Display_Amber_BG":
          _c.lerp(SECURE_SCREEN, state.modeMix * 0.6);
          mul *= 1 - state.modeMix * 0.2;
          break;
        case "N01_Mat_Orange_Light":
          if (state.tx) mul *= 0.55 + 0.9 * Math.abs(Math.sin(t * 16));
          break;
      }
      e.mat.emissive.copy(_c);
      e.mat.emissiveIntensity = e.baseIntensity * mul;
    }
  }
  // press illumination on top of the computed values
  for (const f of flashes.values()) {
    if (f.v <= 0.001) continue;
    f.v = Math.max(0, f.v - dt * 3.2);
    const a = f.v * f.v;
    f.mats.forEach((m, i) => {
      const b = f.base[i];
      if (b.c.r + b.c.g + b.c.b <= 0.001) {
        // normally non-emissive (rubber / plastic): drive the glow directly
        m.emissive.copy(PRESS);
        m.emissiveIntensity = 0.9 * a;
      } else {
        // emissive (icons): already reset this frame by the loop above, add the press on top
        m.emissive.lerp(PRESS, a);
        m.emissiveIntensity = Math.max(m.emissiveIntensity, 1.6 * a);
      }
    });
    if (f.v === 0) f.mats.forEach((m, i) => {
      // non-tracked (non-emissive) materials return to their original state
      if (f.base[i].c.r + f.base[i].c.g + f.base[i].c.b <= 0.001) { m.emissive.copy(f.base[i].c); m.emissiveIntensity = f.base[i].i; }
    });
  }
}

/* ------------------------------------------------------------------ light shell (theme) */
/**
 * Light theme: the charcoal shell turns Flipper-white at runtime (orange parts, keys, bezel and
 * LEDs keep their colours). Original colours are kept on each material, so switching back is exact.
 * The GLB itself is never modified.
 */
const SHELL_LIGHT: Record<string, string> = {
  N01_Mat_Chassis_Charcoal: "#e8e6e1",
  N01_Mat_Brushed_Dark_Metal: "#cfccc6",
  N01_Mat_Corner_Rubber: "#b9b6b0",
  N01_Mat_Label_Grey: "#4a4b4f",
};
export function setShellTheme(root: THREE.Object3D, light: boolean) {
  root.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (!m) return;
    for (const mat of Array.isArray(m) ? m : [m]) {
      const target = SHELL_LIGHT[mat.name];
      const std = mat as THREE.MeshStandardMaterial;
      if (!target || !std.color) continue;
      if (!std.userData.n01BaseColor) std.userData.n01BaseColor = std.color.getHex();
      std.color.set(light ? target : std.userData.n01BaseColor);
    }
  });
}
