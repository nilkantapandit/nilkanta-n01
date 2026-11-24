"use client";

import { Suspense, useMemo, useRef } from "react";
import { ContactShadows, Environment, Lightformer, MeshReflectorMaterial, Sparkles } from "@react-three/drei";
import N01Model from "./N01Model";
import CameraRig from "./CameraRig";
import { HotspotProjector } from "./DeviceHotspots";
import { ModeEffects } from "./OperatingModeSelector";
import DeviceScreen from "./DeviceScreen";
import AmbientGraph from "./AmbientGraph";
import { TargetLockProjector } from "./PointerFX";
import { DiagnosticsProbe } from "./EasterEggManager";
import { FLOOR_Y } from "@/lib/config";
import { useDevice } from "@/lib/store";

type Props = { resetSignal: number; lowPower: boolean };

export default function Scene({ resetSignal, lowPower }: Props) {
  const idle = useRef(1);
  const light = useDevice((s) => s.theme === "light");
  const bg = light ? "#e7e5e0" : "#050506";
  const calm = useMemo(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);

  return (
    <>
      <color attach="background" args={[bg]} />
      <fog attach="fog" args={[bg, light ? 4.5 : 6, light ? 10 : 15]} />

      {/* Soft ambient base so the charcoal enclosure never goes fully black */}
      <ambientLight intensity={light ? 0.32 : 0.1} color="#f2ece6" />
      <hemisphereLight args={["#cfd2d8", light ? "#8f8a82" : "#050505", light ? 0.55 : 0.22]} />

      {/* Cinematic orange key (casts the only shadow map) */}
      <spotLight
        position={[-4.2, 5.2, 4.4]}
        angle={0.42}
        penumbra={0.85}
        intensity={50}
        color="#ffe3cf"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0002}
        shadow-normalBias={0.02}
      />
      {/* Orange rim from behind to separate the silhouette */}
      <spotLight position={[3.6, 2.6, -4.6]} angle={0.5} penumbra={1} intensity={110} color="#ff6414" />
      <spotLight position={[-4.5, 1.4, -3.2]} angle={0.55} penumbra={1} intensity={45} color="#ff7a1a" />
      {/* Cool, low fill so orange controls and enclosure details stay readable */}
      <directionalLight position={[4, 2.2, 3.5]} intensity={0.55} color="#d6ddff" />

      {/* Procedural studio reflections (no external HDR download) */}
      <Environment resolution={256} frames={1} environmentIntensity={0.55}>
        <Lightformer form="rect" intensity={1.6} color="#ffffff" scale={[10, 2, 1]} position={[0, 6, -2]} rotation-x={Math.PI / 2} />
        <Lightformer form="rect" intensity={1.6} color="#ff7a1a" scale={[2, 6, 1]} position={[-6, 1, 2]} rotation-y={Math.PI / 2} />
        <Lightformer form="rect" intensity={2.4} color="#ff5a10" scale={[8, 1.2, 1]} position={[2, 0.5, -6]} />
        <Lightformer form="ring" intensity={0.8} color="#ffd9b8" scale={3} position={[5, 3, 4]} target={[0, 0, 0]} />
      </Environment>

      <Suspense fallback={null}>
        <N01Model idle={idle} />
        <HotspotProjector />
        <DeviceScreen />
        <ModeEffects />
      </Suspense>

      {/* Dark reflective presentation floor */}
      <mesh rotation-x={-Math.PI / 2} position={[0, FLOOR_Y, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <MeshReflectorMaterial
          resolution={256}
          blur={[200, 60]}
          mixBlur={1}
          mixStrength={light ? 0.6 : 1.4}
          mixContrast={1}
          mirror={light ? 0.3 : 0.6}
          depthScale={1.1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.3}
          roughness={0.9}
          metalness={0.5}
          color={light ? "#f3f1ec" : "#0a0909"}
        />
      </mesh>
      <ContactShadows position={[0, FLOOR_Y + 0.002, 0]} opacity={light ? 0.4 : 0.55} scale={6} blur={2.4} far={1.6} resolution={256} color="#000000" />

      {/* Subtle atmospheric particles */}
      <Sparkles count={lowPower ? 30 : 50} scale={[9, 4, 9]} position={[0, 0.8, 0]} size={1.8} speed={calm ? 0 : 0.22} noise={calm ? 0 : 0.6} opacity={light ? 0.5 : 0.35} color={light ? "#e8700a" : "#ff8a3d"} />

      {/* Faint coordinate grid / node graph, stencilled so it stays behind the device */}
      <AmbientGraph lowPower={lowPower} />
      <TargetLockProjector />

      <CameraRig resetSignal={resetSignal} idle={idle} />
      <DiagnosticsProbe />
    </>
  );
}
