"use client";

/**
 * AmbientGraph — a very faint screen-space "coordinate environment" behind the N-01:
 * fine grid, a few softly glowing nodes with thin links, drifting dust and two sparse
 * tracking brackets. Everything is drawn by three small shader objects inside the existing
 * WebGL render (no extra canvas, no DOM work per frame).
 *
 *  - Lives on render layer 1, so the floor reflection, contact shadows and shadow maps
 *    (all layer 0 cameras) never see it, and the raycaster ignores it.
 *  - Drawn last with a stencil test: the device writes stencil = 1, the graph only draws
 *    where stencil != 1, so it never paints over the N-01 itself.
 *  - Reduced motion → static (no drift / twinkle / marker hops). Low-power / phones → fewer
 *    nodes, no tracking brackets.
 */
import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useDevice } from "@/lib/store";

export const GRAPH_LAYER = 1;
const STENCIL_REF = 1;

/* ---------- stencil: mark the device so the graph stays behind it ---------- */
function markStencil(root: THREE.Object3D) {
  root.traverse((o) => {
    const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
    if (!m) return;
    for (const mat of Array.isArray(m) ? m : [m]) {
      if (mat.stencilWrite && mat.stencilZPass === THREE.ReplaceStencilOp) continue;
      mat.stencilWrite = true;
      mat.stencilRef = STENCIL_REF;
      mat.stencilFunc = THREE.AlwaysStencilFunc;
      mat.stencilZPass = THREE.ReplaceStencilOp;
    }
  });
}

function behindDevice<T extends THREE.Material>(m: T): T {
  m.transparent = true;
  m.depthTest = false;
  m.depthWrite = false;
  m.stencilWrite = true; // enables the stencil test
  m.stencilWriteMask = 0x00; // …but never modifies the buffer
  m.stencilRef = STENCIL_REF;
  m.stencilFunc = THREE.NotEqualStencilFunc;
  return m;
}

