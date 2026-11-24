"use client";

/**
 * Field manual — a plain-language "how to use the N-01" overlay for visitors who don't live in a
 * terminal. A wireframe of the device face with numbered parts, what each one does, a 4-step quick
 * start and the mouse / keyboard basics. Opens once on a first visit; `[?] guide` or "?" reopens it.
 */
import { useEffect } from "react";
import { useDevice } from "@/lib/store";

const SEEN_KEY = "n01-guide-seen";

const PARTS: [string, string, string][] = [
  ["1", "Screen", "click it to use the N-01 · click a menu item to open it"],
  ["2", "Wheel", "click a side, or scroll over it, to move up / down"],
  ["3", "Centre · ✓", "open / select the highlighted item"],
  ["4", "✕ · ↺", "go back one step"],
  ["5", "≡", "jump to the main menu"],
  ["6", "⏻ Power", "boot the N-01 · press again to shut it down"],
  ["7", "⛶", "fullscreen (hides this page's buttons)"],
  ["8", "Touch pad", "swipe to move · tap to select"],
  ["9", "Mode switch", "FIELD_COMMS ⇄ SECURE_MODE (also in the top-right panel)"],
];

function Schematic() {
  // rough wireframe of the device face (not to scale) — numbers match the list
  const badge = (n: string, x: number, y: number, lx: number, ly: number) => (
    <g key={`${n}-${lx}-${ly}`}>
      <line x1={x} y1={y} x2={lx} y2={ly} className="g-lead" />
      <circle cx={lx} cy={ly} r={9} className="g-badge" />
      <text x={lx} y={ly + 3.5} className="g-num">{n}</text>
    </g>
  );
  return (
    <svg viewBox="0 0 600 300" className="g-svg" role="img" aria-label="Wireframe of the N-01 front with numbered controls">
      <defs>
        <pattern id="g-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" className="g-gridline" />
        </pattern>
      </defs>
      <rect x="0" y="0" width="600" height="300" fill="url(#g-grid)" />
      {/* body */}
      <path d="M70 52 H520 L560 92 V232 L530 262 H70 L40 232 V92 Z" className="g-body" />
      {/* carry loop + mode switch on the top edge */}
      <path d="M470 52 V30 H520 V52" className="g-part" />
      <rect x="92" y="42" width="40" height="10" className="g-part g-hot" />
      {/* touch pad */}
      <rect x="66" y="112" width="84" height="84" rx="14" className="g-part" />
      <rect x="78" y="124" width="60" height="60" rx="8" className="g-part g-dim" />
      {/* screen */}
      <rect x="180" y="74" width="230" height="150" rx="6" className="g-part" />
      <rect x="190" y="84" width="210" height="130" className="g-screen" />
      <text x="200" y="104" className="g-scr">01 SYSTEM</text>
      <text x="200" y="122" className="g-scr g-sel">02 DEVOPS ◂</text>
      <text x="200" y="140" className="g-scr">03 PROJECTS</text>
      <text x="200" y="158" className="g-scr">…</text>
      {/* keys */}
      {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={210 + i * 36} y={234} width={28} height={16} rx="3" className={`g-part${i === 2 ? " g-hot" : ""}`} />)}
      <text x="224" y="246" className="g-key">✕</text><text x="260" y="246" className="g-key">≡</text>
      <text x="296" y="246" className="g-key">⏻</text><text x="332" y="246" className="g-key">⛶</text><text x="368" y="246" className="g-key">✓</text>
      {/* wheel + back */}
      <circle cx="482" cy="140" r="46" className="g-part g-hot" />
      <circle cx="482" cy="140" r="16" className="g-part" />
      <circle cx="514" cy="214" r="13" className="g-part" />
      <text x="514" y="218" className="g-key">↺</text>
      {badge("1", 300, 84, 300, 20)}
      {badge("2", 515, 112, 585, 112)}
      {badge("3", 482, 140, 585, 160)}
      {badge("4", 524, 222, 585, 240)}
      {badge("5", 260, 250, 260, 288)}
      {badge("6", 296, 250, 296, 288)}
      {badge("7", 332, 250, 332, 288)}
      {badge("8", 66, 154, 16, 154)}
      {badge("9", 112, 42, 112, 14)}
      {badge("4", 224, 250, 224, 288)}
      {badge("3", 368, 250, 368, 288)}
    </svg>
  );
}

