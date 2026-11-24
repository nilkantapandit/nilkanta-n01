"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(max-width: 640px), (pointer: coarse) and (max-width: 900px)";

function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

/** True on phone-sized / coarse-pointer screens (callouts use a bottom sheet there). */
export function useIsMobile() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(QUERY).matches, () => false);
}
