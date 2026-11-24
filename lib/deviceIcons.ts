"use client";

import * as THREE from "three";

/**
 * Runtime fix for the Back key's icon (the GLB is left untouched): the modelled ↺ has its
 * arrowhead floating beside the arc. Hide it and draw a clean one — an open ring with the gap at
 * the top-left and an arrowhead on the arc's end pointing back (anticlockwise).
 */
export function fixBackArrow(root: THREE.Object3D) {
  const btn = root.getObjectByName("N01_Back_Button");
  if (!btn || btn.userData.n01ArrowFixed) return;
  let icon: THREE.Mesh | null = null;
  btn.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && !Array.isArray(m.material) && m.material.name === "N01_Mat_Port_Interior") icon = m;
  });
  if (!icon) return;
  const old = icon as THREE.Mesh;

  const cx = 0, cy = 0.0002, ro = 0.0025, ri = 0.0017, rm = (ro + ri) / 2;
  const a0 = THREE.MathUtils.degToRad(165), a1 = THREE.MathUtils.degToRad(100 + 360); // gap 100°–165°
  const ring = new THREE.Shape();
  ring.moveTo(cx + ro * Math.cos(a0), cy + ro * Math.sin(a0));
  ring.absarc(cx, cy, ro, a0, a1, false);
  ring.lineTo(cx + ri * Math.cos(a1), cy + ri * Math.sin(a1));
  ring.absarc(cx, cy, ri, a1, a0, true);
  ring.closePath();
  // arrowhead at the a1 end, pointing along the anticlockwise tangent
  const r = new THREE.Vector2(Math.cos(a1), Math.sin(a1));
  const t = new THREE.Vector2(-Math.sin(a1), Math.cos(a1));
  const base = new THREE.Vector2(cx, cy).addScaledVector(r, rm).addScaledVector(t, -0.00012);
  const hw = 0.00095, hl = 0.0013;
  const head = new THREE.Shape([
    base.clone().addScaledVector(r, hw),
    base.clone().addScaledVector(t, hl + 0.00012),
    base.clone().addScaledVector(r, -hw),
  ]);
  const geo = new THREE.ExtrudeGeometry([ring, head], { depth: 0.0003, bevelEnabled: false, curveSegments: 24 });
  geo.translate(0, 0, 0.0018);
  const arrow = new THREE.Mesh(geo, old.material);
  arrow.name = "N01_Back_Button_Icon";
  arrow.position.copy(old.position); arrow.quaternion.copy(old.quaternion); arrow.scale.copy(old.scale);
  old.parent!.add(arrow);
  old.visible = false;
  btn.userData.n01ArrowFixed = true;
}
