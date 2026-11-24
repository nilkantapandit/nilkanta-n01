"use client";

/**
 * Status LEDs and the battery gauge (runtime only — the GLB is never modified).
 *
 * The GLB has one mesh per LED colour, so at load each LED / battery bar is split out of its
 * mesh into its own mesh with its own material. Every frame they are driven from the Screen OS
 * phase: dark when off, a self-test cycle while booting (chase → lamp test → each LED latches
 * on, gauge fills), simulated link activity while online, and a reverse power-down sequence.
 * All activity is a visual simulation.
 */
import * as THREE from "three";
import { useDevice } from "@/lib/store";
import { screenOS } from "@/lib/screen/screenOS";

type Led = { mat: THREE.MeshStandardMaterial; on: THREE.Color; off: THREE.Color; glow: number; v: number };

const status: Led[] = [];   // ETH0 · ETH1 · WIFI · LINK (front panel, top → bottom)
const battery: Led[] = [];  // gauge bars, empty → full
const ports: { link: Led; act: Led }[] = []; // rear ETH0 / ETH1 jacks: green link + amber activity

const GREEN = new THREE.Color("#22f05a"), BLUE = new THREE.Color("#2b8cff"), ORANGE = new THREE.Color("#ff7a1a"), AMBER = new THREE.Color("#ffb02e");
const BAR_ON = new THREE.Color("#22e050"), BAR_OFF = new THREE.Color("#0d2414");
const BLACK = new THREE.Color(0, 0, 0);
const BATTERY_LEVEL = 6; // simulated charge: 6 of 7 bars

/** Split an indexed geometry into its connected islands (shared / coincident vertices = connected). */
function islands(geo: THREE.BufferGeometry): THREE.BufferGeometry[] {
  const pos = geo.getAttribute("position");
  const index = geo.getIndex();
  if (!index) return [geo];
  const n = pos.count;
  const parent = new Int32Array(n).map((_, i) => i);
  const find = (x: number): number => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
  const unite = (a: number, b: number) => { const ra = find(a), rb = find(b); if (ra !== rb) parent[ra] = rb; };
  const seen = new Map<string, number>();
  for (let i = 0; i < n; i++) {
    const k = `${pos.getX(i).toFixed(5)},${pos.getY(i).toFixed(5)},${pos.getZ(i).toFixed(5)}`;
    const j = seen.get(k);
    if (j === undefined) seen.set(k, i); else unite(i, j);
  }
  for (let t = 0; t < index.count; t += 3) { unite(index.getX(t), index.getX(t + 1)); unite(index.getX(t), index.getX(t + 2)); }
  const groups = new Map<number, number[]>();
  for (let t = 0; t < index.count; t += 3) {
    const r = find(index.getX(t));
    const g = groups.get(r) ?? [];
    g.push(index.getX(t), index.getX(t + 1), index.getX(t + 2));
    groups.set(r, g);
  }
  return [...groups.values()].map((tri) => {
    const g = geo.clone();
    g.setIndex(tri);
    g.computeBoundingBox();
    g.computeBoundingSphere();
    return g;
  });
}

const centre = (g: THREE.BufferGeometry) => g.boundingBox!.getCenter(new THREE.Vector3());

function makeLed(mesh: THREE.Mesh, geo: THREE.BufferGeometry, on: THREE.Color, off: THREE.Color | null, glow: number): Led {
  const src = mesh.material as THREE.MeshStandardMaterial;
  const mat = src.clone();
  mat.userData.n01Led = true;
  mat.toneMapped = false; // keep LED colours saturated (no filmic roll-off to white)
  const m = new THREE.Mesh(geo, mat);
  m.name = mesh.name + "_led";
  m.position.copy(mesh.position); m.quaternion.copy(mesh.quaternion); m.scale.copy(mesh.scale);
  m.raycast = () => {};
  mesh.parent!.add(m);
  return { mat, on: on.clone(), off: (off ?? src.color).clone(), glow, v: 0 };
}

