import type * as THREE from "three";

/**
 * Shared, non-React state for the pointer effects (written from raycast handlers,
 * read by the in-canvas lock projector). Plain module state = no re-renders.
 */
export const pointerFx = {
  /** 3D control currently under the pointer (target-lock brackets follow its projected box). */
  target: null as THREE.Object3D | null,
  /** DOM element for the target-lock brackets. */
  lock: null as HTMLDivElement | null,
};

export function setHoverTarget(node: THREE.Object3D) {
  pointerFx.target = node;
}

/** Only clears if this node is still the target (over/out events can arrive out of order). */
export function clearHoverTarget(node: THREE.Object3D) {
  if (pointerFx.target === node) pointerFx.target = null;
}
