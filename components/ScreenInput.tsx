"use client";

import { useEffect, useRef, useState } from "react";
import { useDevice } from "@/lib/store";
import { screenOS } from "@/lib/screen/screenOS";
import { deviceAudio } from "@/lib/deviceAudio";
import { backAction, exitScreen } from "@/lib/screen/actions";

/**
 * Keyboard bridge for the physical screen. The terminal is drawn on the 3D display; this
 * component only owns an invisible text field that receives keystrokes (and raises the
 * on-screen keyboard on phones) plus arrow / enter / escape navigation for the other apps.
 */
let inputEl: HTMLInputElement | null = null;
export function focusScreenInput() {
  inputEl?.focus({ preventScroll: true });
}

const isOtherField = (el: Element | null) =>
  !!el && el !== inputEl && (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement);

export default function ScreenInput() {
  const focus = useDevice((s) => s.screenFocus);
  const app = useDevice((s) => s.screenApp);
  const phase = useDevice((s) => s.screenPhase);
  const ref = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(screenOS.term.input);

  useEffect(() => {
    inputEl = ref.current;
    screenOS.onInputChange = (v) => setValue(v);
    return () => { screenOS.onInputChange = null; inputEl = null; };
  }, []);

  // the terminal app owns the keyboard while the screen is being operated
  useEffect(() => {
    if (focus && app === "terminal" && phase === "online") focusScreenInput();
    else if (document.activeElement === ref.current) ref.current?.blur();
  }, [focus, app, phase]);

  // arrows / enter / escape drive the screen when it is in use (not while typing in the terminal)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useDevice.getState();
      if (!s.screenFocus || isOtherField(document.activeElement)) return;
      if (document.activeElement === ref.current && screenOS.app === "terminal") return; // handled by the field
      const map: Record<string, () => void> = {
        ArrowUp: () => screenOS.nav("up"), ArrowDown: () => screenOS.nav("down"),
        ArrowLeft: () => screenOS.nav("left"), ArrowRight: () => screenOS.nav("right"),
        KeyW: () => screenOS.nav("up"), KeyS: () => screenOS.nav("down"), KeyA: () => screenOS.nav("left"), KeyD: () => screenOS.nav("right"),
        Enter: () => screenOS.select(), // Space is push-to-talk
        Escape: () => backAction(), Backspace: () => backAction(),
      };
      const fn = map[e.code];
      if (fn) { e.preventDefault(); fn(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (screenOS.app !== "terminal") return;
    if (e.key !== "Tab") screenOS.resetTab();
    switch (e.key) {
      case "Enter": e.preventDefault(); void screenOS.submit(); break;
      case "Tab": e.preventDefault(); screenOS.tab(); break;
      case "ArrowUp": e.preventDefault(); screenOS.historyStep(-1); break;
      case "ArrowDown": e.preventDefault(); screenOS.historyStep(1); break;
      case "Escape": e.preventDefault(); backAction(); break;
      default:
        if (e.key.toLowerCase() === "l" && e.ctrlKey) { e.preventDefault(); screenOS.clearTerminal(); }
        else if (e.key.length === 1) deviceAudio.play("key");
    }
  };

  return (
    <>
      <input
        ref={ref}
        className="screen-input"
        value={value}
        onChange={(e) => { setValue(e.target.value); screenOS.setInput(e.target.value); }}
        onKeyDown={onKeyDown}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="send"
        aria-label="N-01 terminal input (shown on the device screen)"
        tabIndex={-1}
      />
      {focus && (
        <button type="button" className="screen-exit" onClick={() => { exitScreen(); deviceAudio.play("cancel"); }}>
          [esc] exit-screen
        </button>
      )}
    </>
  );
}