/* ---------- shaders (positions are given directly in clip space) ---------- */
const GRID_VS = /* glsl */ `void main(){ gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const GRID_FS = /* glsl */ `
uniform vec2 uRes; uniform float uDpr; uniform vec2 uOffset; uniform float uOpacity;
float lineAA(vec2 p, float cell){ vec2 g = abs(fract(p / cell - 0.5) - 0.5) * cell; return 1.0 - smoothstep(0.0, 1.0, min(g.x, g.y)); }
void main(){
  vec2 px = gl_FragCoord.xy / uDpr + uOffset;            // CSS pixels
  float minor = lineAA(px, 64.0);
  float major = lineAA(px, 256.0);
  // tiny cross ticks on major intersections
  vec2 gm = abs(fract(px / 256.0 - 0.5) - 0.5) * 256.0;
  float tick = (1.0 - smoothstep(0.0, 1.0, min(gm.x, gm.y))) * step(max(gm.x, gm.y), 5.0);
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 c = (uv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  float r = length(c);
  float mask = mix(0.35, 1.0, smoothstep(0.18, 0.75, r));        // quieter around the device
  mask *= 1.0 - smoothstep(0.42, 0.5, abs(uv.y - 0.5));          // soft top/bottom fade
  float a = (minor * 0.022 + major * 0.03 + tick * 0.09) * mask * uOpacity;
  gl_FragColor = vec4(0.86, 0.88, 0.92, a);
}`;

const POINT_VS = /* glsl */ `
attribute float aSize; attribute float aAlpha; uniform float uDpr; varying float vAlpha;
void main(){ vAlpha = aAlpha; gl_PointSize = aSize * uDpr; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const POINT_FS = /* glsl */ `
uniform float uOpacity; varying float vAlpha;
void main(){
  vec2 d = gl_PointCoord - 0.5; float r2 = dot(d, d) * 4.0;   // 0 centre … 1 edge
  float core = exp(-r2 * 60.0); float glow = exp(-r2 * 7.0) * 0.32;
  float a = (core + glow) * vAlpha * uOpacity;
  if (a < 0.003) discard;
  gl_FragColor = vec4(1.0, 0.97, 0.93, a);
}`;

const LINE_VS = /* glsl */ `
attribute float aAlpha; varying float vAlpha;
void main(){ vAlpha = aAlpha; gl_Position = vec4(position.xy, 0.0, 1.0); }`;
const LINE_FS = /* glsl */ `
uniform float uOpacity; varying float vAlpha;
void main(){ gl_FragColor = vec4(0.88, 0.9, 0.94, vAlpha * uOpacity); }`;

/* ---------- model ---------- */
type Node = { x: number; y: number; vx: number; vy: number; depth: number; size: number; base: number; phase: number; link: boolean };
type Dust = { x: number; y: number; vx: number; vy: number; size: number; base: number };
type Marker = { node: number; x: number; y: number; acquire: number; next: number };

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const LINK_PX = 210;
const MAX_LINKS = 2;
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function AmbientGraph({ lowPower }: { lowPower: boolean }) {
  const { camera, gl } = useThree();
  const modelRoot = useDevice((s) => s.modelRoot);
  const still = useMemo(reducedMotion, []);
  const NODES = lowPower ? 14 : 26;
  const DUST = lowPower ? 18 : 44;
  const MARKERS = lowPower ? 0 : 2;
  const SEGS = NODES * MAX_LINKS + MARKERS * 8;

  // camera sees layer 1 as well; every other camera (reflection, shadows) stays on layer 0
  useEffect(() => {
    camera.layers.enable(GRAPH_LAYER);
  }, [camera]);

  // keep the device stencil-marked (screen mesh / material clones appear after load)
  useEffect(() => {
    if (!modelRoot) return;
    markStencil(modelRoot);
    const id = window.setInterval(() => markStencil(modelRoot), 1500);
    return () => window.clearInterval(id);
  }, [modelRoot]);

  const sim = useMemo(() => {
    const W = typeof window !== "undefined" ? window.innerWidth : 1440;
    const H = typeof window !== "undefined" ? window.innerHeight : 900;
    const nodes: Node[] = Array.from({ length: NODES }, () => ({
      x: rand(0, W), y: rand(0, H), vx: rand(-5, 5), vy: rand(-3.5, 3.5), depth: rand(0.35, 1),
      size: rand(11, 19), base: Math.random() < 0.25 ? rand(0.55, 0.75) : rand(0.25, 0.45), phase: rand(0, 6.28), link: Math.random() < 0.65,
    }));
    const dust: Dust[] = Array.from({ length: DUST }, () => ({
      x: rand(0, W), y: rand(0, H), vx: rand(-2, 2), vy: rand(-7, -2), size: rand(3, 5), base: rand(0.1, 0.22),
    }));
    const markers: Marker[] = Array.from({ length: MARKERS }, (_, i) => ({ node: i * 7 % NODES, x: 0, y: 0, acquire: 0, next: rand(4, 9) }));
    return { nodes, dust, markers, offset: new THREE.Vector2(), shift: new THREE.Vector2(), shiftTarget: new THREE.Vector2(), nextShift: 14, fade: 0 };
  }, [NODES, DUST, MARKERS]);

  const objs = useMemo(() => {
    const uniforms = { uRes: { value: new THREE.Vector2(1, 1) }, uDpr: { value: 1 }, uOffset: { value: new THREE.Vector2() }, uOpacity: { value: 0 } };

    const grid = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      behindDevice(new THREE.ShaderMaterial({ vertexShader: GRID_VS, fragmentShader: GRID_FS, uniforms: { uRes: uniforms.uRes, uDpr: uniforms.uDpr, uOffset: uniforms.uOffset, uOpacity: uniforms.uOpacity } }))
    );

    const nPts = NODES + DUST;
    const pg = new THREE.BufferGeometry();
    pg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(nPts * 3), 3).setUsage(THREE.DynamicDrawUsage));
    pg.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(nPts), 1));
    pg.setAttribute("aAlpha", new THREE.BufferAttribute(new Float32Array(nPts), 1).setUsage(THREE.DynamicDrawUsage));
    const points = new THREE.Points(pg, behindDevice(new THREE.ShaderMaterial({ vertexShader: POINT_VS, fragmentShader: POINT_FS, uniforms: { uDpr: uniforms.uDpr, uOpacity: uniforms.uOpacity } })));

    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.BufferAttribute(new Float32Array(SEGS * 2 * 3), 3).setUsage(THREE.DynamicDrawUsage));
    lg.setAttribute("aAlpha", new THREE.BufferAttribute(new Float32Array(SEGS * 2), 1).setUsage(THREE.DynamicDrawUsage));
    const lines = new THREE.LineSegments(lg, behindDevice(new THREE.ShaderMaterial({ vertexShader: LINE_VS, fragmentShader: LINE_FS, uniforms: { uOpacity: uniforms.uOpacity } })));

    const group = new THREE.Group();
    group.name = "N01_AmbientGraph";
    [grid, lines, points].forEach((o, i) => {
      o.frustumCulled = false;
      o.renderOrder = 1000 + i; // after every transparent object, so the device stencil is complete
      o.layers.set(GRAPH_LAYER);
      o.raycast = () => {};
      group.add(o);
    });
    group.layers.set(GRAPH_LAYER);
    return { group, grid, points, lines, uniforms };
  }, [NODES, DUST, SEGS]);

  useEffect(() => () => {
    objs.grid.geometry.dispose(); (objs.grid.material as THREE.Material).dispose();
    objs.points.geometry.dispose(); (objs.points.material as THREE.Material).dispose();
    objs.lines.geometry.dispose(); (objs.lines.material as THREE.Material).dispose();
  }, [objs]);

  const t = useRef(0);
  const sph = useMemo(() => new THREE.Spherical(), []);
  const buf = useMemo(() => new THREE.Vector2(), []);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    const motion = still ? 0 : dt;
    t.current += motion;
    const time = t.current;

    gl.getDrawingBufferSize(buf);
    const dpr = gl.getPixelRatio();
    const W = buf.x / dpr, H = buf.y / dpr;
    const { uniforms } = objs;
    uniforms.uRes.value.copy(buf);
    uniforms.uDpr.value = dpr;

    // fade in after load; quieter while the screen is being operated
    const s = useDevice.getState();
    const target = !s.modelRoot ? 0 : s.screenFocus ? 0.45 : 1;
    sim.fade += (target - sim.fade) * Math.min(1, dt * 1.6);
    uniforms.uOpacity.value = sim.fade;

    // parallax with the orbit + an occasional slow drift of the whole field
    sph.setFromVector3(camera.position);
    if (!still && time > sim.nextShift) {
      sim.shiftTarget.set(rand(-40, 40), rand(-24, 24));
      sim.nextShift = time + rand(16, 26);
    }
    sim.shift.lerp(sim.shiftTarget, Math.min(1, motion * 0.35));
    const px = sph.theta * 160 + sim.shift.x;
    const py = (sph.phi - 1.3) * 120 + sim.shift.y;
    uniforms.uOffset.value.set(px + time * 2.2, -py + time * 1.1);

    const toX = (x: number) => (x / W) * 2 - 1;
    const toY = (y: number) => 1 - (y / H) * 2;
    const wrap = (v: number, m: number) => ((v % m) + m) % m;

    // nodes + dust
    const pos = objs.points.geometry.getAttribute("position") as THREE.BufferAttribute;
    const size = objs.points.geometry.getAttribute("aSize") as THREE.BufferAttribute;
    const alpha = objs.points.geometry.getAttribute("aAlpha") as THREE.BufferAttribute;
    const screen: { x: number; y: number }[] = [];
    sim.nodes.forEach((n, i) => {
      n.x = wrap(n.x + n.vx * motion, W + 120);
      n.y = wrap(n.y + n.vy * motion, H + 120);
      const x = wrap(n.x - px * n.depth * 0.5, W + 120) - 60;
      const y = wrap(n.y + py * n.depth * 0.5, H + 120) - 60;
      screen.push({ x, y });
      pos.setXYZ(i, toX(x), toY(y), 0);
      size.setX(i, n.size);
      alpha.setX(i, n.base * (still ? 1 : 0.75 + 0.25 * Math.sin(time * 0.9 + n.phase)));
    });
    sim.dust.forEach((d, j) => {
      d.x = wrap(d.x + d.vx * motion, W);
      d.y = wrap(d.y + d.vy * motion, H);
      const i = NODES + j;
      pos.setXYZ(i, toX(d.x), toY(d.y), 0);
      size.setX(i, d.size);
      alpha.setX(i, d.base);
    });
    pos.needsUpdate = true; alpha.needsUpdate = true; size.needsUpdate = true;

    // links between nearby "linkable" nodes (max two per node)
    const lp = objs.lines.geometry.getAttribute("position") as THREE.BufferAttribute;
    const la = objs.lines.geometry.getAttribute("aAlpha") as THREE.BufferAttribute;
    let v = 0;
    const seg = (x0: number, y0: number, x1: number, y1: number, a: number) => {
      lp.setXYZ(v, toX(x0), toY(y0), 0); la.setX(v++, a);
      lp.setXYZ(v, toX(x1), toY(y1), 0); la.setX(v++, a);
    };
    const links = new Array(NODES).fill(0);
    for (let i = 0; i < NODES; i++) {
      if (!sim.nodes[i].link) continue;
      for (let j = i + 1; j < NODES && links[i] < MAX_LINKS; j++) {
        if (!sim.nodes[j].link || links[j] >= MAX_LINKS) continue;
        const dx = screen[i].x - screen[j].x, dy = screen[i].y - screen[j].y;
        const d = Math.hypot(dx, dy);
        if (d > LINK_PX) continue;
        seg(screen[i].x, screen[i].y, screen[j].x, screen[j].y, (1 - d / LINK_PX) * 0.15);
        links[i]++; links[j]++;
      }
    }

    // sparse tracking brackets that hop between nodes now and then
    // a node is "trackable" when it is on screen and clear of the device in the middle
    const trackable = (i: number) => {
      const q = screen[i];
      return q.x > 40 && q.x < W - 40 && q.y > 60 && q.y < H - 60 && (Math.abs(q.x - W / 2) > W * 0.3 || Math.abs(q.y - H / 2) > H * 0.34);
    };
    for (const m of sim.markers) {
      const lost = !trackable(m.node);
      if ((!still && time > m.next) || lost) {
        const taken = new Set(sim.markers.map((o) => o.node));
        const cands = sim.nodes.map((_, i) => i).filter((i) => trackable(i) && !taken.has(i));
        if (cands.length) {
          m.node = cands[Math.floor(Math.random() * cands.length)];
          m.acquire = 0;
          if (lost) { m.x = 0; m.y = 0; }
        }
        m.next = time + rand(7, 12);
      }
      if (!trackable(m.node)) continue;
      const tgt = screen[m.node];
      if (m.x === 0 && m.y === 0) { m.x = tgt.x; m.y = tgt.y; }
      const k = still ? 1 : Math.min(1, dt * 3);
      m.x += (tgt.x - m.x) * k; m.y += (tgt.y - m.y) * k;
      m.acquire = Math.min(1, m.acquire + dt * 1.5);
      const e = 1 - Math.pow(1 - m.acquire, 3);
      const h = 9 * (1.7 - 0.7 * e), arm = 4;
      const a = 0.42 * (0.35 + 0.65 * e);
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        const cx = m.x + sx * h, cy = m.y + sy * h;
        seg(cx, cy, cx - sx * arm, cy, a);
        seg(cx, cy, cx, cy - sy * arm, a);
      }
    }
    for (let k = v; k < SEGS * 2; k++) la.setX(k, 0);
    objs.lines.geometry.setDrawRange(0, v);
    lp.needsUpdate = true; la.needsUpdate = true;
  });

  return <primitive object={objs.group} />;
}
