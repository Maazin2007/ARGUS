// Geometry for the 3D body map, ported from the mockup (ARGUS_v13.html).
// These numbers are drawing geometry (model centimetres and canvas pixels), not medical values.

import type { IndicatorId } from "@/lib/types";

// Canvas size in CSS pixels. The canvas is scaled to its card with CSS, so all drawing uses these.
export const W = 560;
export const H = 640;

// Pinhole camera shared by the 2D overlay and the three.js figure, so both line up exactly:
// S = pixels per model cm, (CX, CY) = where the axis lands on the canvas, F = focal length in px.
export const S = 2.82;
export const CX = 318;
export const CY = 296;
export const F = 950;
// The tags that name each site sit in two columns: TX is the left edge of the right-hand
// column and LX the left edge of the left-hand column. Each tag is TAG_W by TAG_H pixels.
export const TX = 462;
export const LX = 6;
export const TAG_W = 92;
export const TAG_H = 34;
// Section plane height (model cm) when nothing is selected.
export const DEFAULT_PLANE_Y = 132;

type Vec3 = [number, number, number];

// The figure is built from two primitive kinds: ellipsoids and tapered capsules.
type Ellipsoid = { t: "e"; c: Vec3; r: Vec3 };
type Capsule = { t: "c"; a: Vec3; b: Vec3; ra: number; rb: number };
type Part = Ellipsoid | Capsule;

function buildParts(): Part[] {
  const parts: Part[] = [];
  const ell = (c: Vec3, r: Vec3) => parts.push({ t: "e", c, r });
  const cap = (a: Vec3, b: Vec3, ra: number, rb: number) => parts.push({ t: "c", a, b, ra, rb });
  // Head, neck, shoulders, torso, hips.
  ell([0, 167.5, 0], [10.2, 12, 11]);
  ell([0, 160, 1.6], [8.2, 8.5, 9.2]);
  cap([0, 146, 0], [0, 158, 0], 6, 5.3);
  ell([0, 146.5, 0], [13.5, 5, 7.2]);
  ell([0, 129, 0], [18.5, 19, 11.2]);
  ell([0, 107, 0], [14.2, 17, 9.4]);
  ell([0, 91, 0], [17, 11.5, 10.6]);
  // Arms and legs, mirrored left (s = -1) and right (s = 1).
  for (const s of [-1, 1]) {
    ell([s * 19.5, 142, 0], [8.5, 7.5, 7.2]);
    ell([s * 8.6, 134, 6.2], [8.6, 7, 5.6]);
    ell([s * 8, 90, -5.2], [8.6, 9, 7.2]);
    cap([s * 24, 140, 0], [s * 29, 112, 0], 5.1, 4.3);
    ell([s * 29, 112, 0], [4.4, 4.6, 4.4]);
    cap([s * 29, 112, 0], [s * 33, 85, 3], 4.2, 3.0);
    ell([s * 34, 76, 4], [2.8, 6.5, 2.3]);
    cap([s * 9, 88, 0], [s * 10, 50, 0], 8.6, 6);
    ell([s * 10, 50, 0.5], [5.9, 6.2, 6]);
    cap([s * 10, 50, 0], [s * 10, 9, 0], 5.6, 3.6);
    ell([s * 10, 36, -1.6], [5.2, 11, 5.6]);
    ell([s * 10, 8, 0], [3.8, 4.2, 3.8]);
    ell([s * 10, 3, 5], [4.5, 3, 10]);
  }
  return parts;
}

