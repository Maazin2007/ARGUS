"use client";

// The dashboard's "Body map" cell, ported from the mockup (ARGUS_v13.html).
// Two canvases are stacked: a three.js suit figure underneath (when WebGL and the model load) and a
// plain 2D overlay on top with the turntable, ruler, section plane and the three measurement sites.
// If the 3D part fails, the overlay draws its own wireframe figure instead, so the card always works.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { IndicatorId } from "@/lib/types";
import { useArgus } from "@/components/ArgusProvider";
import { STATUS_COLOR } from "@/lib/indicatorMeta";
import { geistSans } from "@/app/fonts";
import {
  DEFAULT_PLANE_Y,
  H,
  TX,
  W,
  createMarks,
  getRings,
  type Mark,
  type SiteRef,
} from "@/components/bodymap/geometry";
import { drawOverlay, formatYaw, type SiteStyle } from "@/components/bodymap/drawOverlay";
import { startSolidFigure } from "@/components/bodymap/solidFigure";

export type BodyMapProps = {
  // The site highlighted from outside (a hovered dashboard row), or null.
  hot: IndicatorId | null;
  // Called when the pointer moves onto or off a site on the figure.
  onHotChange: (id: IndicatorId | null) => void;
};

// Which indicator each site on the body stands for. GLU, SLP and MOOD have no single site.
const SITE_IDS: Record<SiteRef, IndicatorId> = { T: "bodyTemperature", HR: "heartRate", BP: "bloodPressure" };

function siteFor(id: IndicatorId | null): SiteRef | null {
  if (!id) return null;
  const entry = Object.entries(SITE_IDS).find(([, value]) => value === id);
  return entry ? (entry[0] as SiteRef) : null;
}

const VIEWS: { v: string; label: string }[] = [
  { v: "auto", label: "Auto" },
  { v: "0", label: "Front" },
  { v: "90", label: "Left" },
  { v: "180", label: "Back" },
  { v: "-90", label: "Right" },
];

// Animation state that changes every frame. Kept in a ref, not React state, so 60 updates a
// second do not re-render the component.
type Motion = {
  angle: number;
  target: number | null; // angle a view button is easing towards
  isAuto: boolean; // slow sway
  isDragging: boolean;
  dragMoved: number; // px dragged, to tell a click from a drag
  lastX: number;
  swayStart: number; // timestamp the sway started
};

