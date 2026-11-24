"use client";

/**
 * Phone view: no 3D. The N-01's own screen plays the boot sequence, then the page becomes a
 * readable, scrollable terminal (same commands and session as the device's TERMINAL app), with
 * one-tap command chips and a note that the full 3D experience lives on desktop.
 */
import { useEffect, useRef, useState } from "react";
import { useDevice } from "@/lib/store";
import { screenOS } from "@/lib/screen/screenOS";
import type { Line } from "@/lib/terminal/registry";

const CHIPS = ["about", "experience", "skills", "projects", "contact", "cheat docker", "cheat kubectl", "help", "clear"];
export const FORCE_3D_KEY = "n01-force-3d";

function TermLine({ l }: { l: Line }) {
  if (l.kind === "link" && l.href) {
    const ext = !/^(mailto|tel):/.test(l.href);
    return <div className="mt-l mt-link"><a href={l.href} target={ext ? "_blank" : undefined} rel="noopener">{l.text}</a></div>;
  }
  return <div className={`mt-l mt-${l.kind}`}>{l.text || " "}</div>;
}

export default function MobileTerminal() {
  const screenRef = useRef<HTMLDivElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const phase = useDevice((s) => s.screenPhase);
  const app = useDevice((s) => s.screenApp);
  const lines = useDevice((s) => s.terminal.lines);
  const input = useDevice((s) => s.terminal.input);
  const theme = useDevice((s) => s.theme);
  const [booted, setBooted] = useState(false);
  const [auto, setAuto] = useState(false);

  // the device screen canvas, driven by its own clock (no 3D scene on phones)
  useEffect(() => {
    const host = screenRef.current;
    if (!host) return;
    const canvas = screenOS.getCanvas();
    canvas.className = "mt-canvas";
    host.appendChild(canvas);
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      screenOS.tick(Math.min((now - last) / 1000, 0.1));
      last = now;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const t = window.setTimeout(() => { if (screenOS.phase === "off") screenOS.boot(); setAuto(true); }, 500);
    return () => { cancelAnimationFrame(raf); window.clearTimeout(t); if (canvas.parentNode === host) host.removeChild(canvas); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { document.documentElement.dataset.theme = theme; screenOS.setTheme(theme === "light" ? "light" : "dark"); }, [theme]);

  // once online, go straight to the terminal
  useEffect(() => {
    if (phase === "online" && !booted) { setBooted(true); screenOS.openApp("terminal"); }
    if (phase === "off") setBooted(false);
  }, [phase, booted]);

  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }); }, [lines]);

  const showTerminal = phase === "online" && app === "terminal";
  const run = async (cmd: string) => { screenOS.setInput(cmd); await screenOS.submit(); };

  return (
    <div className="mt">
      <div className="mt-note" role="note">
        <b>N-01 · terminal mode</b>
        <span>The full 3D device (rotate it, press its keys, watch the LEDs) is built for desktop. Open this link on a computer for the best experience.</span>
        <button type="button" onClick={() => { try { localStorage.setItem(FORCE_3D_KEY, "1"); } catch {} location.reload(); }}>load 3D anyway ›</button>
      </div>

      <div className={`mt-screen${showTerminal ? " hidden" : ""}`} ref={screenRef}>
        {phase === "off" && auto && (
          <button type="button" className="mt-boot" onClick={() => screenOS.boot()}>⏻ tap to boot</button>
        )}
        {phase === "online" && app !== "terminal" && (
          <button type="button" className="mt-back" onClick={() => screenOS.openApp("terminal")}>◀ back to terminal</button>
        )}
      </div>

      {showTerminal && (
        <>
          <div className="mt-log" ref={logRef} onClick={() => inputRef.current?.focus()}>
            {lines.map((l, i) => <TermLine key={i} l={l} />)}
            <form className="mt-prompt" onSubmit={(e) => { e.preventDefault(); void screenOS.submit(); }}>
              <span>nilkanta@n01:~$</span>
              <input
                ref={inputRef}
                className="mt-input"
                value={input}
                onChange={(e) => screenOS.setInput(e.target.value)}
                autoCapitalize="off" autoCorrect="off" autoComplete="off" spellCheck={false}
                enterKeyHint="go" aria-label="Terminal command"
              />
            </form>
          </div>
          <div className="mt-chips" aria-label="Quick commands">
            {CHIPS.map((c) => <button key={c} type="button" onClick={() => void run(c)}>{c}</button>)}
          </div>
        </>
      )}
    </div>
  );
}