/** Find the mesh of `node` drawn with material `matName` (GLB primitives become child meshes). */
function meshOf(root: THREE.Object3D, node: string, matName: string): THREE.Mesh | null {
  let hit: THREE.Mesh | null = null;
  root.getObjectByName(node)?.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && !Array.isArray(m.material) && m.material.name === matName && !m.name.endsWith("_led")) hit = m;
  });
  return hit;
}

/** Call once per loaded model, before initDeviceMaterials (so these materials are left to us). */
export function setupLeds(root: THREE.Object3D) {
  status.length = 0; battery.length = 0; ports.length = 0;
  const done = root.userData.n01Leds as { status: Led[]; battery: Led[]; ports: { link: Led; act: Led }[] } | undefined;
  if (done) { status.push(...done.status); battery.push(...done.battery); ports.push(...done.ports); return; } // Strict Mode re-run

  // front panel: two green (ETH0 top, ETH1), blue (WI-FI), orange (LINK)
  const green = meshOf(root, "N01_Eth_Indicator_LEDs", "N01_Mat_LED_Green");
  const blue = meshOf(root, "N01_Eth_Indicator_LEDs", "N01_Mat_LED_Blue");
  const orange = meshOf(root, "N01_Eth_Indicator_LEDs", "N01_Mat_Orange_Light");
  if (green && blue && orange) {
    const g = islands(green.geometry).sort((a, b) => centre(b).y - centre(a).y);
    g.forEach((geo) => status.push(makeLed(green, geo, GREEN, null, 1)));
    status.push(makeLed(blue, blue.geometry, BLUE, null, 1));
    status.push(makeLed(orange, orange.geometry, ORANGE, null, 1));
    green.visible = blue.visible = orange.visible = false;
  }

  // battery gauge: the diagonal bars of the status strip, ordered left → right
  const strip = meshOf(root, "N01_Status_LED_Strip", "N01_Mat_LED_Green");
  if (strip) {
    islands(strip.geometry).sort((a, b) => centre(a).x - centre(b).x)
      .forEach((geo) => battery.push(makeLed(strip, geo, BAR_ON, BAR_OFF, 1)));
    strip.visible = false;
  }

  // rear Ethernet jacks
  for (const node of ["N01_ETH0_Link_LEDs", "N01_ETH1_Link_LEDs"]) {
    const l = meshOf(root, node, "N01_Mat_LED_Green");
    const a = meshOf(root, node, "N01_Mat_LED_Amber");
    if (!l || !a) continue;
    ports.push({ link: makeLed(l, l.geometry, GREEN, null, 1), act: makeLed(a, a.geometry, AMBER, null, 1) });
    l.visible = a.visible = false;
  }
  root.userData.n01Leds = { status: [...status], battery: [...battery], ports: [...ports] };
}

/* ------------------------------------------------------------------ animation */
const hash = (n: number) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
/** Bursty network activity: true ≈ `busy` of the time, flickering in 1 / rate second slots. */
const activity = (t: number, seed: number, rate: number, busy: number) => {
  const burst = hash(Math.floor(t * 0.7) + seed * 31) < busy + 0.25;   // traffic comes in bursts
  return burst ? hash(Math.floor(t * rate) + seed * 17) > 0.42 : hash(Math.floor(t * rate) + seed) > 0.93;
};
const calm = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function apply(l: Led, target: number, dt: number) {
  // LEDs snap on and fade off slightly (phosphor-free, but not a hard cut)
  l.v = target > l.v ? target : l.v + (target - l.v) * Math.min(1, dt * 22);
  l.mat.emissive.copy(l.on);
  l.mat.emissiveIntensity = l.glow * l.v;
  l.mat.color.copy(l.off).lerp(BLACK, l.v); // lit: pure LED colour; unlit: the lens colour
}

/** Exposed for tests / debugging: current LED levels. */
export const ledState = () => ({ status: status.map((l) => +l.v.toFixed(2)), battery: battery.map((l) => +l.v.toFixed(2)), ports: ports.map((p) => [+p.link.v.toFixed(2), +p.act.v.toFixed(2)]) });

