# NILKANTA N-01 — Interactive Website

Real-time 3D browser prototype of the NILKANTA N-01, built with **Next.js 16 · TypeScript · React Three Fiber 9 · Three.js r187 · drei 10 · GSAP 3 · Zustand 5**.

## Run locally (Windows / macOS / Linux)

Requires **Node.js 20.9 or newer** (Node 22 LTS recommended).

```bash
git clone https://github.com/nilkantapandit/nilkanta-n01.git
cd nilkanta-n01
npm install
npm run dev
```

Open http://localhost:3000.

Other scripts:

| Command | What it does |
|---|---|
| `npm run build` | Production build |
| `npm start` | Serve the production build (after `npm run build`) |
| `npm run typecheck` | TypeScript check only |

## Editing the site content

All terminal / contact text lives in **`lib/content.ts`**. Only confirmed facts are filled in;
anything still to write is `null` and marked `TODO(nilkanta)` — the site shows it as "coming soon".
Fill in: bio, location (optional), toolbox, more projects, more art, gaming, email, LinkedIn.

Add a terminal command with one call in `lib/terminal/commands.ts`:

```ts
registerCommand({ name: "hello", description: "Say hi", menu: true, run: () => [out("hi")] });
```

## Interactions

- **Camera** — drag to rotate, scroll / pinch to zoom, double-click or *Reset view* to return to the hero shot.
- **Technical callouts** — 12 white markers attached to real GLB nodes (ETH0, ETH1, HDMI, USB-C, USB-A, audio,
  display, nav wheel, touch surface, function keys, mode switch, carry loop). Hover to preview, click to pin;
  on phones a tap opens a bottom sheet. *Hide callouts* toggles them.
- **On-device OS** — the interface is drawn on the N-01's physical display (a canvas texture on a plane parented
  to `N01_Display_Module`, clipped to the 3:2 screen). The static `N01_Display_UI` graphic in the GLB is hidden at
  runtime; the GLB itself is untouched. On load the screen boots: backlight → NILKANTA logo → BIOS → hardware checks →
  Linux boot log → SYSTEM ONLINE → main menu (SYSTEM, DEVOPS, PROJECTS, SECURITY, ARCADE, CONTACT, TERMINAL).
- **Operating the device** — click/tap the screen to enter inspect mode: the camera glides to a front view and
  locks (no accidental rotation while typing). *◀ Exit screen*, Esc at the menu or Cancel at the menu returns to
  the hero view, where manual rotation works again.
- **Terminal app** (on the screen) — `help`, `whoami`, `about`, `skills`, `projects`, `experience`, `security`,
  `art`, `gaming`, `contact`, `neofetch`, `ps` (pm2-style service table), `history`, `ls`, `cat`, `pwd`,
  `uname`, `date`, `echo`, `mode --set secure|field-comms`, `shutdown` (`poweroff`), `clear`, `exit`. Tab autocompletes, ↑/↓ history.
  Keyboard input goes through an invisible input; nothing is rendered as an HTML popup.
- **Physical controls (raycast on the model — they are the navigation bar)**
  - Nav wheel: click a side or scroll over it to move the selection; centre button selects.
  - Touch surface: swipe to move, tap to select, long-press for a hidden menu.
  - Screen: tap a menu row to open it, swipe to move the selection (main input on phones).
  - Keys: Cancel (back / close), Menu (main menu), Power (boot / shut down — a goodbye, then nothing is kept), Fullscreen (immersive mode,
    HUD hidden), Confirm (activate). Keys animate and light up when pressed.
  - Keyboard while operating: arrows/WASD move, Enter selects, Esc/Backspace goes back.
- **Status panel** — `N01://MODE` shows full status briefly after load or a change, then folds to one line;
  hover / focus opens it, clicking the title pins it.
- **Operating modes** — the orange slider on the top edge or the N01://MODE panel (top right) switches
  FIELD_COMMS ↔ SECURE_MODE. Both write the same shared state (`lib/store.ts`); the physical screen shows a
  short terminal-style notice (`mode --set …`) over the current app and then returns to it untouched, while
  the panel stays as a status monitor (channel / signal / TX, or session / cipher / uptime).
  Push-to-talk (panel button or hold Space, FIELD_COMMS only) shows TX ACTIVE / STANDBY on both.
- **Field manual:** a plain-language how-to overlay (device wireframe with numbered controls, quick start, mouse/keyboard basics). Opens on the first visit; reopen with `? guide` or the `?` key.
  All of it is a visual simulation: nothing is transmitted or encrypted.
- **Colours** — two independent toggles: `light` (background + interface) and `white-deck` (device shell +
  screen: white Flipper-style shell with an orange LCD, or charcoal with the amber CRT). Any combination works;
  both are remembered per browser and default to the system light/dark setting. The GLB is never modified.
