"use client";

import PointerFX from "./PointerFX";
import { Component, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr, PerformanceMonitor, useProgress } from "@react-three/drei";
import * as THREE from "three";
import Scene from "./Scene";
import { CAMERA_FOV } from "@/lib/config";
import { useDevice } from "@/lib/store";
import { HOTSPOTS } from "@/lib/hotspots";
import { useIsMobile } from "@/lib/useIsMobile";
import TechnicalCallout from "./TechnicalCallout";
import DeviceHotspots from "./DeviceHotspots";
import ScreenInput from "./ScreenInput";
import OperatingModeSelector from "./OperatingModeSelector";
import EasterEggManager from "./EasterEggManager";
import { HintBar, SoundToggle, Toast } from "./SystemStatus";

/** Mobile: the pinned callout is shown as a bottom sheet instead of a floating card. */
function CalloutSheet() {
  const mobile = useIsMobile();
  const pinned = useDevice((s) => s.pinnedHotspot);
  const clear = useDevice((s) => s.clearPinnedHotspot);
  const h = HOTSPOTS.find((x) => x.id === pinned);
  if (!mobile || !h) return null;
  return <TechnicalCallout hotspot={h} variant="sheet" onClose={clear} />;
}

function Loader() {
  const { progress, active } = useProgress();
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!active && progress >= 100) {
      const t = window.setTimeout(() => setDone(true), 250);
      return () => window.clearTimeout(t);
    }
  }, [active, progress]);
  return (
    <div className={`loader${done ? " done" : ""}`} aria-hidden={done} role="status">
      <div className="loader-inner">
        {`nilkanta@n01:~$ `}<b>load</b>{` nilkanta-n01.glb\n`}
        {`[${"#".repeat(Math.round(progress / 5)).padEnd(20, ".")}] ${String(Math.round(progress)).padStart(3)}%  `}
        {progress >= 100 ? <span className="ok">[ OK ]</span> : "…"}
      </div>
    </div>
  );
}

class SceneErrorBoundary extends Component<{ children: React.ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error) { console.error("[N-01] scene error:", error); }
  render() {
    if (this.state.error) {
      return (
        <div className="fallback">
          <div className="fallback-card">
            <h2>NILKANTA N-01</h2>
            <p>The 3D model could not be loaded. Please refresh the page or try another browser.</p>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ThemeToggle() {
  const theme = useDevice((s) => s.theme);
  const setTheme = useDevice((s) => s.setTheme);
  return (
    <button className="reset" type="button" aria-pressed={theme === "light"} aria-label="Light theme" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
      light
    </button>
  );
}

export default function Experience() {
  const resetSignal = useDevice((s) => s.resetSignal);
  const immersive = useDevice((s) => s.immersive);
  const setImmersive = useDevice((s) => s.setImmersive);
  // leaving browser fullscreen (Esc / system UI) also leaves immersive mode
  useEffect(() => {
    const onFs = () => { if (!document.fullscreenElement && useDevice.getState().immersive) setImmersive(false); };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, [setImmersive]);
  const requestReset = useDevice((s) => s.requestReset);
  const clearPinned = useDevice((s) => s.clearPinnedHotspot);
  const calloutsVisible = useDevice((s) => s.calloutsVisible);
  const setCalloutsVisible = useDevice((s) => s.setCalloutsVisible);
  const lowPowerInitial = useMemo(
    () => typeof window !== "undefined" && (window.matchMedia("(max-width: 768px)").matches || (navigator.hardwareConcurrency ?? 8) <= 4),
    []
  );
  const [lowPower, setLowPower] = useState(lowPowerInitial);
  const [dpr, setDpr] = useState<[number, number]>(lowPowerInitial ? [1, 1.25] : [1, 1.5]);
  const reset = requestReset;

  return (
    <>
      <div className="canvas-wrap" onDoubleClick={() => { const s = useDevice.getState(); if (!s.hoverLabel && !s.screenFocus) reset(); }}>
        <SceneErrorBoundary>
          <Canvas
            shadows="percentage"
            dpr={dpr}
            camera={{ fov: CAMERA_FOV, near: 0.05, far: 60, position: [-2.2, 1.1, 3.4] }}
            onPointerMissed={() => clearPinned()}
            gl={{ antialias: true, stencil: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
          >
            <PerformanceMonitor onDecline={() => { setLowPower(true); setDpr([1, 1.25]); }} />
            <AdaptiveDpr pixelated={false} />
            <Scene resetSignal={resetSignal} lowPower={lowPower} />
          </Canvas>
        </SceneErrorBoundary>
      </div>

      <DeviceHotspots />

      <div className={`hud${immersive ? " hidden" : ""}`}>
        <div className="brand">
          <h1>NILKANTA <span>N-01</span></h1>
          <p><b>~/n01</b> portable linux computer · prototype</p>
        </div>
        <div className="hud-bottom">
          <HintBar />
          <div className="hud-actions">
            <ThemeToggle />
            <SoundToggle />
            <button className="reset" type="button" aria-pressed={calloutsVisible} onClick={() => setCalloutsVisible(!calloutsVisible)}>
              callouts
            </button>
            <button className="reset" type="button" onClick={reset} aria-label="Reset view">reset-view</button>
          </div>
        </div>
      </div>

      <OperatingModeSelector />
      <CalloutSheet />
      <ScreenInput />
      <EasterEggManager />
      <Toast />
      <PointerFX />
      <Loader />
    </>
  );
}
