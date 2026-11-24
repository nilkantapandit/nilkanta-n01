"use client";

/**
 * Field-manual controls. The manual itself is a hologram in the 3D scene (GuideHologram); this
 * file only owns showing / hiding it: on by default, remembered per browser, toggled with the
 * `guide` button or the `?` key.
 */
import { useEffect } from "react";
import { useDevice } from "@/lib/store";

const KEY = "n01-guide";
const remember = (on: boolean) => { try { window.localStorage.setItem(KEY, on ? "on" : "off"); } catch {} };

export function GuideButton() {
  const open = useDevice((s) => s.guideOpen);
  const setGuide = useDevice((s) => s.setGuideOpen);
  return (
    <button className="reset" type="button" aria-pressed={open} aria-label="How to use" title="Show / hide the how-to manual (?)"
      onClick={() => { setGuide(!open); remember(!open); }}>
      guide
    </button>
  );
}

export default function Guide() {
  const setGuide = useDevice((s) => s.setGuideOpen);
  useEffect(() => {
    let on = true;
    try { on = window.localStorage.getItem(KEY) !== "off"; } catch {}
    setGuide(on);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "?") return;
      const t = e.target as HTMLElement | null;
      if (t instanceof HTMLTextAreaElement || (t instanceof HTMLInputElement && !(t.classList.contains("screen-input") && useDevice.getState().screenApp !== "terminal"))) return;
      const next = !useDevice.getState().guideOpen;
      setGuide(next); remember(next);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setGuide]);
  return null;
}