export function BodyMap({ hot, onHotChange }: BodyMapProps) {
  const { statusFor } = useArgus();
  const router = useRouter();
  const [view, setView] = useState("auto");
  const [hasGl, setHasGl] = useState(false);

  const overlayRef = useRef<HTMLCanvasElement>(null);
  // Empty box the three.js canvas is put into. The canvas itself is made in the effect below.
  const glHostRef = useRef<HTMLDivElement>(null);
  const yawRef = useRef<HTMLSpanElement>(null);
  const ringsRef = useRef<HTMLSpanElement>(null);
  const pointsRef = useRef<HTMLSpanElement>(null);
  const sectionRef = useRef<HTMLSpanElement>(null);

  const motion = useRef<Motion>({
    angle: 0.4,
    target: null,
    isAuto: true,
    isDragging: false,
    dragMoved: 0,
    lastX: 0,
    swayStart: 0,
  });
  // Site hovered here or on a dashboard row; `selected` remembers the last one, so the
  // section plane stays at that site after the pointer leaves (HR to start, like the mockup).
  const hotRef = useRef<SiteRef | null>(null);
  const selectedRef = useRef<SiteRef>("HR");
  const onHotChangeRef = useRef(onHotChange);
  const routerRef = useRef(router);

  // Marker colour and shape come from the real status: triangle for amber, square otherwise.
  const styles: Record<SiteRef, SiteStyle> = { T: style("T"), HR: style("HR"), BP: style("BP") };
  function style(ref: SiteRef): SiteStyle {
    const status = statusFor(SITE_IDS[ref]).result.status;
    return { color: STATUS_COLOR[status], isSquare: status !== "amber" };
  }
  const stylesRef = useRef(styles);

  useEffect(() => {
    stylesRef.current = styles;
    onHotChangeRef.current = onHotChange;
    routerRef.current = router;
  });

  // A hovered dashboard row moves the section plane, like the mockup's row hover.
  useEffect(() => {
    const ref = siteFor(hot);
    hotRef.current = ref;
    if (ref) selectedRef.current = ref;
  }, [hot]);

  // Set up both canvases, and tear everything down in the cleanup.
  // Next.js keeps a page you leave alive but hidden (React <Activity>): it runs this cleanup when you
  // leave the dashboard and runs the effect again when you come back, on the SAME DOM elements.
  // The cleanup kills the WebGL context (forceContextLoss), and a canvas whose context was killed
  // can never draw WebGL again. So every run makes a brand-new canvas for three.js and removes it
  // in the cleanup, instead of reusing one canvas from the JSX.
  useEffect(() => {
    const overlay = overlayRef.current;
    const glHost = glHostRef.current;
    const context = overlay?.getContext("2d");
    if (!overlay || !glHost || !context) return;
    const glCanvas = document.createElement("canvas");
    glCanvas.className = "bm-gl";
    glCanvas.setAttribute("aria-hidden", "true");
    glHost.appendChild(glCanvas);
    // Typed copies, so the functions below know these are never null.
    const cv: HTMLCanvasElement = overlay;
    const ctx: CanvasRenderingContext2D = context;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = W * dpr;
    cv.height = H * dpr;
    ctx.scale(dpr, dpr);

    const { rings, pointCount } = getRings();
    if (ringsRef.current) ringsRef.current.textContent = String(rings.length);
    if (pointsRef.current) pointsRef.current.textContent = pointCount.toLocaleString("en-US");

    const marks: Mark[] = createMarks();
    const m = motion.current;
    let planeY = DEFAULT_PLANE_Y;
    let frameId = 0;

    // Reduced motion: no sway, hold the starting angle.
    const isStill = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    if (isStill) {
      m.isAuto = false;
      m.angle = 0.4;
    }

    const solid = startSolidFigure(glCanvas, marks, () => setHasGl(true));
    const fontFamily = geistSans.style.fontFamily;

    function frame(ts: number) {
      frameId = requestAnimationFrame(frame);
      // Skip work while the card is hidden (offsetParent is null when not displayed).
      if (!cv || cv.offsetParent === null) return;
      if (!m.isDragging) {
        if (m.target !== null) {
          const d = m.target - m.angle;
          if (Math.abs(d) < 0.004) {
            m.angle = m.target;
            m.target = null;
          } else m.angle += d * 0.14;
        } else if (m.isAuto) {
          if (!m.swayStart) m.swayStart = ts;
          m.angle = 0.4 + 0.8 * Math.sin((ts - m.swayStart) / 3000);
        }
      }
      // Ease the section plane towards the hot (or last selected) site's height.
      const focus = hotRef.current ?? selectedRef.current;
      const wantY = marks.find((mk) => mk.ref === focus)?.p[1] ?? DEFAULT_PLANE_Y;
      planeY += (wantY - planeY) * 0.14;
      if (Math.abs(wantY - planeY) < 0.05) planeY = wantY;

      const isSolid = solid.render(Math.cos(m.angle), Math.sin(m.angle));
      drawOverlay({
        ctx,
        angle: m.angle,
        planeY,
        isSolid,
        rings,
        marks,
        hot: hotRef.current,
        styles: stylesRef.current,
        fontFamily,
      });
      if (sectionRef.current) sectionRef.current.textContent = Math.round(planeY) + " cm";
      if (yawRef.current) yawRef.current.textContent = formatYaw(m.angle);
    }
    frameId = requestAnimationFrame(frame);

    // Which site (marker or REF tag) is under the pointer, in canvas coordinates.
    function hit(e: PointerEvent): SiteRef | null {
      const b = cv.getBoundingClientRect();
      const x = ((e.clientX - b.left) * W) / b.width;
      const y = ((e.clientY - b.top) * H) / b.height;
      let found: SiteRef | null = null;
      for (const mk of marks) {
        if (Math.hypot(x - mk.sx, y - mk.sy) < 14 || (x >= TX && x <= TX + 48 && Math.abs(y - mk.ty) <= 12)) {
          found = mk.ref;
        }
      }
      return found;
    }

    function setHot(ref: SiteRef | null) {
      if (hotRef.current === ref) return;
      hotRef.current = ref;
      if (ref) selectedRef.current = ref;
      onHotChangeRef.current(ref ? SITE_IDS[ref] : null);
      cv.style.cursor = ref ? "pointer" : m.isDragging ? "grabbing" : "grab";
    }

    function onDown(e: PointerEvent) {
      m.isDragging = true;
      m.dragMoved = 0;
      m.lastX = e.clientX;
      cv.setPointerCapture(e.pointerId);
    }
    function onMove(e: PointerEvent) {
      if (m.isDragging) {
        const dx = e.clientX - m.lastX;
        m.dragMoved += Math.abs(dx);
        m.lastX = e.clientX;
        // More than 3 px counts as a drag, so a slightly shaky click still opens the site.
        if (m.dragMoved > 3) {
          m.angle += dx * 0.012;
          m.target = null;
          if (m.isAuto) {
            m.isAuto = false;
            setView("none");
          }
        }
      } else setHot(hit(e));
    }
    function onUp(e: PointerEvent) {
      m.isDragging = false;
      const site = hit(e);
      if (m.dragMoved <= 3 && site) routerRef.current.push(`/indicator/${SITE_IDS[site]}`);
    }
    function onLeave() {
      if (!m.isDragging) setHot(null);
    }
    cv.addEventListener("pointerdown", onDown);
    cv.addEventListener("pointermove", onMove);
    cv.addEventListener("pointerup", onUp);
    cv.addEventListener("pointerleave", onLeave);

    return () => {
      cancelAnimationFrame(frameId);
      cv.removeEventListener("pointerdown", onDown);
      cv.removeEventListener("pointermove", onMove);
      cv.removeEventListener("pointerup", onUp);
      cv.removeEventListener("pointerleave", onLeave);
      solid.dispose();
      glCanvas.remove();
      // React keeps state while the page is hidden, so say "no 3D yet": the wireframe and its
      // read-outs show until the new canvas has loaded the model again.
      setHasGl(false);
    };
  }, []);

  function chooseView(v: string) {
    const m = motion.current;
    setView(v);
    if (v === "auto") {
      m.isAuto = true;
      m.target = null;
      m.swayStart = 0;
    } else {
      m.isAuto = false;
      const goal = (Number(v) * Math.PI) / 180;
      // Take the short way round to the chosen view.
      m.target = m.angle + Math.atan2(Math.sin(goal - m.angle), Math.cos(goal - m.angle));
    }
  }

  return (
    <div className="cell c4 flush">
      <div className="head">
        <h2>
          <span className="ix mono">01</span>Body map
        </h2>
        <span className="hint">Drag to rotate · hover a site to section it</span>
      </div>
      <div className={hasGl ? "bm well has-gl" : "bm well"}>
        {/* The three.js canvas goes in here (see the effect above). No styles, so the canvas
            is still placed against .bm, exactly as before. */}
        <div ref={glHostRef} />
        <canvas
          ref={overlayRef}
          id="bm"
          role="img"
          aria-label="Rotating 3D model of a crewmember in a flight suit on a turntable, with three measurement sites: T on the forehead, HR on the chest, BP on the upper arm"
        />
        <div className="bm-ro">
          <div>
            <span className="lbl">Yaw</span>
            <span className="mono" ref={yawRef}>
              +000°
            </span>
          </div>
          {/* The slice and point counts describe the wireframe, so they hide once the solid model shows. */}
          <div style={hasGl ? { display: "none" } : undefined}>
            <span className="lbl">Slices</span>
            <span className="mono" ref={ringsRef}>
              0
            </span>
          </div>
          <div style={hasGl ? { display: "none" } : undefined}>
            <span className="lbl">Points</span>
            <span className="mono" ref={pointsRef}>
              0
            </span>
          </div>
          <div>
            <span className="lbl">Sites</span>
            <span className="mono">3</span>
          </div>
          <div>
            <span className="lbl">Section</span>
            <span className="mono" ref={sectionRef}>
              {`${DEFAULT_PLANE_Y} cm`}
            </span>
          </div>
        </div>
      </div>
      <div className="bm-bar">
        <span className="lbl">View</span>
        <div className="seg" role="group" aria-label="View">
          {VIEWS.map(({ v, label }) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => chooseView(v)}>
              {label}
            </button>
          ))}
        </div>
        <span style={{ flex: 1 }} />
        <span className="hint">GLU, SLP and MOOD have no single site. Use the list.</span>
      </div>
    </div>
  );
}