export function GuideButton() {
  const setGuide = useDevice((s) => s.setGuideOpen);
  return (
    <button className="reset" type="button" aria-label="How to use" title="How to use the N-01 (?)" onClick={() => setGuide(true)}>
      ? guide
    </button>
  );
}

export default function Guide() {
  const open = useDevice((s) => s.guideOpen);
  const setGuide = useDevice((s) => s.setGuideOpen);
  const ready = useDevice((s) => !!s.modelRoot);

  // first visit: open once the model is on screen
  useEffect(() => {
    if (!ready) return;
    let seen = false;
    try { seen = window.localStorage.getItem(SEEN_KEY) === "1"; } catch {}
    if (!seen) setGuide(true);
  }, [ready, setGuide]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const typing = t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement;
      if (open && (e.key === "Escape" || e.key === "Enter")) { e.preventDefault(); e.stopImmediatePropagation(); close(); }
      else if (!open && e.key === "?" && !typing) setGuide(true);
    };
    const close = () => {
      try { window.localStorage.setItem(SEEN_KEY, "1"); } catch {}
      setGuide(false);
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, setGuide]);

  if (!open) return null;
  const close = () => {
    try { window.localStorage.setItem(SEEN_KEY, "1"); } catch {}
    setGuide(false);
  };
  return (
    <div className="guide" role="dialog" aria-modal="true" aria-labelledby="guide-title" onClick={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div className="guide-card">
        <header className="guide-head">
          <span id="guide-title">N01 // FIELD MANUAL</span>
          <button type="button" className="guide-x" onClick={close} aria-label="Close guide">[esc] close</button>
        </header>
        <p className="guide-lede">No Linux needed. The N-01 is a pretend handheld computer — use it with your mouse (or finger) like a real gadget.</p>

        <ol className="guide-steps">
          <li><b>1</b> Press <kbd>⏻</kbd> (middle key under the screen) to switch it on.</li>
          <li><b>2</b> Click the screen to start using it.</li>
          <li><b>3</b> Pick an app: click it, or use the wheel / arrow keys and <kbd>✓</kbd> / <kbd>Enter</kbd>.</li>
          <li><b>4</b> <kbd>✕</kbd> / <kbd>Esc</kbd> goes back. In TERMINAL, type <code>help</code> and press <kbd>Enter</kbd>.</li>
        </ol>

        <Schematic />

        <dl className="guide-parts">
          {PARTS.map(([n, name, what]) => (
            <div key={n + name}><dt><span>{n}</span>{name}</dt><dd>{what}</dd></div>
          ))}
        </dl>

        <div className="guide-cols">
          <section>
            <h3>$ mouse / touch</h3>
            <p>drag the background — rotate · scroll / pinch — zoom</p>
            <p>orange dots — parts info (click one) · <code>reset-view</code> — back to start</p>
          </section>
          <section>
            <h3>$ keyboard</h3>
            <p><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> move · <kbd>Enter</kbd> open · <kbd>Esc</kbd> back</p>
            <p>hold <kbd>Space</kbd> — push-to-talk (FIELD_COMMS, simulated) · <kbd>?</kbd> — this guide</p>
          </section>
        </div>

        <footer className="guide-foot">
          <span># everything here is a visual simulation — nothing is transmitted or encrypted</span>
          <button type="button" className="reset" onClick={close}>got it</button>
        </footer>
      </div>
    </div>
  );
}