- **Operating from any angle** — the camera is never locked. Tapping the screen while it is seen at an angle
  turns the view to face it (that tap only turns the view); keys, wheel and touch surface work from any angle.
  Scrolling over the D-pad moves the menu and never zooms.
- **Ambient graph** — a faint grid, a few glowing nodes with thin links, drifting dust and two sparse tracking
  brackets behind the N-01 (stencil-masked so it never draws over the device; static with reduced motion,
  lighter on phones / low-power devices).
- **Pointer** — click anywhere for one thin expanding pulse; an orange reticle replaces the cursor over the
  scene (mouse only); hovering a control or hotspot shows target-lock brackets. The cursor is "sticky": within
  ~26 px of a key / the wheel / touch surface / mode switch it locks on and a click (or tap) presses it.
- **Sound** — muted by default; *Sound off/on* enables synthesised effects.

<details><summary>Easter eggs (spoilers)</summary>

`sudo hire-me` · `sudo matrix` · `sudo coffee` · `sudo unlock` · `sudo rm -rf /` · `msfconsole` · `nmap` ·
`vim` · `cowsay` · `fortune` · `doom` · `ls -a` + `cat .secrets` / `.bash_history` · Konami code (arcade) · triple-click the LINK
indicator (diagnostics) · click the NILKANTA logo five times · long-press the touch surface (secret menu).
</details>

## Project structure

```
app/                       layout, page, global styles, icon
components/
  ExperienceClient         WebGL detection + client-only loading
  Experience               canvas, loader, error boundary, HUD, overlay mounting
  Scene                    lights, environment, floor, particles, in-canvas systems
  N01Model                 loads the GLB unchanged; shadows, raycast filtering, control events
  CameraRig                orbit limits, idle pause/resume, hero framing, reset tween
  DeviceHotspots           HotspotProjector (in-canvas) + DOM marker layer
  TechnicalCallout         callout card + animated leader line / mobile sheet
  DeviceScreen             screen surface mesh + CanvasTexture on N01_Display_Module
  ScreenInput              hidden keyboard bridge to the screen OS + Exit screen button
  DeviceControls           raycast handlers for wheel, touch surface, keys, power, switch
  OperatingModeSelector    ModeEffects (switch animation, LED/screen changes) + mode panel
  EasterEggManager         Konami listener + diagnostics overlay (other eggs run on the screen)
  AmbientGraph             background grid / node graph (screen-space shaders, render layer 1)
  PointerFX                click pulse, tracking marker, target-lock brackets (+ in-canvas projector)
  SystemStatus             toast, sound toggle, hint bar
lib/
  content.ts               <- edit site content here
  screen/screenOS.ts       on-screen OS: boot sequence, menu, apps, terminal, arcade (2D canvas)
  screen/actions.ts        focus / exit / back / immersive actions
  terminal/registry.ts     TerminalCommandRegistry
  terminal/commands.ts     built-in commands
  hotspots.ts              callout definitions (GLB node + offset + text)
  controls.ts              GLB node -> control map
  deviceMaterials.ts       runtime emissive control (never edits the GLB)
  deviceAudio.ts           DeviceAudio (Web Audio, muted by default)
  store.ts                 Zustand device / UI state
  config.ts, webgl.ts, useIsMobile.ts
public/models/             nilkanta-n01.glb (exported from NILKANTA_N01_Master.blend)
```

## Deploy

Standard Next.js app — no environment variables are required. On Vercel: import the repository,
keep the detected **Next.js** preset, root directory `./`, build `next build`. Node 22.x (pinned in `package.json`).
The Blender master is intentionally not part of this repository.

## Notes

- The GLB is used as exported: original hierarchy, 61 named objects and 27 materials.
  It is uniformly scaled ×10 at load (real size is metres) — proportions are unchanged.
- One compatibility adjustment: `N01_Mat_Brushed_Dark_Metal` uses anisotropy, which three.js
  can only render with UVs/tangents. The model has no UVs, so anisotropy is switched off on
  that material at load time (logged in the browser console).
- Runtime effects (power, LED tint, touch glow) change material values in memory only; the GLB file is never modified.
- Typography: JetBrains Mono (self-hosted via `@fontsource/jetbrains-mono`, ligatures disabled) everywhere.
- Reduced motion: static ambient graph, no idle sway / particle drift / screen flicker / CSS loops.
- No post-processing. One shadow-casting light, contact shadows, adaptive DPR and a lighter
  floor/particle budget on small or low-power devices.
- If WebGL is unavailable, a static fallback message is shown; GLB load errors show a friendly error panel.
