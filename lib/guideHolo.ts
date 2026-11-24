/**
 * Draws the "field manual" (how-to) onto a canvas for the in-scene hologram panel.
 * Two layouts: "side" (tall panel beside the device on wide screens) and "top"
 * (compact panel above the device on portrait / phone screens).
 */
export type HoloLayout = "side" | "top";

const MONO = `"JetBrains Mono", ui-monospace, Menlo, Consolas, monospace`;
const f = (px: number, w = 400) => `${w} ${px}px ${MONO}`;

export const HOLO_WIDTH: Record<HoloLayout, number> = { side: 1000, top: 1400 };

type Pal = { ink: string; dim: string; hot: string; faint: string; fill: string; glow: string; badgeInk: string };
const PAL: Record<"dark" | "light", Pal> = {
  dark: { ink: "#ffd2a1", dim: "rgba(255,190,130,0.72)", hot: "#ff8a2a", faint: "rgba(255,150,70,0.16)", fill: "rgba(255,120,30,0.07)", glow: "rgba(255,130,40,0.85)", badgeInk: "#1a0d02" },
  light: { ink: "#8a3a00", dim: "rgba(150,70,10,0.82)", hot: "#e8650a", faint: "rgba(232,101,10,0.18)", fill: "rgba(232,101,10,0.06)", glow: "rgba(232,101,10,0)", badgeInk: "#ffffff" },
};

const STEPS = [
  "Press ⏻ (middle key below the screen)",
  "Click the screen to start using it",
  "Pick an app: click it, or wheel + ✓",
  "✕ / Esc = back · TERMINAL: type help",
];
const PARTS: [string, string, string][] = [
  ["1", "Screen", "click to use · click items to open"],
  ["2", "Wheel", "click a side or scroll: up / down"],
  ["3", "Centre ✓", "open the highlighted item"],
  ["4", "✕ ↺", "go back one step"],
  ["5", "≡", "main menu"],
  ["6", "⏻", "boot · press again to shut down"],
  ["7", "⛶", "fullscreen"],
  ["8", "Touch pad", "swipe to move · tap to select"],
  ["9", "Mode switch", "FIELD_COMMS ⇄ SECURE_MODE"],
];

