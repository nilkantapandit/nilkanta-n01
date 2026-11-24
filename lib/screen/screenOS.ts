"use client";

/**
 * N-01 Screen OS — everything shown on the device's physical display.
 *
 * Draws into a 1280×853 (3:2, same as the 84.6 × 56.4 mm active area) 2D canvas that
 * DeviceScreen maps onto a plane inside the GLB's display module. Physical controls,
 * the keyboard and taps on the screen all call the input methods below.
 */
import { deckOf, useDevice, type TerminalSession, type Notice } from "@/lib/store";
import { content, COMING_SOON } from "@/lib/content";
import { complete, runCommand, type Line } from "@/lib/terminal/registry";
import { welcomeLines } from "@/lib/terminal/commands";
import { BANNER } from "@/lib/terminal/banner";
import { deviceAudio } from "@/lib/deviceAudio";
import { flashControl, setPowerLevel } from "@/lib/deviceMaterials";

export const SCREEN_W = 1280;
export const SCREEN_H = 853;

export type Phase = "off" | "booting" | "online" | "shutdown";
export type AppId = "menu" | "system" | "devops" | "projects" | "security" | "arcade" | "contact" | "terminal" | "secret" | "matrix";
export type Dir = "up" | "down" | "left" | "right";

export const APPS: { id: AppId; label: string; blurb: string }[] = [
  { id: "system", label: "SYSTEM", blurb: "Device status, controls and modes" },
  { id: "devops", label: "DEVOPS", blurb: "Experience and skills" },
  { id: "projects", label: "PROJECTS", blurb: "Selected work" },
  { id: "security", label: "SECURITY", blurb: "Security work and SECURE mode" },
  { id: "arcade", label: "ARCADE", blurb: "Retro snake on the N-01" },
  { id: "contact", label: "CONTACT", blurb: "How to reach Nilkanta" },
  { id: "terminal", label: "TERMINAL", blurb: "nsh command line" },
];

/* ---------------------------------------------------------------- palette & type */
/** Dark: amber CRT. Light: Flipper-style orange LCD with dark pixels. */
const DARK = {
  AMBER: "#ffb02e", BRIGHT: "#ffd27a", PALE: "#fff0c8", DIM: "rgba(255,176,46,0.55)", FAINT: "rgba(255,176,46,0.16)",
  ERR: "#ff6a3d", GLOW: "rgba(255,150,30,0.55)", OK_GREEN: "#7dff9c",
  OFF: "#020100", BG: "#170b02", BG_SECURE: "#1c0702", BG_EDGE: "#060300",
  SHADE: "rgba(3,1,0,0.62)", PANEL: "rgba(10,5,1,0.95)", EDGE: "rgba(255,176,46,0.55)", BAND: "rgba(5,3,0,0.82)",
  INV: "#140a01", HILITE: "rgba(255,176,46,0.18)", GHOST: "rgba(255,176,46,0.32)",
};
const LCD: typeof DARK = {
  AMBER: "#3b1d00", BRIGHT: "#261200", PALE: "#170a00", DIM: "rgba(59,29,0,0.62)", FAINT: "rgba(59,29,0,0.22)",
  ERR: "#a11a00", GLOW: "rgba(0,0,0,0)", OK_GREEN: "#0e5a22",
  OFF: "#2a1f16", BG: "#ffa646", BG_SECURE: "#ff9a38", BG_EDGE: "#ec8423",
  SHADE: "rgba(255,166,70,0.6)", PANEL: "rgba(255,183,104,0.97)", EDGE: "rgba(59,29,0,0.7)", BAND: "rgba(255,170,84,0.92)",
  INV: "#ffbb66", HILITE: "rgba(59,29,0,0.12)", GHOST: "rgba(59,29,0,0.35)",
};
let C = DARK;
const color = (k: Line["kind"]) => ({ in: C.BRIGHT, out: C.AMBER, dim: C.DIM, accent: C.BRIGHT, err: C.ERR, sys: C.PALE, head: C.PALE, link: C.BRIGHT, pre: C.AMBER })[k];
const MONO = '"JetBrains Mono", "Consolas", "SFMono-Regular", Menlo, "DejaVu Sans Mono", "Liberation Mono", monospace';
const font = (px: number, bold = false) => `${bold ? "700 " : ""}${px}px ${MONO}`;
const reducedMotion = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;


/* ---------------------------------------------------------------- boot script */
const BIOS = [
  "N-01 FIRMWARE 0.1 · WEB BUILD (CONCEPT DEVICE)",
  'DISPLAY   4.0" 480x320 IPS (CONCEPT) ......... OK',
  "INPUT     NAV WHEEL · TOUCH SURFACE · 5 KEYS .. OK",
  "PORTS     ETH0 ETH1 HDMI USB-C USB-A AUDIO .... OK",
  "MODE SW   FIELD COMMS / SECURE ................ OK",
];
const CHECKS = ["DISPLAY SELF-TEST", "INPUT MATRIX", "NETWORK LINKS (SIM)"];
const LINUX = [
  "[  OK  ] Started N-01 display service.",
  "[  OK  ] Reached target Input Devices.",
  "[  OK  ] Started nsh web shell.",
  "[  OK  ] Mounted /home/nilkanta (content).",
  "[  OK  ] Reached target Graphical Interface.",
];
// timeline (seconds)
// power-off timeline (seconds): log lines, goodbye, fade, dark
const T_SHUT_BYE = 1.9, T_SHUT_FADE = 3.6, T_SHUT_END = 4.4;
const SHUT_LOG = [
  "[  OK  ] Stopped radio.service / securityd.",
  "[  OK  ] Stopped nsh web shell.",
  "[  OK  ] Discarded session (history, apps, mode).",
  "[  OK  ] Stopped N-01 display service.",
  "[  OK  ] Reached target Power-Off.",
];
const T_BACKLIGHT = 0.9, T_BIOS = 3.5, T_CHECKS = 4.8, T_LINUX = 6.0, T_ONLINE = 7.1;

type PageLine = Line & { item?: boolean };

class ScreenOS {
  canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private scan: HTMLCanvasElement | null = null;
  dirty = true;
  /** Dev/test only: hold the boot clock so each boot stage can be inspected. */
  holdBoot = false;
  phase: Phase = "off";
  app: AppId = "menu";
  sel = 0;
  private level = 0;            // backlight 0..1
  private bootT = 0;
  private flicker = 0;          // short flicker after transitions
  private t = 0;
  private lastDraw = 0;
  private charW = 18;

  /* pages */
  private page: PageLine[] = [];
  private pageTitle = "";
  private scroll = 0;
  private itemSel = 0;
  private banner: string | null = null;