// boot timeline (matches screenOS: backlight 0.9 · BIOS 3.5 · checks 4.8 · linux 6.0 · online 7.1)
export function updateLeds(t: number, dt: number) {
  if (!status.length && !battery.length) return;
  const os = screenOS;
  const phase = os.phase;
  const s = useDevice.getState();
  const still = calm();
  const st = [0, 0, 0, 0];
  const nb = battery.length;
  let bars = 0, barBlink = -1;
  const port = [[0, 0], [0, 0]];

  if (phase === "booting") {
    const b = os.bootClock;
    if (b < 0.9) { /* backlight warming: dark */ }
    else if (b < 3.5) {
      // chase: one LED at a time, round and round · gauge fills bar by bar, the newest one blinking
      st[Math.floor((b - 0.9) / 0.13) % 4] = 1;
      bars = Math.min(nb, Math.floor((b - 0.9) / 0.3));
      if (bars < nb) barBlink = bars;
      port[0][Math.floor(b * 6) % 2] = 1; port[1][Math.floor(b * 6 + 1) % 2] = 1;
    } else if (b < 4.8) {
      // lamp test: everything flashes together
      const on = Math.floor((b - 3.5) * 5) % 2 === 0 ? 1 : 0;
      st.fill(on); bars = on ? nb : 0; port[0] = [on, on]; port[1] = [on, on];
    } else {
      // NETWORK LINKS check: each LED latches on in turn; gauge settles to the charge level
      for (let i = 0; i < 4; i++) st[i] = b >= 4.8 + i * 0.28 ? 1 : 0;
      bars = Math.max(BATTERY_LEVEL, nb - Math.floor((b - 4.8) / 0.35));
      port[0] = [1, b > 5.2 ? 1 : 0]; port[1] = [1, b > 5.5 ? 1 : 0];
    }
  } else if (phase === "online") {
    const secure = s.mode === "secure";
    const tx = !secure && s.transmitting;
    st[0] = still || activity(t, 1, 14, 0.55) ? 1 : 0.15;                      // ETH0: busy uplink
    st[1] = still || activity(t, 2, 9, 0.2) ? 1 : 0.15;                        // ETH1: quieter
    st[2] = secure ? 0 : still ? 1 : tx ? (Math.floor(t * 9) % 2 ? 1 : 0.1)    // WI-FI: off in SECURE, fast while TX
      : (t % 1.4 < 0.18 || activity(t, 3, 12, 0.1) ? 1 : 0.25);
    const hb = t % 2;                                                          // LINK: heartbeat (double blink)
    st[3] = still ? 1 : secure ? 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1)) : (hb < 0.12 || (hb > 0.26 && hb < 0.38) ? 1 : 0.45);
    bars = BATTERY_LEVEL;
    if (!still && Math.sin(t * 1.6) > 0.2) barBlink = -1;                      // top bar breathes below
    port[0] = [1, still || activity(t, 4, 16, 0.55) ? 1 : 0];
    port[1] = [1, still || activity(t, 5, 11, 0.2) ? 1 : 0];
  } else if (phase === "shutdown") {
    const k = os.shutClock;
    for (let i = 0; i < 4; i++) st[i] = k < 0.35 + (3 - i) * 0.3 ? 1 : 0;      // LINK → ETH0 go dark
    bars = Math.max(0, Math.min(BATTERY_LEVEL, Math.ceil(BATTERY_LEVEL - k * 4)));
    port[0] = [k < 1.4 ? 1 : 0, 0]; port[1] = [k < 1.6 ? 1 : 0, 0];
  }

  status.forEach((l, i) => apply(l, st[i] ?? 0, dt));
  battery.forEach((l, i) => {
    let v = i < bars ? 1 : 0;
    if (i === barBlink) v = Math.floor(t * 6) % 2 ? 1 : 0;
    if (phase === "online" && i === bars - 1 && !still) v = 0.55 + 0.45 * (0.5 + 0.5 * Math.sin(t * 1.6));
    apply(l, v, dt);
  });
  ports.forEach((p, i) => { apply(p.link, port[i]?.[0] ?? 0, dt); apply(p.act, port[i]?.[1] ?? 0, dt); });
}