function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number) {
  const out: string[] = [];
  let line = "";
  for (const w of text.split(" ")) {
    const t = line ? line + " " + w : w;
    if (ctx.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t;
  }
  if (line) out.push(line);
  return out;
}

/** Rough wireframe of the device face (600 × 300 units), numbered like PARTS. */
function schematic(ctx: CanvasRenderingContext2D, p: Pal, x: number, y: number, s: number) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  // grid
  ctx.strokeStyle = p.faint; ctx.lineWidth = 1 / s;
  ctx.beginPath();
  for (let gx = 0; gx <= 600; gx += 20) { ctx.moveTo(gx, 0); ctx.lineTo(gx, 300); }
  for (let gy = 0; gy <= 300; gy += 20) { ctx.moveTo(0, gy); ctx.lineTo(600, gy); }
  ctx.stroke();
  const stroke = (path: Path2D | (() => void), c = p.dim, w = 1.6) => {
    ctx.strokeStyle = c; ctx.lineWidth = w;
    if (path instanceof Path2D) ctx.stroke(path); else { ctx.beginPath(); path(); ctx.stroke(); }
  };
  ctx.fillStyle = p.fill;
  const body = new Path2D("M70 52 H520 L560 92 V232 L530 262 H70 L40 232 V92 Z");
  ctx.fill(body); stroke(body, p.ink, 2);
  stroke(new Path2D("M470 52 V30 H520 V52"));
  stroke(() => ctx.rect(92, 42, 40, 10), p.hot, 2);
  stroke(() => ctx.roundRect(66, 112, 84, 84, 14));
  ctx.setLineDash([4, 4]); stroke(() => ctx.roundRect(78, 124, 60, 60, 8)); ctx.setLineDash([]);
  stroke(() => ctx.roundRect(180, 74, 230, 150, 6));
  ctx.fillStyle = p.faint; ctx.fillRect(190, 84, 210, 130);
  ctx.font = f(11); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillStyle = p.dim; ctx.fillText("01 SYSTEM", 200, 104);
  ctx.fillStyle = p.hot; ctx.fillText("02 DEVOPS ◂", 200, 122);
  ctx.fillStyle = p.dim; ctx.fillText("03 PROJECTS", 200, 140); ctx.fillText("…", 200, 158);
  const keys = ["✕", "≡", "⏻", "⛶", "✓"];
  ctx.font = f(13); ctx.textAlign = "center";
  keys.forEach((k, i) => {
    stroke(() => ctx.roundRect(210 + i * 36, 234, 28, 16, 3), i === 2 ? p.hot : p.dim, i === 2 ? 2 : 1.6);
    ctx.fillStyle = p.ink; ctx.fillText(k, 224 + i * 36, 247);
  });
  stroke(() => ctx.arc(482, 140, 46, 0, Math.PI * 2), p.hot, 2);
  stroke(() => ctx.arc(482, 140, 16, 0, Math.PI * 2));
  stroke(() => ctx.arc(514, 214, 13, 0, Math.PI * 2));
  ctx.fillStyle = p.ink; ctx.fillText("↺", 514, 219);
  const badge = (n: string, ax: number, ay: number, lx: number, ly: number) => {
    ctx.setLineDash([3, 3]); stroke(() => { ctx.moveTo(ax, ay); ctx.lineTo(lx, ly); }, p.hot, 1.2); ctx.setLineDash([]);
    ctx.fillStyle = p.hot; ctx.beginPath(); ctx.arc(lx, ly, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = p.badgeInk; ctx.font = f(12, 700); ctx.fillText(n, lx, ly + 4.5);
  };
  badge("1", 300, 84, 300, 18); badge("2", 515, 112, 584, 112); badge("3", 482, 140, 584, 162);
  badge("4", 524, 222, 584, 244); badge("5", 260, 250, 260, 286); badge("6", 296, 250, 296, 286);
  badge("7", 332, 250, 332, 286); badge("8", 66, 154, 16, 154); badge("9", 112, 42, 112, 14);
  badge("4", 224, 250, 224, 286); badge("3", 368, 250, 368, 286);
  ctx.restore();
}

/** Draws the manual; the canvas height fits the content. Returns width / height. */
export function drawGuide(canvas: HTMLCanvasElement, layout: HoloLayout, theme: "dark" | "light") {
  const W = HOLO_WIDTH[layout];
  canvas.width = W; canvas.height = 2600;
  const end = paint(canvas.getContext("2d")!, layout, theme, W, 2600);
  canvas.height = Math.ceil(end);
  paint(canvas.getContext("2d")!, layout, theme, W, canvas.height);
  return W / canvas.height;
}

function paint(ctx: CanvasRenderingContext2D, layout: HoloLayout, theme: "dark" | "light", W: number, H: number) {
  const p = PAL[theme];
  ctx.clearRect(0, 0, W, H);

  // panel: faint fill, frame, corner ticks, scanlines
  ctx.fillStyle = p.fill; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = p.dim; ctx.lineWidth = 3; ctx.strokeRect(6, 6, W - 12, H - 12);
  ctx.strokeStyle = p.hot; ctx.lineWidth = 8;
  const t = 60;
  for (const [cx, cy, sx, sy] of [[6, 6, 1, 1], [W - 6, 6, -1, 1], [6, H - 6, 1, -1], [W - 6, H - 6, -1, -1]]) {
    ctx.beginPath(); ctx.moveTo(cx, cy + sy * t); ctx.lineTo(cx, cy); ctx.lineTo(cx + sx * t, cy); ctx.stroke();
  }
  ctx.fillStyle = p.faint;
  for (let y = 0; y < H; y += 6) ctx.fillRect(0, y, W, 1);

  ctx.shadowColor = p.glow; ctx.shadowBlur = theme === "dark" ? 10 : 0;
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  const PAD = layout === "side" ? 46 : 56;
  const BODY = layout === "side" ? 30 : 50;
  const LH = Math.round(BODY * 1.45);
  let y = PAD + BODY * 1.2;

  const head = (txt: string) => {
    ctx.font = f(BODY, 700); ctx.fillStyle = p.hot; ctx.fillText("$ " + txt, PAD, y); y += LH;
  };

  // title bar
  ctx.font = f(BODY + 8, 700); ctx.fillStyle = p.hot; ctx.fillText("N01 // FIELD MANUAL", PAD, y);
  ctx.font = f(BODY - 6); ctx.fillStyle = p.dim; ctx.textAlign = "right"; ctx.fillText(layout === "side" ? "? key · hide" : "", W - PAD, y); ctx.textAlign = "left";
  y += 22;
  ctx.fillStyle = p.dim; ctx.fillRect(PAD, y, W - PAD * 2, 2); y += LH;
  ctx.font = f(BODY); ctx.fillStyle = p.dim;
  for (const l of wrap(ctx, layout === "side" ? "No Linux needed — use it with your mouse like a real gadget." : "No Linux needed — tap it like a real gadget.", W - PAD * 2)) { ctx.fillText(l, PAD, y); y += LH; }
  y += LH * 0.3;

  head("quick start");
  STEPS.forEach((s, i) => {
    ctx.font = f(BODY, 700); ctx.fillStyle = p.hot; ctx.fillText(String(i + 1), PAD, y);
    ctx.font = f(BODY); ctx.fillStyle = p.ink;
    for (const l of wrap(ctx, s, W - PAD * 2 - BODY * 1.4)) { ctx.fillText(l, PAD + BODY * 1.4, y); y += LH; }
  });

  if (layout === "side") {
    y += LH * 0.4;
    const sw = W - PAD * 2;
    schematic(ctx, p, PAD, y, sw / 600);
    y += (sw / 600) * 300 + LH * 1.1;

    PARTS.forEach(([n, name, what]) => {
      ctx.fillStyle = p.hot; ctx.beginPath(); ctx.arc(PAD + 14, y - BODY * 0.36, 15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = p.badgeInk; ctx.font = f(BODY - 10, 700); ctx.textAlign = "center"; ctx.fillText(n, PAD + 14, y - BODY * 0.36 + 7); ctx.textAlign = "left";
      ctx.font = f(BODY - 2, 700); ctx.fillStyle = p.ink; ctx.fillText(name, PAD + 44, y);
      ctx.font = f(BODY - 4); ctx.fillStyle = p.dim; ctx.fillText(what, PAD + 44 + 230, y);
      y += LH * 0.98;
    });
    y += LH * 0.4;
    head("mouse / touch");
    ctx.font = f(BODY - 2); ctx.fillStyle = p.ink;
    for (const l of ["drag background — rotate · scroll — zoom", "orange dots — part info · reset-view — start"]) { ctx.fillText(l, PAD, y); y += LH; }
    y += LH * 0.2;
    head("keyboard");
    ctx.font = f(BODY - 2); ctx.fillStyle = p.ink;
    for (const l of ["↑ ↓ ← → move · Enter open · Esc back", "hold Space — push-to-talk (FIELD_COMMS)", "? — show / hide this manual"]) { ctx.fillText(l, PAD, y); y += LH; }
  } else {
    y += LH * 0.2;
    head("controls");
    ctx.font = f(BODY - 2); ctx.fillStyle = p.ink;
    for (const l of ["wheel / swipe pad move · ✓ select", "✕ back · ≡ menu · ⛶ fullscreen", "drag — rotate · pinch — zoom"]) { ctx.fillText(l, PAD, y); y += LH; }
  }
  y += LH * 0.3;

  ctx.shadowBlur = 0;
  ctx.font = f(BODY - 8); ctx.fillStyle = p.dim;
  ctx.fillText("# visual simulation — nothing is transmitted", PAD, y);
  return y + PAD;
}
