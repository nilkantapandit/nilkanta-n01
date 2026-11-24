"use client";

/**
 * The field manual as a hologram standing beside the device (above it on portrait screens).
 * It lives in the 3D scene, so turning the view changes its perspective and the device hides
 * what is behind it. Zooming does not change it: the panel is scaled about the orbit target by the
 * same factor as the camera distance, which keeps its on-screen size and place fixed.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import { useDevice } from "@/lib/store";
import { HERO_DIRECTION, HERO_TARGET } from "@/lib/config";
import { fovFor, heroDistance } from "./CameraRig";
import { drawGuide, type HoloLayout } from "@/lib/guideHolo";

const noRaycast = () => null;

/** Where the panel sits in the hero view: NDC centre, NDC height, depth behind the target, yaw. */
const PLACE: Record<HoloLayout, { nx: number; ny: number; h: number; back: number; yaw: number }> = {
  side: { nx: 0.655, ny: 0.06, h: 1.36, back: 1.1, yaw: -0.24 },
  top: { nx: 0.0, ny: 0.6, h: 0.5, back: 0.9, yaw: 0 },
};

export default function GuideHologram() {
  const open = useDevice((s) => s.guideOpen);
  const immersive = useDevice((s) => s.immersive);
  const theme = useDevice((s) => s.theme);
  const size = useThree((s) => s.size);
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3 } | null;
  const aspect = size.width / size.height;
  const layout: HoloLayout = aspect >= 1.15 ? "side" : "top";

  const group = useRef<THREE.Group>(null);
  const scan = useRef<THREE.Mesh>(null);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const fade = useRef(0);
  const calm = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  const { tex } = useMemo(() => {
    const canvas = document.createElement("canvas");
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return { tex: t };
  }, []);
  const [ratio, setRatio] = useState(0.6);
  useEffect(() => {
    const canvas = tex.image as HTMLCanvasElement;
    const draw = () => { setRatio(drawGuide(canvas, layout, theme === "light" ? "light" : "dark")); tex.dispose(); tex.needsUpdate = true; };
    draw();
    let alive = true;
    document.fonts?.load(`700 30px "JetBrains Mono"`).then(() => alive && draw()).catch(() => {});
    return () => { alive = false; };
  }, [tex, layout, theme]);
  useEffect(() => () => tex.dispose(), [tex]);

  // Panel pose in the hero view, as an offset from the hero target (scale 1 = hero distance).
  const base = useMemo(() => {
    const p = PLACE[layout];
    const d0 = heroDistance(aspect);
    const T = new THREE.Vector3(...HERO_TARGET);
    const dir = new THREE.Vector3(...HERO_DIRECTION).normalize();
    const cam = T.clone().addScaledVector(dir, d0);
    const fwd = dir.clone().negate();
    const right = new THREE.Vector3().crossVectors(fwd, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, fwd);
    const D = d0 + p.back;
    const tanH = Math.tan(THREE.MathUtils.degToRad(fovFor(aspect) / 2));
    const centre = cam.clone().addScaledVector(fwd, D)
      .addScaledVector(right, p.nx * D * tanH * aspect)
      .addScaledVector(up, p.ny * D * tanH);
    const hgt = p.h * D * tanH;
    const o = new THREE.Object3D();
    o.position.copy(centre);
    o.up.set(0, 1, 0);
    o.lookAt(cam);
    o.rotateY(p.yaw);
    return { offset: centre.sub(T), quat: o.quaternion.clone(), w: hgt * ratio, h: hgt, d0 };
  }, [layout, aspect, ratio]);

  const target = useMemo(() => new THREE.Vector3(), []);
  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const want = open && !immersive ? 1 : 0;
    fade.current += (want - fade.current) * Math.min(1, dt * 6);
    g.visible = fade.current > 0.01;
    if (!g.visible) return;
    target.copy(controls?.target ?? new THREE.Vector3(...HERO_TARGET));
    const k = camera.position.distanceTo(target) / base.d0;
    g.position.copy(target).addScaledVector(base.offset, k);
    g.quaternion.copy(base.quat);
    g.scale.set(base.w * k, base.h * k, k);
    const t = state.clock.elapsedTime;
    const flicker = calm ? 1 : 0.93 + 0.07 * Math.sin(t * 23.0) * Math.sin(t * 3.1);
    if (mat.current) mat.current.opacity = fade.current * flicker;
    if (scan.current) {
      scan.current.visible = !calm;
      scan.current.position.y = 0.5 - ((t * 0.22) % 1);
      (scan.current.material as THREE.MeshBasicMaterial).opacity = 0.1 * fade.current;
    }
  });

  const light = theme === "light";
  return (
    <group ref={group} visible={false} renderOrder={5}>
      <mesh raycast={noRaycast} renderOrder={5}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial
          ref={mat}
          map={tex}
          transparent
          depthWrite={false}
          toneMapped={false}
          fog={false}
          blending={light ? THREE.NormalBlending : THREE.AdditiveBlending}
        />
      </mesh>
      <mesh ref={scan} raycast={noRaycast} renderOrder={6} scale={[1, 0.012, 1]} position-z={0.001}>
        <planeGeometry args={[1, 1]} />
        <meshBasicMaterial color={light ? "#e8650a" : "#ff8a2a"} transparent depthWrite={false} toneMapped={false} fog={false} blending={light ? THREE.NormalBlending : THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}
