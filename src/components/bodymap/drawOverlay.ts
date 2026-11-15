// Draws one frame of the body map's 2D overlay, ported from the mockup (ARGUS_v13.html).
// Everything here is drawing: turntable, height ruler, wireframe slices, section plane, sites and tags.
// Each of the six sites has a marker on the figure and a tag with its code, status symbol and latest reading.

import { H, LX, TAG_H, TAG_W, TX, W, project as P, type Mark, type Ring, type SiteRef } from "./geometry";
import type { ColorTokens } from "@/lib/indicatorMeta";
import type { Status } from "@/lib/types";

// What the overlay needs to draw one site: its status (colour, marker shape and symbol)
// and the latest reading for its tag.
export type SiteStyle = {
  status: Status;
  isSquare: boolean; // marker shape: triangle for amber, square otherwise
  symbol: string; // the status symbol from STATUS_TEXT, so status never relies on colour alone
  value: string; // latest reading, already formatted, or "--"
  unit: string;
  // Emergency mode only. hidden: the site is not drawn at all (the responder may not see it).
  // quiet: a small marker with no tag, so only the sites that need attention carry a label.
  hidden?: boolean;
  quiet?: boolean;
};

export type OverlayFrame = {
  ctx: CanvasRenderingContext2D;
  angle: number; // yaw in radians
  planeY: number; // section plane height, model cm
  isSolid: boolean; // true when the three.js figure is drawn underneath
  rings: Ring[];
  marks: Mark[];
  hot: SiteRef | null;
  styles: Record<SiteRef, SiteStyle>;
  colors: ColorTokens; // hex colours for the current theme (light or dark)
  fontFamily: string;
};

const TAU = 6.2832;

