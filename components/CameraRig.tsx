"use client";

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import gsap from "gsap";
import { useDevice } from "@/lib/store";
import { CAMERA_FOV, CAMERA_FOV_PORTRAIT, FRAME_HALF_WIDTH, HERO_DIRECTION, HERO_TARGET, MIN_HERO_DISTANCE } from "@/lib/config";

type Props = {
  resetSignal: number;
  idle: React.MutableRefObject<number>;
};

/** Hero distance that keeps the whole device in frame for the current aspect ratio. */
export function fovFor(aspect: number) {
  return aspect < 1 ? CAMERA_FOV_PORTRAIT : CAMERA_FOV;
}
function heroDistance(aspect: number) {
  const halfFov = THREE.MathUtils.degToRad(fovFor(aspect) / 2);
  const needed = FRAME_HALF_WIDTH / (Math.tan(halfFov) * Math.min(aspect, 1.6)) * (aspect < 1 ? 0.9 : 1);
  return Math.max(MIN_HERO_DISTANCE, needed);
}
function heroPosition(aspect: number) {
  const d = heroDistance(aspect);
  return new THREE.Vector3(...HERO_DIRECTION).normalize().multiplyScalar(d).add(new THREE.Vector3(...HERO_TARGET));
}

export default function CameraRig({ resetSignal, idle }: Props) {
  const focus = useDevice((s) => s.screenFocus);
  const controls = useRef<OrbitControlsImpl>(null);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);
  const resumeTimer = useRef<number | undefined>(undefined);
  const first = useRef(true);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") Object.assign(window, { __n01cam: camera, __gsap: gsap });
  }, [camera]);

  // Initial framing (and re-framing on resize until the user takes control).
  const userMoved = useRef(false);
  const aspect = size.width / size.height;
  const hero = heroDistance(aspect);
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    cam.fov = fovFor(aspect);
    cam.updateProjectionMatrix();
    if (userMoved.current && !first.current) return;
    camera.position.copy(heroPosition(aspect));
    controls.current?.target.set(...HERO_TARGET);
    controls.current?.update();
    first.current = false;
  }, [camera, aspect]);

  // Smooth GSAP return to the hero view.
  useEffect(() => {
    if (resetSignal === 0) return;
    const c = controls.current;
    if (!c) return;
    const to = heroPosition(size.width / size.height);
    gsap.killTweensOf([camera.position, c.target]);
    gsap.to(camera.position, { x: to.x, y: to.y, z: to.z, duration: 1.4, ease: "power3.inOut", onUpdate: () => c.update() });
    gsap.to(c.target, { x: HERO_TARGET[0], y: HERO_TARGET[1], z: HERO_TARGET[2], duration: 1.4, ease: "power3.inOut" });
    userMoved.current = false;
  }, [resetSignal]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pause idle motion while interacting; ease back in after a short rest.
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    let raf = 0;
    const fadeTo = (target: number, speed: number) => {
      cancelAnimationFrame(raf);
      const step = () => {
        idle.current += (target - idle.current) * speed;
        if (Math.abs(target - idle.current) > 0.001) raf = requestAnimationFrame(step);
        else idle.current = target;
      };
      raf = requestAnimationFrame(step);
    };
    const onStart = () => {
      userMoved.current = true;
      window.clearTimeout(resumeTimer.current);
      gsap.killTweensOf([camera.position, c.target]);
      fadeTo(0, 0.12);
    };
    const onEnd = () => {
      window.clearTimeout(resumeTimer.current);
      resumeTimer.current = window.setTimeout(() => fadeTo(1, 0.02), 3500);
    };
    c.addEventListener("start", onStart);
    c.addEventListener("end", onEnd);
    return () => {
      c.removeEventListener("start", onStart);
      c.removeEventListener("end", onEnd);
      window.clearTimeout(resumeTimer.current);
      cancelAnimationFrame(raf);
    };
  }, [camera, idle]);

  // Operating the screen no longer moves the camera: the N-01 stays at whatever angle the
  // visitor left it, rotation / zoom keep working, and every key stays clickable from there.
  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    if (focus) gsap.killTweensOf([camera.position, c.target]);
    c.enabled = true;
  }, [focus]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.06}
      rotateSpeed={0.55}
      zoomSpeed={0.6}
      minDistance={Math.min(1.5, hero * 0.42)}
      maxDistance={Math.max(7, hero * 1.35)}
      minPolarAngle={0.35}
      maxPolarAngle={1.72}
      target={HERO_TARGET}
    />
  );
}