  /* terminal */
  /** The terminal session lives in the shared store (survives app switches and notifications). */
  get term(): TerminalSession { return useDevice.getState().terminal; }
  private setTerm(patch: Partial<TerminalSession>) { useDevice.getState().updateTerminal(patch); this.dirty = true; }
  clearTerminal() { this.setTerm({ lines: [] }); }
  onInputChange: ((v: string) => void) | null = null;

  /* arcade */
  private snake = { body: [] as [number, number][], dir: [1, 0] as [number, number], next: [1, 0] as [number, number], food: [0, 0] as [number, number], alive: true, score: 0, acc: 0, best: 0 };
  /* matrix */
  private drops: number[] = [];
  private matrixT = 0;
  /* secret menu */
  private secretSel = 0;

  /* ---------------------------------------------------------------- setup */
  /** The OS owns exactly one canvas (idempotent, safe under React Strict Mode double-invocation). */
  getCanvas(): HTMLCanvasElement {
    if (!this.canvas) this.attach(document.createElement("canvas"));
    return this.canvas!;
  }
  private attach(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    canvas.width = SCREEN_W;
    canvas.height = SCREEN_H;
    this.ctx = canvas.getContext("2d");
    if (this.ctx) {
      // no programming ligatures on a terminal (JetBrains Mono would merge "/|", "->", "==" …)
      const c = this.ctx as CanvasRenderingContext2D & { textRendering?: string; letterSpacing?: string };
      if ("textRendering" in c) c.textRendering = "optimizeSpeed";
      if ("letterSpacing" in c) c.letterSpacing = "0.01px";
      this.ctx.font = font(28);
      this.charW = this.ctx.measureText("M").width;
    }
    this.buildScan();
    this.dirty = true;
    // the self-hosted JetBrains Mono may arrive after the first frame: re-measure and redraw once it does
    if (typeof document !== "undefined" && document.fonts?.load) {
      Promise.all([document.fonts.load(font(28)), document.fonts.load(font(28, true))]).then(() => {
        if (this.ctx) { this.ctx.font = font(28); this.charW = this.ctx.measureText("M").width; }
        if (!["menu", "terminal", "arcade", "matrix", "secret"].includes(this.app)) void this.buildPage(this.app);
        this.dirty = true;
      }).catch(() => {});
    }
  }