// "#12161A" with alpha 0.5 becomes "rgba(18,22,26,0.500)". Canvas has no other way to fade a hex colour.
function fade(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${alpha.toFixed(3)})`;
}

function seg(ctx: CanvasRenderingContext2D, a: number[], b: number[], color: string) {
  ctx.strokeStyle = color;
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
}

export function drawOverlay(f: OverlayFrame) {
  const { ctx, rings, marks, planeY, isSolid, hot, styles, colors } = f;
  const INK = colors.ink;
  const MUTED = colors.muted;
  const ca = Math.cos(f.angle);
  const sa = Math.sin(f.angle);
  const font = (weight: number, px: number) => `${weight} ${px}px ${f.fontFamily}, ui-monospace, monospace`;
  let p: number[];
  let q: number[];

  ctx.clearRect(0, 0, W, H);
  ctx.lineWidth = 1;

  // Turntable: the ticks rotate with the model, the black index mark stays fixed at the front.
  const R = 46;
  const steps = 72;
  ctx.strokeStyle = fade(MUTED, 0.35);
  ctx.beginPath();
  for (let i = 0; i <= steps; i++) {
    p = P(R * Math.cos((i / steps) * TAU), -3, R * Math.sin((i / steps) * TAU), 1, 0);
    if (i) ctx.lineTo(p[0], p[1]);
    else ctx.moveTo(p[0], p[1]);
  }
  ctx.stroke();
  for (let i = 0; i < 24; i++) {
    const th = (i / 24) * TAU;
    const isMajor = i % 6 === 0;
    const len = isMajor ? 8 : 4;
    p = P(R * Math.cos(th), -3, R * Math.sin(th), ca, sa);
    q = P((R + len) * Math.cos(th), -3, (R + len) * Math.sin(th), ca, sa);
    ctx.strokeStyle = fade(MUTED, isMajor ? 0.9 : 0.45);
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    ctx.lineTo(q[0], q[1]);
    ctx.stroke();
  }
  p = P(0, -3, R + 14, 1, 0);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(p[0], p[1] - 6);
  ctx.lineTo(p[0] - 5, p[1] + 3);
  ctx.lineTo(p[0] + 5, p[1] + 3);
  ctx.closePath();
  ctx.fill();

  // Height ruler in model centimetres, with a pointer at the section plane.
  ctx.font = font(400, 9);
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  p = P(-60, 0, 0, 1, 0);
  q = P(-60, 180, 0, 1, 0);
  ctx.strokeStyle = fade(MUTED, 0.5);
  ctx.beginPath();
  ctx.moveTo(p[0], p[1]);
  ctx.lineTo(q[0], q[1]);
  ctx.stroke();
  for (let i = 0; i <= 180; i += 10) {
    p = P(-60, i, 0, 1, 0);
    const isBig = i % 30 === 0;
    ctx.beginPath();
    ctx.moveTo(p[0], p[1]);
    ctx.lineTo(p[0] - (isBig ? 8 : 4), p[1]);
    ctx.stroke();
    if (isBig) {
      ctx.fillStyle = MUTED;
      ctx.fillText(String(i), p[0] - 12, p[1]);
    }
  }
  p = P(-60, planeY, 0, 1, 0);
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(p[0] + 2, p[1]);
  ctx.lineTo(p[0] + 10, p[1] - 5);
  ctx.lineTo(p[0] + 10, p[1] + 5);
  ctx.closePath();
  ctx.fill();

  // Wireframe slice rings (only without the solid figure): far side faint first,
  // then the near side, darker the more it faces the viewer.
  if (!isSolid) {
    for (let pass = 0; pass < 2; pass++) {
      for (const ring of rings) {
        const pts = ring.points;
        const n = pts.length;
        let prev: number[] | null = null;
        let prevFacing = 0;
        for (let j = 0; j <= n; j++) {
          const pt = pts[j % n];
          const facing = -pt.nx * sa + pt.nz * ca;
          const cur = pt.isVisible ? P(pt.x, pt.y, pt.z, ca, sa) : null;
          if (cur && prev && j > 0) {
            const m = (facing + prevFacing) / 2;
            if (pass === 0 && m < 0) seg(ctx, prev, cur, fade(INK, 0.07));
            else if (pass === 1 && m >= 0) seg(ctx, prev, cur, fade(INK, 0.16 + 0.62 * m));
          }
          prev = cur;
          prevFacing = facing;
        }
      }
    }
  }

  // Section plane: a dashed circle at the selected site's height.
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = fade(INK, 0.6);
  ctx.beginPath();
  for (let i = 0; i <= 48; i++) {
    p = P(44 * Math.cos((i / 48) * TAU), planeY, 44 * Math.sin((i / 48) * TAU), 1, 0);
    if (i) ctx.lineTo(p[0], p[1]);
    else ctx.moveTo(p[0], p[1]);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Inset top-down cross-section at the plane (wireframe mode only), and the slice drawn whole.
  if (!isSolid) {
    const IX = 18;
    const IY = H - 146;
    const IS = 128;
    const icx = IX + IS / 2;
    const icy = IY + IS / 2 + 8;
    ctx.fillStyle = colors.panel;
    ctx.fillRect(IX, IY, IS, IS);
    ctx.strokeStyle = colors.line2;
    ctx.strokeRect(IX + 0.5, IY + 0.5, IS - 1, IS - 1);
    ctx.strokeStyle = colors.line;
    ctx.beginPath();
    ctx.moveTo(icx, IY + 18);
    ctx.lineTo(icx, IY + IS - 4);
    ctx.moveTo(IX + 4, icy);
    ctx.lineTo(IX + IS - 4, icy);
    ctx.stroke();
    ctx.lineWidth = 1.5;
    for (const ring of rings) {
      // Rings within half a slice of the plane.
      if (Math.abs(ring.y - planeY) > 1.31) continue;
      const pts = ring.points;
      const n = pts.length;
      let prev: number[] | null = null;
      let prevInset: number[] | null = null;
      for (let j = 0; j <= n; j++) {
        const pt = pts[j % n];
        const cur = pt.isVisible ? P(pt.x, pt.y, pt.z, ca, sa) : null;
        const inset = pt.isVisible
          ? [icx + (pt.x * ca + pt.z * sa) * 1.25, icy + (-pt.x * sa + pt.z * ca) * 1.25]
          : null;
        if (cur && prev && prevInset && inset && j > 0) {
          seg(ctx, prev, cur, fade(INK, 0.95));
          seg(ctx, prevInset, inset, fade(INK, 0.9));
        }
        prev = cur;
        prevInset = inset;
      }
    }
    ctx.lineWidth = 1;
    for (const m of marks) {
      if (styles[m.ref].hidden) continue;
      if (Math.abs(m.p[1] - planeY) < 4) {
        ctx.fillStyle = colors[styles[m.ref].status];
        ctx.fillRect(
          icx + (m.p[0] * ca + m.p[2] * sa) * 1.25 - 3,
          icy + (-m.p[0] * sa + m.p[2] * ca) * 1.25 - 3,
          6,
          6,
        );
      }
    }
    ctx.font = font(500, 9);
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillStyle = MUTED;
    ctx.fillText("SECTION  Z " + Math.round(planeY), IX + 7, IY + 10);
    ctx.textAlign = "center";
    ctx.fillText("FRONT", icx, IY + IS - 8);
  }

  // Sites with leader lines to their tags. Sites on the far side are dimmed and dashed.
  for (const m of marks) {
    q = P(m.p[0], m.p[1], m.p[2], ca, sa);
    const facing = -m.n[0] * sa + m.n[1] * ca;
    const isVisible = facing > -0.1;
    const isOn = hot === m.ref;
    const { status, isSquare, symbol, value, unit, hidden, quiet } = styles[m.ref];
    const color = colors[status];
    m.sx = q[0];
    m.sy = q[1];
    if (hidden) continue;
    if (quiet) {
      // A small marker in the status colour and shape, with no leader line and no tag.
      ctx.globalAlpha = isVisible ? 0.75 : 0.3;
      ctx.fillStyle = color;
      if (isSquare) {
        ctx.fillRect(q[0] - 3.5, q[1] - 3.5, 7, 7);
      } else {
        ctx.beginPath();
        ctx.moveTo(q[0], q[1] - 5);
        ctx.lineTo(q[0] + 5, q[1] + 4);
        ctx.lineTo(q[0] - 5, q[1] + 4);
        ctx.closePath();
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      continue;
    }

    // Tag box: left column or right column. The leader meets the edge that faces the figure.
    const tagX = m.side === "right" ? TX : LX;
    const tagY = m.ty - TAG_H / 2;
    const edgeX = m.side === "right" ? tagX : tagX + TAG_W;
    const elbowX = m.side === "right" ? edgeX - 22 : edgeX + 22;

    ctx.strokeStyle = isOn ? INK : fade(MUTED, isVisible ? 0.75 : 0.3);
    ctx.setLineDash(isVisible ? [] : [3, 4]);
    ctx.beginPath();
    ctx.moveTo(q[0], q[1]);
    ctx.lineTo(elbowX, m.ty);
    ctx.lineTo(edgeX, m.ty);
    ctx.stroke();
    ctx.setLineDash([]);

    // Marker on the figure: a soft disc in the status colour, the shape, then a frame around it.
    ctx.globalAlpha = isVisible ? 1 : 0.35;
    ctx.fillStyle = fade(color, isOn ? 0.34 : 0.2);
    ctx.beginPath();
    ctx.arc(q[0], q[1], isOn ? 15 : 12, 0, TAU);
    ctx.fill();
    ctx.fillStyle = color;
    if (isSquare) {
      ctx.fillRect(q[0] - 4.5, q[1] - 4.5, 9, 9);
    } else {
      // Triangle for amber, so the status does not rely on colour alone.
      ctx.beginPath();
      ctx.moveTo(q[0], q[1] - 6);
      ctx.lineTo(q[0] + 6, q[1] + 5);
      ctx.lineTo(q[0] - 6, q[1] + 5);
      ctx.closePath();
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = color;
    ctx.strokeRect(Math.round(q[0]) - 9.5, Math.round(q[1]) - 9.5, 19, 19);

    // Tag: code and status symbol on the first line, latest reading and unit on the second.
    ctx.fillStyle = colors.panel;
    ctx.fillRect(tagX, tagY, TAG_W, TAG_H);
    ctx.strokeStyle = isOn ? INK : colors.line2;
    ctx.strokeRect(tagX + 0.5, tagY + 0.5, TAG_W - 1, TAG_H - 1);
    // A bar in the status colour down the edge of the tag that faces the figure.
    ctx.fillStyle = color;
    ctx.fillRect(m.side === "right" ? tagX : tagX + TAG_W - 3, tagY, 3, TAG_H);

    const textX = tagX + (m.side === "right" ? 10 : 7);
    const textEnd = tagX + TAG_W - (m.side === "right" ? 7 : 10);
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.font = font(600, 10);
    ctx.fillStyle = MUTED;
    ctx.fillText(m.ref, textX, tagY + 10);
    ctx.textAlign = "right";
    ctx.font = font(600, 11);
    ctx.fillStyle = color;
    ctx.fillText(symbol, textEnd, tagY + 10);
    ctx.textAlign = "left";
    ctx.font = font(600, 13);
    ctx.fillStyle = INK;
    ctx.fillText(value, textX, tagY + 24);
    const valueWidth = ctx.measureText(value).width;
    ctx.font = font(400, 9);
    ctx.fillStyle = MUTED;
    ctx.fillText(unit, textX + valueWidth + 3, tagY + 25);
  }
}
