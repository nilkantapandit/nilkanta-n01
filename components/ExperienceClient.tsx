"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { hasWebGL } from "@/lib/webgl";

const Experience = dynamic(() => import("./Experience"), { ssr: false });

export default function ExperienceClient() {
  const [webgl, setWebgl] = useState<boolean | null>(null);
  useEffect(() => setWebgl(hasWebGL()), []);

  if (webgl === null) return null;
  if (!webgl) {
    return (
      <div className="fallback">
        <div className="fallback-card">
          <h2>NILKANTA N-01</h2>
          <p>This interactive 3D preview needs WebGL, which isn&apos;t available in this browser or device.</p>
          <p>Try a current version of Chrome, Edge, Firefox or Safari with hardware acceleration enabled.</p>
        </div>
      </div>
    );
  }
  return <Experience />;
}
