"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { hasWebGL } from "@/lib/webgl";

const Experience = dynamic(() => import("./Experience"), { ssr: false });
const MobileTerminal = dynamic(() => import("./MobileTerminal"), { ssr: false });

/** Phones get the terminal-only view (no 3D) unless the visitor chose "load 3D anyway". */
const PHONE = "(max-width: 640px), (pointer: coarse) and (max-width: 900px)";

export default function ExperienceClient() {
  const [mode, setMode] = useState<"3d" | "terminal" | null>(null);
  const [forced, setForced] = useState(false);
  useEffect(() => {
    let force = false;
    try { force = localStorage.getItem("n01-force-3d") === "1"; } catch {}
    const phone = window.matchMedia(PHONE).matches;
    setForced(phone && force);
    setMode((phone && !force) || !hasWebGL() ? "terminal" : "3d");
  }, []);

  if (mode === null) return null;
  if (mode === "terminal") return <MobileTerminal />;
  return (
    <>
      <Experience />
      {forced && (
        <button type="button" className="mt-3d-back" onClick={() => { try { localStorage.removeItem("n01-force-3d"); } catch {} location.reload(); }}>
          ◀ terminal mode
        </button>
      )}
    </>
  );
}
