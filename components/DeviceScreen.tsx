"use client";

import { useEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useDevice } from "@/lib/store";
import { screenOS, SCREEN_H, SCREEN_W } from "@/lib/screen/screenOS";

/**
 * The live display. A plane matching the screen's active area (84.6 × 56.4 mm, 3:2) is
 * parented to the GLB's N01_Display_Module node, 0.08 mm in front of the glass and behind
 * the bezel lip, so it follows every rotation and is framed by the real bezel.
 * Its texture is the Screen OS canvas.
 */
export const SCREEN_MESH_NAME = "N01_Screen_Surface";
const ACTIVE_W = 0.0846, ACTIVE_H = 0.0564;   // metres (GLB units)
const GLASS_FRONT_Z = -0.0003;                  // module-local z of the glass front face (from the GLB)

export default function DeviceScreen() {
  const root = useDevice((s) => s.modelRoot);
  const gl = useThree((s) => s.gl);

  const { texture, screen, glass } = useMemo(() => {
    const canvas = screenOS.getCanvas();
    screenOS.draw();
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, gl.capabilities.getMaxAnisotropy());
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(ACTIVE_W, ACTIVE_H),
      new THREE.MeshBasicMaterial({ map: texture, toneMapped: false })
    );
    screen.name = SCREEN_MESH_NAME;
    screen.position.set(0, 0, GLASS_FRONT_Z + 0.00008);
    screen.renderOrder = 1;

    // thin cover-glass sheen so the screen reads as being behind glass
    const glass = new THREE.Mesh(
      new THREE.PlaneGeometry(ACTIVE_W, ACTIVE_H),
      new THREE.MeshPhysicalMaterial({ color: "#000000", roughness: 0.12, metalness: 0, transparent: true, opacity: 0.16, depthWrite: false, clearcoat: 1, clearcoatRoughness: 0.08 })
    );
    glass.name = "N01_Screen_CoverGlass";
    glass.position.set(0, 0, GLASS_FRONT_Z + 0.00012);
    glass.raycast = () => {};
    glass.renderOrder = 2;
    return { texture, screen, glass };
  }, [gl]);

  // mount into the real display node
  useEffect(() => {
    const node = root?.getObjectByName("N01_Display_Module");
    if (!node) return;
    node.add(screen, glass);
    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __n01screen?: unknown }).__n01screen = { os: screenOS, mesh: screen, w: SCREEN_W, h: SCREEN_H };
    }
    // power-on: the display starts dark, then boots
    const id = screenOS.phase === "off" ? window.setTimeout(() => screenOS.boot(), 900) : undefined;
    return () => { node.remove(screen, glass); if (id) window.clearTimeout(id); };
  }, [root, screen, glass]);

  useEffect(() => () => { texture.dispose(); screen.geometry.dispose(); (screen.material as THREE.Material).dispose(); glass.geometry.dispose(); (glass.material as THREE.Material).dispose(); }, [texture, screen, glass]);

  useFrame((_, dt) => {
    if (screenOS.tick(Math.min(dt, 0.1))) texture.needsUpdate = true;
  });
  return null;
}
