"use client";

import { useDevice } from "@/lib/store";
import { screenOS } from "./screenOS";

/** Enter screen-operating mode (camera moves in front of the screen and locks). */
export function focusScreen() {
  const s = useDevice.getState();
  if (!s.screenFocus) s.setScreenFocus(true);
}
/** Leave screen-operating mode and return to the cinematic hero view. */
export function exitScreen() {
  useDevice.getState().setScreenFocus(false);
}
/** Cancel / Back: back inside the OS; at the main menu it leaves the screen. */
export function backAction() {
  if (useDevice.getState().overlay !== "none") { useDevice.getState().closeOverlay(); return; }
  if (!screenOS.back()) exitScreen();
}
/** Fullscreen key: browser fullscreen + hidden HUD (immersive website mode). */
export async function toggleImmersive() {
  const s = useDevice.getState();
  const next = !s.immersive;
  try {
    if (next && !document.fullscreenElement && document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
    if (!next && document.fullscreenElement) await document.exitFullscreen();
  } catch {
    /* fullscreen can be refused (iframe / iOS) — immersive HUD mode still toggles */
  }
  s.setImmersive(next);
}
