"use client";

import type { Hotspot } from "@/lib/hotspots";

type Props = {
  hotspot: Hotspot;
  /** "float" = leader line + card next to the marker (desktop); "sheet" = fixed bottom card (mobile). */
  variant: "float" | "sheet";
  pinned?: boolean;
  onClose?: () => void;
};

/**
 * Dark technical information card with an animated thin white leader line.
 * In "float" mode the line length/angle and card side come from CSS variables
 * (--dx, --dy, --len, --ang, --tx, --ty) that HotspotProjector keeps inside the viewport.
 */
export default function TechnicalCallout({ hotspot, variant, pinned, onClose }: Props) {
  const body = (
    <div className={`callout-card ${variant}`} role="dialog" aria-label={`${hotspot.title} details`}>
      <div className="callout-head">
        <span className="callout-title">{hotspot.title}</span>
        {(pinned || variant === "sheet") && onClose && (
          <button className="callout-close" type="button" aria-label="Close" onClick={(e) => { e.stopPropagation(); onClose(); }}>×</button>
        )}
      </div>
      <div className="callout-sub">{hotspot.subtitle}</div>
      <ul className="callout-lines">
        {hotspot.lines.map((l) => <li key={l}>{l}</li>)}
      </ul>
      {hotspot.action && <div className="callout-action">{hotspot.action}</div>}
    </div>
  );

  if (variant === "sheet") return <div className="callout-sheet">{body}</div>;
  return (
    <>
      <div className="callout-line" aria-hidden><i /></div>
      <div className="callout-anchor">{body}</div>
    </>
  );
}
