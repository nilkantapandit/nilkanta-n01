import type * as THREE from "three";
import type { ControlId } from "@/lib/controls";
import type { Dir } from "@/lib/screen/screenOS";

export type Magnet = { id: ControlId; node: THREE.Object3D; x: number; y: number; dir?: Dir };

/**
 * Shared, non-React state for the pointer effects (written from raycast handlers,
 * read by the in-canvas lock projector). Plain module state = no re-renders.
 */
export const pointerFx = {
  /** 3D control currently under the pointer (target-lock brackets follow its projected box). */
  target: null as THREE.Object3D | null,
  /** DOM element for the target-lock brackets. */
  lock: null as HTMLDivElement | null,
  /** Pointer in CSS px (mouse only) and whether it is over the 3D scene. */
  px: -1, py: -1, overScene: false,
  /** Nearest control within reach of the pointer when nothing is hit directly ("sticky" cursor). */
  magnet: null as Magnet | null,
  /** Pointer is over / near the device: the idle sway pauses so targets don't drift away. */
  nearDevice: false,
  /** performance.now() of the last pointerdown a control handled directly. */
  lastDirectHit: 0,
  /** Set by the control handlers: performs a control's action (used for magnetic clicks). */
  findMagnet: null as ((x: number, y: number, reach?: number) => Magnet | null) | null,
  activate: null as ((id: ControlId, node: THREE.Object3D, dir?: Dir) => void) | null,
};

export function setHoverTarget(node: THREE.Object3D) {
  pointerFx.target = node;
}

/** Only clears if this node is still the target (over/out events can arrive out of order). */
export function clearHoverTarget(node: THREE.Object3D) {
  if (pointerFx.target === node) pointerFx.target = null;
}

if (typeof window !== "undefined" && process.env.NODE_ENV !== "production") (window as unknown as { __pfx: typeof pointerFx }).__pfx = pointerFx;
