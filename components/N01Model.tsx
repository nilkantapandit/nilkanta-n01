"use client";

import { pointerFx } from "@/lib/pointerFx";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Center, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { MODEL_SCALE, MODEL_URL } from "@/lib/config";
import { deckOf, useDevice } from "@/lib/store";
import { CONTROL_NODES, NO_RAYCAST_NODES, OCCLUDER_NODES } from "@/lib/controls";
import { initDeviceMaterials, prepareControlMaterials, setShellTheme } from "@/lib/deviceMaterials";
import { setupLeds } from "@/lib/deviceLeds";
import { fixBackArrow } from "@/lib/deviceIcons";
import { useControlHandlers } from "./DeviceControls";

const noRaycast: THREE.Object3D["raycast"] = () => {};
/** Only physical controls and the outer body shells are raycast — keeps pointer picking cheap. */
function raycastRole(o: THREE.Object3D): "control" | "occluder" | "none" {
  let n: THREE.Object3D | null = o;
  while (n) {
    if (NO_RAYCAST_NODES.has(n.name)) return "none";
    if (CONTROL_NODES[n.name]) return "control";
    if (OCCLUDER_NODES.has(n.name)) return "occluder";
    n = n.parent;
  }
  return "none";
}

type Props = {
  /** 0..1 — how much idle motion is applied (eased to 0 while the user interacts). */
  idle: React.MutableRefObject<number>;
};

/**
 * Loads the exported N-01 GLB as-is: original hierarchy, named objects and materials.
 * Only two compatibility adjustments are made at load time:
 *  - shadows are enabled on meshes;
 *  - anisotropy is switched off on materials whose meshes carry no UVs/tangents
 *    (three.js needs those for KHR_materials_anisotropy, otherwise shading breaks).
 */
let calmQuery: MediaQueryList | null = null;
/** prefers-reduced-motion: keep the device still (no presentation sway / float). */
function calmMotion() {
  if (typeof window === "undefined") return false;
  calmQuery ??= window.matchMedia("(prefers-reduced-motion: reduce)");
  return calmQuery.matches;
}

export default function N01Model({ idle }: Props) {
  const { scene } = useGLTF(MODEL_URL);
  const sway = useRef<THREE.Group>(null);
  const handlers = useControlHandlers();
  /** Extra idle damping: motion pauses while the visitor is aiming at / reading something. */
  const attention = useRef(1);
  const swayT = useRef(0);

  const report = useMemo(() => {
    let meshes = 0;
    let pickable = 0;
    const materials = new Set<string>();
    const anisoFixed = new Set<string>();
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (!mesh.isMesh) return;
      meshes++;
      if (raycastRole(mesh) === "none") mesh.raycast = noRaycast;
      else pickable++;
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      for (const m of mats) {
        materials.add(m.name);
        const phys = m as THREE.MeshPhysicalMaterial;
        if (phys.isMeshPhysicalMaterial && phys.anisotropy > 0 && !mesh.geometry.getAttribute("uv")) {
          phys.anisotropy = 0;
          phys.needsUpdate = true;
          anisoFixed.add(m.name);
        }
      }
    });
    fixBackArrow(scene);
    setupLeds(scene);
    prepareControlMaterials(scene, [
      "N01_Btn_Cancel", "N01_Btn_Menu", "N01_Btn_Power", "N01_Btn_Fullscreen", "N01_Btn_Confirm",
      "N01_Back_Button", "N01_Nav_Center_Button", "N01_Nav_Wheel",
    ]);
    const emissive = initDeviceMaterials(scene);
    return { meshes, pickable, emissive, materials: materials.size, anisoFixed: [...anisoFixed] };
  }, [scene]);

  // light theme → Flipper-white shell (runtime colour swap, reversible)
  const light = useDevice((s) => deckOf(s) === "light");
  useEffect(() => { setShellTheme(scene, light); }, [scene, light]);

  const setModelRoot = useDevice((s) => s.setModelRoot);
  useEffect(() => {
    setModelRoot(scene);
    return () => setModelRoot(null);
  }, [scene, setModelRoot]);

  useEffect(() => {
    // Lightweight load report for development (visible in the browser console).
    if (process.env.NODE_ENV !== "production") console.info(
      `[N-01] model loaded: ${report.meshes} meshes (${report.pickable} pickable), ${report.materials} materials, ${report.emissive} emissive` +
        (report.anisoFixed.length ? `; anisotropy disabled (no UVs) on: ${report.anisoFixed.join(", ")}` : "")
    );
  }, [report]);

  useFrame((state, delta) => {
    const g = sway.current;
    if (!g) return;
    const s = useDevice.getState();
    const busy = !!(s.hoveredHotspot || s.pinnedHotspot || s.hoverLabel || s.screenFocus || s.overlay !== "none" || s.freezeIdle || pointerFx.nearDevice || calmMotion());
    attention.current += ((busy ? 0 : 1) - attention.current) * (1 - Math.exp(-delta * (busy ? 6 : 1.2)));
    const w = idle.current * attention.current;
    // Slow presentation sway + float. Interaction *pauses* the sway clock instead of easing the
    // device back to its rest pose, so it holds whatever angle it is at (it never swings round to
    // face the camera when the screen or a key is used).
    swayT.current += delta * w;
    const st = swayT.current;
    const targetY = Math.sin(st * 0.22) * 0.38;
    const targetX = Math.sin(st * 0.17 + 1.3) * 0.045;
    const k = 1 - Math.exp(-delta * 2.2);
    g.rotation.y += (targetY - g.rotation.y) * k;
    g.rotation.x += (targetX - g.rotation.x) * k;
    g.position.y = Math.sin(st * 0.6) * 0.025;
  });

  return (
    <group ref={sway} {...handlers}>
      <Center>
        <primitive object={scene} scale={MODEL_SCALE} />
      </Center>
    </group>
  );
}

useGLTF.preload(MODEL_URL);