// Is point p inside primitive q? Used to hide ring points buried inside another part,
// so overlapping primitives read as one surface.
function inside(p: Vec3, q: Part): boolean {
  if (q.t === "e") {
    const dx = (p[0] - q.c[0]) / q.r[0];
    const dy = (p[1] - q.c[1]) / q.r[1];
    const dz = (p[2] - q.c[2]) / q.r[2];
    return dx * dx + dy * dy + dz * dz < 0.97;
  }
  const ab: Vec3 = [q.b[0] - q.a[0], q.b[1] - q.a[1], q.b[2] - q.a[2]];
  const ap: Vec3 = [p[0] - q.a[0], p[1] - q.a[1], p[2] - q.a[2]];
  let u = (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / (ab[0] * ab[0] + ab[1] * ab[1] + ab[2] * ab[2]);
  u = Math.max(0, Math.min(1, u));
  const r = q.ra + (q.rb - q.ra) * u;
  return Math.hypot(p[0] - q.a[0] - ab[0] * u, p[1] - q.a[1] - ab[1] * u, p[2] - q.a[2] - ab[2] * u) < r * 0.98;
}

// One point on a slice ring: position, outward normal in the horizontal plane, and whether it is visible.
export type RingPoint = { x: number; y: number; z: number; nx: number; nz: number; isVisible: boolean };
export type Ring = { y: number; points: RingPoint[] };

// Slice spacing in model cm.
const SLICE_CM = 2.6;

// Sample every primitive as horizontal rings (the "slices" of the wireframe).
function buildRings(): { rings: Ring[]; pointCount: number } {
  const parts = buildParts();
  const rings: Ring[] = [];
  let pointCount = 0;

  function ring(cx: number, y: number, cz: number, rx: number, rz: number, ownIndex: number) {
    // About one point every 1.9 cm around the ring, at least 8.
    const n = Math.max(8, Math.round((2 * Math.PI * (rx + rz)) / 2 / 1.9));
    const points: RingPoint[] = [];
    for (let i = 0; i < n; i++) {
      const th = (i / n) * 2 * Math.PI;
      const nx = Math.cos(th);
      const nz = Math.sin(th);
      const p: Vec3 = [cx + rx * nx, y, cz + rz * nz];
      const isVisible = !parts.some((q, j) => j !== ownIndex && inside(p, q));
      points.push({ x: p[0], y: p[1], z: p[2], nx, nz, isVisible });
      if (isVisible) pointCount++;
    }
    rings.push({ y, points });
  }

  parts.forEach((q, idx) => {
    if (q.t === "e") {
      for (let y = Math.ceil((q.c[1] - q.r[1]) / SLICE_CM) * SLICE_CM; y <= q.c[1] + q.r[1]; y += SLICE_CM) {
        let k = 1 - Math.pow((y - q.c[1]) / q.r[1], 2);
        if (k <= 0.02) continue; // skip the tiny rings at the very tips
        k = Math.sqrt(k);
        ring(q.c[0], y, q.c[2], q.r[0] * k, q.r[2] * k, idx);
      }
    } else {
      const y0 = Math.min(q.a[1], q.b[1]);
      const y1 = Math.max(q.a[1], q.b[1]);
      for (let y = Math.ceil(y0 / SLICE_CM) * SLICE_CM; y <= y1; y += SLICE_CM) {
        const u = (y - q.a[1]) / (q.b[1] - q.a[1]);
        const r = q.ra + (q.rb - q.ra) * u;
        ring(q.a[0] + (q.b[0] - q.a[0]) * u, y, q.a[2] + (q.b[2] - q.a[2]) * u, r, r, idx);
      }
    }
  });
  return { rings, pointCount };
}

// The wireframe never changes, so build it once on first use and share it between mounts.
let cachedRings: { rings: Ring[]; pointCount: number } | null = null;
export function getRings(): { rings: Ring[]; pointCount: number } {
  if (!cachedRings) cachedRings = buildRings();
  return cachedRings;
}

// A site on the figure, one per indicator.
// T, HR and BP sit where the reference cards say they are measured (forehead, chest, upper arm).
// GLU, SLP and MOOD have no site in the cards, so their positions are for display only:
// GLU on the hand, SLP and MOOD on either side of the head. They are not measurement instructions.
export type SiteRef = "T" | "HR" | "BP" | "GLU" | "SLP" | "MOOD";
export type Mark = {
  ref: SiteRef;
  id: IndicatorId;
  side: "left" | "right"; // which tag column the site's tag is in
  p: Vec3; // position in model cm (re-seated on the suit surface once the 3D model loads)
  n: [number, number]; // facing direction in the horizontal plane (x, z), to dim sites on the far side
  ty: number; // y of the middle of the tag on the canvas
  sx: number; // last drawn screen position, for hit-testing
  sy: number;
};

// Fresh marks for each mount, because the 3D model moves them onto its surface.
export function createMarks(): Mark[] {
  return [
    { ref: "T", id: "bodyTemperature", side: "right", p: [0, 171, 10.6], n: [0, 1], ty: 52, sx: 0, sy: 0 },
    { ref: "MOOD", id: "mood", side: "right", p: [10.2, 167.5, 0], n: [1, 0], ty: 100, sx: 0, sy: 0 },
    { ref: "HR", id: "heartRate", side: "right", p: [6, 132, 11.4], n: [0.2, 1], ty: 176, sx: 0, sy: 0 },
    { ref: "BP", id: "bloodPressure", side: "right", p: [29.6, 126, 2], n: [1, 0.25], ty: 224, sx: 0, sy: 0 },
    { ref: "SLP", id: "sleepDuration", side: "left", p: [-10.2, 167.5, 0], n: [-1, 0], ty: 70, sx: 0, sy: 0 },
    { ref: "GLU", id: "bloodGlucose", side: "left", p: [-34, 76, 6.3], n: [-1, 0.3], ty: 330, sx: 0, sy: 0 },
  ];
}

// Rotate a model point about the vertical axis (ca, sa = cos and sin of the yaw), then project it.
// Returns [screen x, screen y, rotated depth]. Model height 88 cm sits at the canvas centre line.
export function project(x: number, y: number, z: number, ca: number, sa: number): Vec3 {
  const xr = x * ca + z * sa;
  const zr = -x * sa + z * ca;
  const k = F / (F - zr * S);
  return [CX + xr * S * k, CY - (y - 88) * S * k, zr];
}