  /** Pre-rendered scanline / pixel-grid + vignette overlay for the current palette. */
  private buildScan() {
    const s = document.createElement("canvas");
    s.width = SCREEN_W; s.height = SCREEN_H;
    const sc = s.getContext("2d")!;
    const lcd = C === LCD;
    for (let y = 0; y < SCREEN_H; y += 3) { sc.fillStyle = lcd ? "rgba(90,40,0,0.07)" : "rgba(0,0,0,0.22)"; sc.fillRect(0, y + 2, SCREEN_W, 1); }
    const v = sc.createRadialGradient(SCREEN_W / 2, SCREEN_H / 2, SCREEN_H * 0.35, SCREEN_W / 2, SCREEN_H / 2, SCREEN_H * 0.9);
    v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, lcd ? "rgba(120,50,0,0.22)" : "rgba(0,0,0,0.55)");
    sc.fillStyle = v; sc.fillRect(0, 0, SCREEN_W, SCREEN_H);
    this.scan = s;
  }
  /** Switch between the amber CRT (dark) and the orange LCD (light) palette. */
  setTheme(theme: "dark" | "light") {
    const next = theme === "light" ? LCD : DARK;
    if (next === C) return;
    C = next;
    if (this.canvas) this.buildScan();
    this.dirty = true;
  }

  private sync() {
    useDevice.setState({ screenPhase: this.phase, screenApp: this.app, powered: this.phase === "online" || this.phase === "booting" || this.phase === "shutdown" });
  }

  /* ---------------------------------------------------------------- power */
  boot() {
    if (this.phase === "booting") return;
    this.phase = "booting"; this.bootT = 0; this.app = "menu"; this.sel = 0;
    deviceAudio.play("boot");
    this.sync(); this.dirty = true;
  }
  /** Power key: off → boot · on → shut down (goodbye, then nothing is kept). */
  power() {
    if (this.phase === "off") return this.boot();
    if (this.phase === "online" || this.phase === "booting") this.shutdown("power key");
  }
  /** Power-off sequence: services stop, a goodbye, the screen goes dark and the session is discarded. */
  private shutT = 0;
  private shutBy = "power key";
  shutdown(by = "power key") {
    if (this.phase === "shutdown" || this.phase === "off") return;
    this.phase = "shutdown"; this.shutT = 0; this.shutBy = by;
    useDevice.setState({ transmitting: false, txSince: null, notice: null });
    deviceAudio.play("shutdown");
    this.sync(); this.dirty = true;
  }
  /** Nothing survives a power-off: next boot starts fresh (menu, empty terminal, FIELD_COMMS). */
  private resetSession() {
    this.app = "menu"; this.sel = 0; this.scroll = 0; this.itemSel = 0; this.banner = null; this.page = [];
    this.tabState = null;
    useDevice.setState({
      terminal: { lines: [], input: "", hist: [], hi: -1 },
      notice: null, transmitting: false, txSince: null, overlay: "none", screenFocus: false,
      mode: "field", sim: { ...useDevice.getState().sim, secureSince: null, cipherBlocks: 0 },
    });
    this.onInputChange?.("");
  }
  /** Any key while off points at ⏻; keys during boot skip ahead. Returns true if the key was consumed. */
  private wakeIfNeeded() {
    if (this.phase === "shutdown") return true;
    if (this.phase === "off") { this.nudgePower(); return true; } // only ⏻ boots it
    if (this.phase === "booting") { if (this.bootT > T_BACKLIGHT) this.bootT = Math.max(this.bootT, T_LINUX + 0.6); return true; }
    return false;
  }

  /** Powered off: point the visitor at the ⏻ key (brighter prompt + the key lights up). */
  private nudge = 0;
  nudgePower() {
    this.nudge = 1.6;
    flashControl("N01_Btn_Power");
    deviceAudio.play("tick");
    this.dirty = true;
  }

  /** Any interaction with the screen dismisses a notification early, so it never blocks input. */
  private touch() { if (useDevice.getState().notice) useDevice.getState().dismissNotice(); }

  /* ---------------------------------------------------------------- navigation */
  openApp(id: AppId, opts?: { banner?: string }) {
    if (this.phase !== "online") { if (this.wakeIfNeeded()) return; }
    this.app = id; this.scroll = 0; this.itemSel = 0; this.banner = opts?.banner ?? null; this.flicker = 0.25;
    if (id !== "menu" && id !== "secret" && id !== "matrix") { const i = APPS.findIndex((a) => a.id === id); if (i >= 0) this.sel = i; }
    if (id === "arcade") this.resetSnake();
    if (id === "matrix") { this.matrixT = 0; this.drops = Array.from({ length: Math.ceil(SCREEN_W / 26) }, () => Math.random() * -30); }
    if (id === "secret") this.secretSel = 0;
    if (id === "terminal" && this.term.lines.length === 0) {
      this.setTerm({ lines: [
        ...welcomeLines(useDevice.getState().mode),
        { kind: "dim", text: "tab completes · ↑↓ history · esc / ✕ back" },
        { kind: "out", text: "" },
      ] });
    }
    void this.buildPage(id);
    deviceAudio.play("beep");
    this.sync(); this.dirty = true;
  }
  menu() {
    this.touch();
    if (this.wakeIfNeeded()) return;
    this.app = "menu"; this.banner = null; this.flicker = 0.2; deviceAudio.play("beep");
    this.sync(); this.dirty = true;
  }
  /** Back / Cancel. Returns false when already at the main menu (caller may exit the screen). */
  back(): boolean {
    this.touch();
    if (this.wakeIfNeeded()) return true;
    if (this.app === "menu") return false;
    this.app = "menu"; this.banner = null; this.flicker = 0.2; deviceAudio.play("cancel");
    this.sync(); this.dirty = true;
    return true;
  }
  nav(dir: Dir) {
    this.touch();
    if (this.wakeIfNeeded()) return;
    const prev = dir === "up" || dir === "left";
    switch (this.app) {
      case "menu":
        this.sel = (this.sel + (prev ? -1 : 1) + APPS.length) % APPS.length;
        break;
      case "secret":
        this.secretSel = (this.secretSel + (prev ? -1 : 1) + SECRET.length) % SECRET.length;
        break;
      case "arcade": {
        const m: Record<Dir, [number, number]> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
        const d = m[dir], c = this.snake.dir;
        if (d[0] !== -c[0] || d[1] !== -c[1]) this.snake.next = d;
        if (!this.snake.alive) this.resetSnake();
        break;
      }
      case "terminal":
        if (dir === "up") this.historyStep(-1); else if (dir === "down") this.historyStep(1);
        break;
      case "matrix": break;
      default: {
        const items = this.page.map((l, i) => (l.item ? i : -1)).filter((i) => i >= 0);
        if (items.length && (dir === "left" || dir === "right" || dir === "up" || dir === "down")) {
          this.itemSel = (this.itemSel + (prev ? -1 : 1) + items.length) % items.length;
        } else {
          this.scroll = Math.max(0, Math.min(this.maxScroll(), this.scroll + (prev ? -3 : 3)));
        }
      }
    }
    deviceAudio.play("tick");
    this.dirty = true;
  }
  /** Confirm / centre / tap. */
  select() {
    this.touch();
    if (this.wakeIfNeeded()) return;
    switch (this.app) {
      case "menu": this.openApp(APPS[this.sel].id); return;
      case "secret": SECRET[this.secretSel].run(this); return;
      case "arcade": if (!this.snake.alive) this.resetSnake(); return;
      case "terminal": void this.submit(); return;
      case "matrix": this.menu(); return;
      default: {
        const items = this.page.filter((l) => l.item);
        const it = items[this.itemSel];
        if (it?.href) { window.open(it.href, /^(mailto|tel):/.test(it.href) ? "_self" : "_blank", "noopener"); deviceAudio.play("confirm"); }
      }
    }
  }
  /** Tap / click on the screen (u, v in 0..1 texture space). */
  click(u: number, v: number) {
    this.touch();
    if (this.wakeIfNeeded()) return;
    const x = u * SCREEN_W, y = (1 - v) * SCREEN_H;
    if (this.app === "menu") {
      const i = Math.floor((y - MENU_Y0) / MENU_ROW);
      if (x < 560 && i >= 0 && i < APPS.length) { this.sel = i; this.openApp(APPS[i].id); }
      return;
    }
    if (this.app === "secret") {
      const i = Math.floor((y - 200) / 64);
      if (i >= 0 && i < SECRET.length) { this.secretSel = i; SECRET[i].run(this); }
      return;
    }
    if (y < 72 && x < 360) { this.back(); return; } // "◀ BACK" in the header
    if (this.app === "arcade") { if (!this.snake.alive) this.resetSnake(); return; }
    const items = this.page.map((l, i) => (l.item ? i : -1)).filter((i) => i >= 0);
    const row = Math.floor((y - PAGE_Y0) / PAGE_ROW) + this.scroll;
    const k = items.indexOf(row);
    if (k >= 0) { this.itemSel = k; this.select(); }
  }

  /* ---------------------------------------------------------------- terminal */
  setInput(v: string) { this.touch(); this.setTerm({ input: v, hi: -1 }); }
  private emitInput() { this.onInputChange?.(this.term.input); this.dirty = true; }
  historyStep(d: number) {
    this.touch();
    const { hist: h, hi } = this.term;
    if (!h.length) return;
    let next = hi;
    if (d < 0) next = hi === -1 ? h.length - 1 : Math.max(0, hi - 1);
    else { if (hi === -1) return; next = hi + 1; if (next >= h.length) { this.setTerm({ hi: -1, input: "" }); this.emitInput(); return; } }
    this.setTerm({ hi: next, input: h[next] }); this.emitInput();
  }
  private tabState: { base: string; i: number } | null = null;
  tab() {
    this.touch();
    const base = this.tabState?.base ?? this.term.input;
    const opts = complete(base);
    if (!opts.length) return;
    const i = this.tabState ? (this.tabState.i + 1) % opts.length : 0;
    this.tabState = { base, i };
    this.setTerm({ input: opts[i] }); this.emitInput();
  }
  resetTab() { this.tabState = null; }
  async submit() {
    this.touch();
    const raw = this.term.input;
    const cmd = raw.trim();
    const hist = this.term.hist;
    this.setTerm({
      input: "", hi: -1,
      lines: [...this.term.lines, { kind: "in", text: `nilkanta@n01:~$ ${raw}` }],
      hist: cmd && hist[hist.length - 1] !== cmd ? [...hist, cmd] : hist,
    });
    this.emitInput(); this.tabState = null;
    let cleared = false;
    const res = await runCommand(raw, {
      print: (l) => this.setTerm({ lines: [...this.term.lines, ...l] }),
      clear: () => { cleared = true; this.setTerm({ lines: [] }); },
      close: () => { this.menu(); },
      device: useDevice.getState(),
    });
    const lines = !cleared && cmd ? [...this.term.lines, ...res, { kind: "out" as const, text: "" }] : this.term.lines;
    this.setTerm({ lines: lines.slice(-400) });
    deviceAudio.play(res.some((l) => l.kind === "err") ? "error" : "confirm");
  }

  /* ---------------------------------------------------------------- page content */
  private async buildPage(id: AppId) {
    const run = async (c: string) => runCommand(c, { print: () => {}, clear: () => {}, close: () => {}, device: useDevice.getState() });
    let lines: PageLine[] = [];
    switch (id) {
      case "system":
        this.pageTitle = "SYSTEM";
        lines = [...(await run("neofetch")), { kind: "out", text: "" },
          { kind: "head", text: "CONTROLS" },
          { kind: "out", text: "  wheel / touch swipe   move" },
          { kind: "out", text: "  ✓ confirm · centre    select" },
          { kind: "out", text: "  ✕ cancel · back       back" },
          { kind: "out", text: "  ≡ menu                main menu" },
          { kind: "out", text: "  ⏻ power               boot / shut down" },
          { kind: "out", text: "  ⛶ fullscreen          immersive mode" },
          { kind: "dim", text: "  orange switch (top)   FIELD COMMS ↔ SECURE (simulated)" }];
        break;
      case "devops":
        this.pageTitle = "DEVOPS";
        lines = [...(await run("experience")), ...(await run("skills"))];
        break;
      case "projects":
        this.pageTitle = "PROJECTS";
        lines = await run("projects");
        break;
      case "security":
        this.pageTitle = "SECURITY";
        lines = await run("security");
        break;
      case "contact": {
        this.pageTitle = "CONTACT";
        const c = content.contact;
        lines = [
          { kind: "head", text: "CONTACT" },
          { kind: "dim", text: "─".repeat(26) },
          { kind: "accent", text: `${content.name} — ${content.headline}` },
          { kind: "dim", text: content.currentOrg },
          { kind: "out", text: "" },
          ...c.links.map((l) => ({ kind: "link" as const, text: `${l.label.padEnd(10)}${l.href.replace("https://", "")}`, href: l.href, item: true })),
          c.phone ? { kind: "link" as const, text: `${"Phone".padEnd(10)}${c.phone}`, href: `tel:${c.phone.replace(/\s/g, "")}`, item: true } : { kind: "dim" as const, text: `${"Phone".padEnd(10)}${COMING_SOON}` },
          c.email ? { kind: "link" as const, text: `${"Email".padEnd(10)}${c.email}`, href: `mailto:${c.email}`, item: true } : { kind: "dim" as const, text: `${"Email".padEnd(10)}${COMING_SOON}` },
          c.linkedin ? { kind: "link" as const, text: `${"LinkedIn".padEnd(10)}${c.linkedin.replace("https://", "")}`, href: c.linkedin, item: true } : { kind: "dim" as const, text: `${"LinkedIn".padEnd(10)}${COMING_SOON}` },
          { kind: "out", text: "" },
          { kind: "dim", text: "✓ confirm opens the selected link" },
        ];
        break;
      }
      default:
        lines = [];
    }
    this.page = this.wrap(lines, Math.floor((SCREEN_W - 120) / (this.charW * (PAGE_FONT / 28))));
    this.dirty = true;
  }
  private wrap(lines: PageLine[], cols: number): PageLine[] {
    const out: PageLine[] = [];
    for (const l of lines) {
      if (l.kind === "pre" || l.text.length <= cols) { out.push(l); continue; }
      let rest = l.text;
      const indent = (/^\s*/.exec(rest)?.[0] ?? "") + "  ";
      let first = true;
      while (rest.length > 0) {
        const room = first ? cols : cols - indent.length;
        let cut = rest.length <= room ? rest.length : rest.lastIndexOf(" ", room);
        if (cut <= 0) cut = room;
        out.push({ ...l, text: (first ? "" : indent) + rest.slice(0, cut).trimEnd(), item: first ? l.item : false });
        rest = rest.slice(cut).trimStart();
        first = false;
      }
    }
    return out;
  }
  private maxScroll() { return Math.max(0, this.page.length - PAGE_ROWS); }

  /* ---------------------------------------------------------------- arcade */
  private resetSnake() {
    const s = this.snake;
    s.body = [[8, 7], [7, 7], [6, 7]]; s.dir = [1, 0]; s.next = [1, 0]; s.alive = true; s.score = 0; s.acc = 0;
    this.placeFood();
  }
  private placeFood() {
    const s = this.snake;
    do { s.food = [(Math.random() * GRID_W) | 0, (Math.random() * GRID_H) | 0]; } while (s.body.some(([x, y]) => x === s.food[0] && y === s.food[1]));
  }
  private stepSnake() {
    const s = this.snake;
    if (!s.alive) return;
    s.dir = s.next;
    const h: [number, number] = [s.body[0][0] + s.dir[0], s.body[0][1] + s.dir[1]];
    if (h[0] < 0 || h[1] < 0 || h[0] >= GRID_W || h[1] >= GRID_H || s.body.some(([x, y]) => x === h[0] && y === h[1])) {
      s.alive = false; s.best = Math.max(s.best, s.score); deviceAudio.play("error"); return;
    }
    s.body.unshift(h);
    if (h[0] === s.food[0] && h[1] === s.food[1]) { s.score += 10; this.placeFood(); deviceAudio.play("beep"); } else s.body.pop();
  }

  /* ---------------------------------------------------------------- frame update */
  /** Advance animations; returns true when the canvas should be redrawn / re-uploaded. */
  tick(dt: number): boolean {
    this.t += dt;
    let animating = false;
    // backlight
    const targetLevel = this.phase === "online" ? 1
      : this.phase === "booting" ? Math.min(1, this.bootT / T_BACKLIGHT)
      : this.phase === "shutdown" ? (this.shutT < T_SHUT_FADE ? 1 : 0) : 0;
    if (Math.abs(targetLevel - this.level) > 0.002) {
      this.level += (targetLevel - this.level) * Math.min(1, dt * (this.phase === "shutdown" ? 4 : 3));
      animating = true;
    } else this.level = targetLevel;
    setPowerLevel(this.level);
    if (this.phase === "shutdown") {
      this.shutT += dt;
      animating = true;
      if (this.shutT >= T_SHUT_END) { this.phase = "off"; this.level = 0; this.resetSession(); this.sync(); }
    }
    if (this.phase === "booting") {
      if (!this.holdBoot) this.bootT += dt;
      animating = true;
      if (this.bootT >= T_ONLINE) { this.phase = "online"; this.app = "menu"; this.flicker = 0.3; deviceAudio.play("confirm"); this.sync(); }
    }
    if (this.flicker > 0) { this.flicker = Math.max(0, this.flicker - dt); animating = true; }
    if (this.phase === "off") {
      if (this.nudge > 0) { this.nudge = Math.max(0, this.nudge - dt); animating = true; }
      if (Math.floor(this.t * 2) !== Math.floor((this.t - dt) * 2)) this.dirty = true;             // prompt blink
      if (Math.floor(this.t / 2.4) !== Math.floor((this.t - dt) / 2.4)) flashControl("N01_Btn_Power"); // key breathes
    }
    if (this.phase === "online") {
      if (this.app === "arcade") { this.snake.acc += dt; while (this.snake.acc > 0.13) { this.snake.acc -= 0.13; this.stepSnake(); } animating = true; }
      if (this.app === "matrix") { this.matrixT += dt; animating = true; if (this.matrixT > 12) this.menu(); }
      if (this.app === "terminal" && Math.floor(this.t * 2) !== Math.floor((this.t - dt) * 2)) this.dirty = true;  // cursor blink
      if (useDevice.getState().mode === "secure" && Math.floor(this.t) !== Math.floor(this.t - dt)) this.dirty = true; // lock blink
      if (Math.floor(this.t / 20) !== Math.floor((this.t - dt) / 20)) this.dirty = true; // clock
    }
    // physical-screen notification: animate while alive, expire on its own
    // lifetime = displayed time (starts on first draw; each frame counts at most 250 ms)
    const notice = useDevice.getState().notice;
    if (notice) {
      const now = performance.now();
      if (notice.id !== this.noticeId) { this.noticeId = notice.id; this.noticeT = 0; }
      else this.noticeT += Math.min((now - this.noticeStart) / 1000, 0.25); // one stalled frame can't eat the message
      this.noticeStart = now;
      const expired = this.phase === "online" ? this.noticeT * 1000 > notice.ms : now - notice.at > notice.ms;
      if (expired) useDevice.getState().dismissNotice();
      animating = true;
    }
    if (this.noticeFade > 0 || notice) animating = true;
    if (useDevice.getState().transmitting) animating = true;
    if (animating) this.dirty = true;
    // throttle uploads to ~30 fps
    if (this.dirty && this.t - this.lastDraw >= 1 / 30) {
      this.draw();
      this.lastDraw = this.t;
      this.dirty = false;
      return true;
    }
    return false;
  }

  /* ---------------------------------------------------------------- drawing */
  draw() {
    const g = this.ctx;
    if (!g) return;
    g.save();
    g.fillStyle = C.OFF;
    g.fillRect(0, 0, SCREEN_W, SCREEN_H);
    if (this.level <= 0.003) {
      if (this.phase === "off") this.drawStandby(g);
      g.restore();
      return;
    }
    let alpha = this.level;
    const calm = reducedMotion();
    if (this.flicker > 0 && !calm) alpha *= 0.9 + 0.1 * Math.random();
    if (this.phase === "booting" && this.bootT < T_BACKLIGHT && !calm) alpha *= 0.75 + 0.25 * Math.random();
    g.globalAlpha = alpha;
    // backlight
    const bg = g.createRadialGradient(SCREEN_W / 2, SCREEN_H / 2, 40, SCREEN_W / 2, SCREEN_H / 2, SCREEN_W * 0.72);
    const secure = useDevice.getState().mode === "secure";
    bg.addColorStop(0, secure ? C.BG_SECURE : C.BG);
    bg.addColorStop(1, C.BG_EDGE);
    g.fillStyle = bg;
    g.fillRect(0, 0, SCREEN_W, SCREEN_H);
    g.textBaseline = "alphabetic";

    if (this.phase === "booting") this.drawBoot(g);
    else if (this.phase === "shutdown") this.drawShutdown(g);
    else if (this.phase === "online") {
      switch (this.app) {
        case "menu": this.drawMenu(g); break;
        case "terminal": this.drawTerminal(g); break;
        case "arcade": this.drawArcade(g); break;
        case "matrix": this.drawMatrix(g); break;
        case "secret": this.drawSecret(g); break;
        default: this.drawPage(g);
      }
    }
    // notification layer: drawn over the current app, never changes its state
    if (this.phase === "online") this.drawNotice(g, alpha);
    g.globalAlpha = 1;
    if (this.scan) g.drawImage(this.scan, 0, 0);
    g.restore();
  }

  private text(g: CanvasRenderingContext2D, s: string, x: number, y: number, color = C.AMBER, px = 28, bold = false, glow = true) {
    g.font = font(px, bold);
    g.fillStyle = color;
    g.shadowColor = glow ? C.GLOW : "transparent";
    g.shadowBlur = glow ? 8 : 0;
    g.fillText(s, x, y);
    g.shadowBlur = 0;
  }

  private header(g: CanvasRenderingContext2D, title: string, back: boolean) {
    const st = useDevice.getState();
    g.fillStyle = C.FAINT; g.fillRect(0, 70, SCREEN_W, 2);
    if (back) this.text(g, "◀ " + title, 36, 48, C.PALE, 30, true);
    else this.text(g, "NILKANTA · N-01", 36, 48, C.PALE, 30, true);
    const now = new Date();
    const clock = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const secure = st.mode === "secure";
    const tx = !secure && st.transmitting;
    const modeTxt = secure ? (Math.floor(this.t) % 2 ? "■ SECURE" : "□ SECURE") : tx ? (Math.floor(this.t * 3) % 2 ? "● TX ACTIVE" : "○ TX ACTIVE") : "● FIELD COMMS";
    g.font = font(24, true);
    const w = g.measureText(clock).width;
    this.text(g, clock, SCREEN_W - 36 - w, 46, C.AMBER, 24, true);
    const mw = g.measureText(modeTxt).width;
    this.text(g, modeTxt, SCREEN_W - 70 - w - mw, 46, secure ? C.BRIGHT : tx ? C.ERR : C.OK_GREEN, 24, true, false);
  }
  private footer(g: CanvasRenderingContext2D, s: string) {
    g.fillStyle = C.FAINT; g.fillRect(0, SCREEN_H - 66, SCREEN_W, 2);
    this.text(g, s, 36, SCREEN_H - 24, C.DIM, 22, false, false);
  }

  /* ---------------------------------------------------------------- notifications */
  private noticeFade = 0;
  private noticeId = -1;
  private noticeT = 0;
  private noticeStart = 0;
  private lastNotice: Notice | null = null;
  /** Terminal-style system notification, drawn as a temporary layer over whatever app is open. */
  private drawNotice(g: CanvasRenderingContext2D, alpha: number) {
    const live = useDevice.getState().notice;
    if (live) this.lastNotice = live;
    const n = this.lastNotice;
    if (!n) return;
    const el = n.id === this.noticeId ? this.noticeT : 0;
    // fade in quickly; fade out at the end of its life or after an early dismissal
    const target = live ? Math.min(1, el / 0.15, (n.ms / 1000 - el) / 0.35) : 0;
    this.noticeFade = live ? Math.max(0, target) : Math.max(0, this.noticeFade - 0.12);
    if (this.noticeFade <= 0.001) { if (!live) this.lastNotice = null; return; }
    const f = this.noticeFade;
    g.save();
    g.globalAlpha = alpha * f;
    g.fillStyle = C.SHADE;
    g.fillRect(0, 0, SCREEN_W, SCREEN_H);
    const lh = 46, pad = 34;
    const W = 920, H = 70 + n.lines.length * lh + 26;
    const x = (SCREEN_W - W) / 2, y = Math.round((SCREEN_H - H) / 2) + 8;
    g.fillStyle = C.PANEL;
    g.fillRect(x, y, W, H);
    g.strokeStyle = C.EDGE; g.lineWidth = 2;
    g.strokeRect(x + 1, y + 1, W - 2, H - 2);
    g.fillStyle = C.FAINT; g.fillRect(x, y + 48, W, 2);
    this.text(g, n.kind === "tx" ? "radio · notice" : "system · notice", x + pad, y + 34, C.DIM, 22, false, false);
    const tag = n.kind === "tx" ? "TX" : "MODE";
    g.font = font(22, true);
    this.text(g, tag, x + W - pad - g.measureText(tag).width, y + 34, C.BRIGHT, 22, true, false);
    const PS = "nilkanta@n01:~$ ";
    g.font = font(28);
    const cw = g.measureText("M").width;
    n.lines.forEach((l, i) => {
      const t0 = 0.1 + i * 0.17;
      if (el < t0) return;
      const ly = y + 70 + 26 + i * lh;
      if (l.kind === "cmd") {
        const typed = l.text.slice(0, Math.max(0, Math.floor((el - t0) * 45)));
        this.text(g, PS, x + pad, ly, C.BRIGHT, 28, true);
        this.text(g, typed, x + pad + PS.length * cw, ly, C.PALE, 28);
      } else if (l.kind === "ok") {
        this.text(g, "[ OK ]", x + pad, ly, C.OK_GREEN, 28, true, false);
        this.text(g, l.text, x + pad + 7 * cw, ly, C.PALE, 28);
      } else if (l.kind === "info") {
        this.text(g, l.text, x + pad + 7 * cw, ly, C.DIM, 26, false, false);
      } else {
        this.text(g, PS, x + pad, ly, C.BRIGHT, 28, true);
        if (Math.floor(this.t * 2) % 2 === 0) { g.fillStyle = C.AMBER; g.fillRect(x + pad + PS.length * cw + 2, ly - 24, cw * 0.62, 28); }
      }
    });
    g.restore();
  }

  /** Power-off: services stop line by line, then a goodbye, then the backlight fades. */
  private drawShutdown(g: CanvasRenderingContext2D) {
    const t = this.shutT;
    if (t < T_SHUT_BYE) {
      let y = 90;
      this.text(g, this.shutBy === "power key" ? "⏻ power key · shutting down…" : `nilkanta@n01:~$ ${this.shutBy}`, 48, y, C.PALE, 28, true);
      y += 54;
      const n = Math.min(SHUT_LOG.length, Math.floor(t / 0.28) + 1);
      SHUT_LOG.slice(0, n).forEach((l) => {
        this.text(g, "[", 48, y, C.AMBER, 26); this.text(g, "  OK  ", 62, y, C.OK_GREEN, 26, true, false); this.text(g, l.slice(8), 168, y, C.AMBER, 26);
        y += 40;
      });
      return;
    }
    g.textAlign = "center";
    this.text(g, "GOODBYE.", SCREEN_W / 2, SCREEN_H / 2 - 20, C.PALE, 110, true);
    this.text(g, "thanks for stopping by, operator", SCREEN_W / 2, SCREEN_H / 2 + 50, C.AMBER, 32, false);
    this.text(g, "session discarded · nothing saved · press ⏻ to boot again", SCREEN_W / 2, SCREEN_H / 2 + 104, C.DIM, 24, false, false);
    g.textAlign = "left";
  }

  /** Powered off: a faint prompt on the dark glass, like a standby label. */
  private drawStandby(g: CanvasRenderingContext2D) {
    const on = Math.floor(this.t * 2) % 2 === 0 || this.nudge > 0;
    const a = this.nudge > 0 ? 0.95 : 0.55;
    g.save();
    g.globalAlpha = a;
    g.textAlign = "center";
    this.text(g, "N-01 · POWERED OFF", SCREEN_W / 2, SCREEN_H / 2 - 70, "rgba(255,176,46,0.6)", 44, true, false);
    if (on) this.text(g, "PRESS ⏻ TO BOOT", SCREEN_W / 2, SCREEN_H / 2 + 30, "#ffb02e", 76, true, false);
    this.text(g, "power key · centre of the row below", SCREEN_W / 2, SCREEN_H / 2 + 110, "rgba(255,176,46,0.5)", 32, false, false);
    g.restore();
  }

  private drawBoot(g: CanvasRenderingContext2D) {
    const t = this.bootT;
    if (t < T_BACKLIGHT) return; // backlight only
    if (t < T_BIOS) {
      // logo
      const a = Math.min(1, (t - T_BACKLIGHT) / 0.6);
      g.globalAlpha *= a;
      // ASCII wordmark, centred
      g.font = font(30, true);
      const cw = g.measureText("M").width;
      const bw = BANNER[0].length * cw;
      BANNER.forEach((l, i) => this.text(g, l, (SCREEN_W - bw) / 2, SCREEN_H / 2 - 150 + i * 40, C.PALE, 30, true));
      g.textAlign = "center";
      this.text(g, "N-01 · portable linux computer · web build", SCREEN_W / 2, SCREEN_H / 2 + 100, C.AMBER, 26, false);
      const p = Math.min(1, (t - T_BACKLIGHT) / (T_BIOS - T_BACKLIGHT));
      const n = 30, k = Math.round(p * n);
      this.text(g, `[${"#".repeat(k)}${".".repeat(n - k)}] ${String(Math.round(p * 100)).padStart(3)}%`, SCREEN_W / 2, SCREEN_H / 2 + 160, C.DIM, 24, false, false);
      g.textAlign = "left";
      return;
    }
    let y = 70;
    const lh = 40;
    const shown = Math.min(BIOS.length, Math.floor((t - T_BIOS) / 0.22) + 1);
    BIOS.slice(0, shown).forEach((l, i) => { this.text(g, l, 48, y, i === 0 ? C.PALE : C.AMBER, 28, i === 0); y += lh; });
    if (t >= T_CHECKS) {
      y += 14;
      CHECKS.forEach((c, i) => {
        const p = Math.max(0, Math.min(1, (t - T_CHECKS - i * 0.25) / 0.6));
        if (t < T_CHECKS + i * 0.25) return;
        this.text(g, c.padEnd(22), 48, y, C.AMBER, 26);
        g.strokeStyle = C.DIM; g.lineWidth = 2; g.strokeRect(470, y - 22, 420, 24);
        g.fillStyle = C.AMBER; g.fillRect(474, y - 18, 412 * p, 16);
        this.text(g, p >= 1 ? "PASS" : `${Math.round(p * 100)}%`, 910, y, p >= 1 ? C.OK_GREEN : C.AMBER, 26, true, false);
        y += 38;
      });
    }
    if (t >= T_LINUX) {
      y += 14;
      const n = Math.min(LINUX.length, Math.floor((t - T_LINUX) / 0.16) + 1);
      LINUX.slice(0, n).forEach((l) => {
        this.text(g, "[", 48, y, C.AMBER, 24); this.text(g, "  OK  ", 62, y, C.OK_GREEN, 24, true, false); this.text(g, l.slice(8), 160, y, C.AMBER, 24);
        y += 32;
      });
    }
    if (t >= T_ONLINE - 0.35) {
      g.fillStyle = C.BAND; g.fillRect(0, SCREEN_H / 2 - 70, SCREEN_W, 140);
      g.textAlign = "center";
      this.text(g, "SYSTEM ONLINE", SCREEN_W / 2, SCREEN_H / 2 + 22, C.PALE, 64, true);
      g.textAlign = "left";
    }
  }

  private drawMenu(g: CanvasRenderingContext2D) {
    this.header(g, "", false);
    APPS.forEach((a, i) => {
      const y = MENU_Y0 + i * MENU_ROW;
      const on = i === this.sel;
      if (on) { g.fillStyle = C.AMBER; g.shadowColor = C.GLOW; g.shadowBlur = 14; g.fillRect(36, y + 6, 480, MENU_ROW - 12); g.shadowBlur = 0; }
      this.text(g, `${String(i + 1).padStart(2, "0")}  ${a.label}`, 56, y + MENU_ROW / 2 + 12, on ? C.INV : C.AMBER, 34, true, !on);
    });
    // preview pane
    const a = APPS[this.sel];
    g.strokeStyle = C.FAINT; g.lineWidth = 2; g.strokeRect(560, 100, 684, 640);
    this.text(g, a.label, 596, 172, C.PALE, 56, true);
    this.text(g, a.blurb, 596, 222, C.AMBER, 26);
    const preview = this.preview(a.id);
    preview.forEach((l, i) => this.text(g, l, 596, 300 + i * 40, i === 0 ? C.BRIGHT : C.DIM, 26));
    this.text(g, "✓ CONFIRM / CENTRE  ▶  OPEN", 596, 700, C.AMBER, 22, true, false);
    this.footer(g, "WHEEL / SWIPE  move   ·   ✓ open   ·   ✕ exit screen   ·   ⏻ power off");
  }
  private preview(id: AppId): string[] {
    switch (id) {
      case "system": return ["NILKANTA N-01 (concept)", `mode: ${useDevice.getState().mode === "secure" ? "SECURE" : "FIELD COMMS"} (simulated)`, "controls · ports · uptime"];
      case "devops": return [`${content.experience[0].title}`, content.experience[0].org, content.experience[0].period];
      case "projects": return [content.projects[0]?.name ?? COMING_SOON, ...(content.projects[0] ? this.wrap([{ kind: "out", text: content.projects[0].summary }], 34).slice(0, 3).map((l) => l.text) : [])];
      case "security": return this.wrap([{ kind: "out", text: content.security[0] }], 34).map((l) => l.text).slice(0, 4);
      case "arcade": return ["snake · wheel / swipe to steer", `best this session: ${this.snake.best}`];
      case "contact": return [content.contact.links[0]?.href.replace("https://", "") ?? COMING_SOON, `email: ${content.contact.email ?? "coming soon"}`, ...(content.contact.phone ? [`phone: ${content.contact.phone}`] : [])];
      case "terminal": return ["type commands on this screen", "help · whoami · skills · projects", "experience · security · contact"];
      default: return [];
    }
  }

  private drawPage(g: CanvasRenderingContext2D) {
    this.header(g, this.pageTitle, true);
    if (this.banner) {
      g.fillStyle = C.AMBER; g.fillRect(36, 84, SCREEN_W - 72, 40);
      this.text(g, this.banner, 52, 113, C.INV, 24, true, false);
    }
    const y0 = PAGE_Y0 + (this.banner ? 30 : 0);
    const rows = PAGE_ROWS - (this.banner ? 1 : 0);
    const items = this.page.map((l, i) => (l.item ? i : -1)).filter((i) => i >= 0);
    const selRow = items[this.itemSel];
    this.page.slice(this.scroll, this.scroll + rows).forEach((l, k) => {
      const i = this.scroll + k;
      const y = y0 + k * PAGE_ROW + 28;
      if (l.item && i === selRow) { g.fillStyle = C.HILITE; g.fillRect(40, y - 30, SCREEN_W - 80, PAGE_ROW); this.text(g, "▶", 44, y, C.BRIGHT, PAGE_FONT, true); }
      this.text(g, l.text, 76, y, color(l.kind), PAGE_FONT, l.kind === "head" || l.kind === "accent");
    });
    if (this.page.length > rows) {
      const h = (SCREEN_H - 200) * (rows / this.page.length);
      const top = 100 + ((SCREEN_H - 200 - h) * this.scroll) / Math.max(1, this.maxScroll());
      g.fillStyle = C.FAINT; g.fillRect(SCREEN_W - 22, 100, 6, SCREEN_H - 200);
      g.fillStyle = C.AMBER; g.fillRect(SCREEN_W - 22, top, 6, h);
    }
    this.footer(g, items.length ? "WHEEL / SWIPE  select   ·   ✓ open link   ·   ✕ back" : "WHEEL / SWIPE  scroll   ·   ✕ back   ·   ≡ menu");
  }

  private drawTerminal(g: CanvasRenderingContext2D) {
    this.header(g, "TERMINAL", true);
    const fs = 26, lh = 34;
    g.font = font(fs);
    const cw = g.measureText("M").width;
    const cols = Math.floor((SCREEN_W - 80) / cw);
    const wrapped = this.wrap(this.term.lines, cols);
    const top = 96, bottom = SCREEN_H - 120;
    const rows = Math.floor((bottom - top) / lh);
    const visible = wrapped.slice(-rows);
    visible.forEach((l, i) => this.text(g, l.text, 40, top + 26 + i * lh, color(l.kind), fs, l.kind === "head"));
    // prompt
    const ps = "nilkanta@n01:~$ ";
    const y = top + 26 + visible.length * lh;
    const inp = this.term.input;
    const shownInput = (ps + inp).length > cols ? "…" + (ps + inp).slice(-(cols - 1)) : ps + inp;
    this.text(g, shownInput, 40, y, C.BRIGHT, fs);
    const cx = 40 + shownInput.length * cw;
    const sug = inp.includes(" ") ? [] : complete(inp);
    if (sug[0]) this.text(g, sug[0].slice(inp.length), cx, y, C.GHOST, fs, false, false);
    if (Math.floor(this.t * 2) % 2 === 0) { g.fillStyle = C.AMBER; g.shadowColor = C.GLOW; g.shadowBlur = 10; g.fillRect(cx + 2, y - fs + 4, cw * 0.62, fs + 2); g.shadowBlur = 0; }
    this.footer(g, sug.length ? `tab ▶ ${sug.slice(0, 5).join("  ")}` : "ENTER run   ·   TAB complete   ·   ↑↓ history   ·   ESC / ✕ back");
  }

  private drawArcade(g: CanvasRenderingContext2D) {
    const s = this.snake;
    this.header(g, `ARCADE · SCORE ${String(s.score).padStart(4, "0")}`, true);
    const ox = (SCREEN_W - GRID_W * CELL) / 2, oy = 92;
    g.strokeStyle = C.FAINT; g.lineWidth = 2; g.strokeRect(ox - 2, oy - 2, GRID_W * CELL + 4, GRID_H * CELL + 4);
    g.fillStyle = "#ff6a1a"; g.fillRect(ox + s.food[0] * CELL + 8, oy + s.food[1] * CELL + 8, CELL - 16, CELL - 16);
    s.body.forEach(([x, y], i) => { g.fillStyle = i === 0 ? C.BRIGHT : C.AMBER; g.fillRect(ox + x * CELL + 3, oy + y * CELL + 3, CELL - 6, CELL - 6); });
    if (!s.alive) {
      g.fillStyle = C.BAND; g.fillRect(0, SCREEN_H / 2 - 70, SCREEN_W, 140);
      g.textAlign = "center";
      this.text(g, "GAME OVER", SCREEN_W / 2, SCREEN_H / 2 + 4, C.PALE, 56, true);
      this.text(g, "✓ / tap to restart", SCREEN_W / 2, SCREEN_H / 2 + 46, C.AMBER, 26);
      g.textAlign = "left";
    }
    this.footer(g, "WHEEL sides / SWIPE / ARROWS  steer   ·   ✕ back");
  }

  private drawMatrix(g: CanvasRenderingContext2D) {
    const glyphs = "アイウエオカキクケコサシスセソ0123456789N01ΛΣ#$";
    g.fillStyle = "#000"; g.fillRect(0, 0, SCREEN_W, SCREEN_H);
    g.font = font(24);
    this.drops = this.drops.map((d, i) => {
      for (let k = 0; k < 14; k++) {
        const y = (d - k) * 26;
        if (y < 0 || y > SCREEN_H) continue;
        g.fillStyle = k === 0 ? "#d8ffe2" : `rgba(57,255,122,${0.9 - k * 0.06})`;
        g.fillText(glyphs[(Math.random() * glyphs.length) | 0], i * 26, y);
      }
      const nd = d + 0.55;
      return nd * 26 > SCREEN_H + 360 ? Math.random() * -10 : nd;
    });
    this.text(g, "✕ back", SCREEN_W - 140, SCREEN_H - 24, "rgba(57,255,122,0.7)", 22, false, false);
  }

  private drawSecret(g: CanvasRenderingContext2D) {
    this.header(g, "// SECRET MENU", true);
    this.text(g, "You found the long-press menu.", 56, 150, C.DIM, 26);
    SECRET.forEach((it, i) => {
      const y = 200 + i * 64;
      const on = i === this.secretSel;
      if (on) { g.fillStyle = C.AMBER; g.fillRect(36, y + 6, 640, 52); }
      this.text(g, it.label, 56, y + 42, on ? C.INV : C.AMBER, 30, true, !on);
    });
    this.footer(g, "WHEEL / SWIPE  move   ·   ✓ run   ·   ✕ back");
  }
}

