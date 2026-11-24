"use client";

import { useEffect, useState } from "react";
import { useDevice } from "@/lib/store";
import { deviceAudio } from "@/lib/deviceAudio";

export function Toast() {
  const toast = useDevice((s) => s.toast);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!toast) return;
    setVisible(true);
    const id = window.setTimeout(() => setVisible(false), 3800);
    return () => window.clearTimeout(id);
  }, [toast]);
  if (!toast || !visible) return null;
  return <div key={toast.id} className="toast" role="status">{toast.text}</div>;
}

/** Sound is muted by default; turning it on is the user gesture that unlocks Web Audio. */
export function SoundToggle() {
  const on = useDevice((s) => s.soundOn);
  const set = useDevice((s) => s.setSoundOn);
  return (
    <button
      type="button"
      className="reset"
      aria-pressed={on}
      onClick={() => {
        if (on) { deviceAudio.disable(); set(false); } else { deviceAudio.enable(); set(true); deviceAudio.play("confirm"); }
      }}
    >
      sound
    </button>
  );
}

/** Bottom hint: shows what the hovered physical control does. */
export function HintBar() {
  const label = useDevice((s) => s.hoverLabel);
  const focus = useDevice((s) => s.screenFocus);
  const phase = useDevice((s) => s.screenPhase);
  const idle = phase === "off" ? "n-01 is off · press the ⏻ power key below the screen to boot" : phase === "shutdown" ? "shutting down · session discarded" : focus
    ? "wheel/swipe/arrows: move · ✓/enter: select · ✕/esc: back · ≡: menu"
    : "drag: rotate · scroll/pinch: zoom · click the screen: operate the n-01";
  return <span className={`hint${label ? " live" : ""}`}>{label ?? idle}</span>;
}