/* layout constants */
const MENU_Y0 = 104, MENU_ROW = 90;
const PAGE_Y0 = 92, PAGE_ROW = 40, PAGE_FONT = 27, PAGE_ROWS = 16;
const GRID_W = 26, GRID_H = 14, CELL = 44;

const SECRET: { label: string; run: (os: ScreenOS) => void }[] = [
  { label: "Diagnostic mode", run: () => useDevice.getState().openOverlay("diagnostics") },
  { label: "Arcade", run: (os) => os.openApp("arcade") },
  { label: "Matrix", run: (os) => os.openApp("matrix") },
  { label: "Priority contact", run: (os) => os.openApp("contact", { banner: "PRIORITY CHANNEL · OPEN" }) },
  { label: "Toggle FIELD / SECURE", run: (os) => { os.menu(); useDevice.getState().toggleMode(); } },
  { label: "Back to main menu", run: (os) => os.menu() },
];

export const screenOS = new ScreenOS();

/* Terminal easter eggs / Konami ask for "overlays" through the store — route them to screen apps. */
if (typeof window !== "undefined") {
  useDevice.subscribe((s, prev) => {
    if (s.overlay === prev.overlay) return;
    const map: Record<string, () => void> = {
      hire: () => screenOS.openApp("contact", { banner: "PRIORITY CHANNEL · OPEN" }),
      matrix: () => screenOS.openApp("matrix"),
      arcade: () => screenOS.openApp("arcade"),
      secret: () => screenOS.openApp("secret"),
    };
    const fn = map[s.overlay];
    if (fn) { useDevice.setState({ overlay: "none" }); if (!s.screenFocus) s.setScreenFocus(true); fn(); }
  });
  screenOS.setTheme(deckOf(useDevice.getState()));
  useDevice.subscribe((s, prev) => {
    if (s.powerOffSignal !== prev.powerOffSignal) screenOS.shutdown(s.powerOffCmd ?? "poweroff");
    if (deckOf(s) !== deckOf(prev)) screenOS.setTheme(deckOf(s));
    if (s.mode !== prev.mode || s.notice !== prev.notice || s.transmitting !== prev.transmitting || s.terminal !== prev.terminal) screenOS.dirty = true;
  });
}
