"use client";

// The dashboard's "Body map" cell, ported from the mockup (ARGUS_v13.html).
// Two canvases are stacked: a three.js suit figure underneath (when WebGL and the model load) and a
// plain 2D overlay on top with the turntable, ruler, section plane and one site per indicator.
// If the 3D part fails, the overlay draws its own wireframe figure instead, so the card always works.

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { IndicatorId } from "@/lib/types";
import { useArgus } from "@/components/ArgusProvider";
import {
  COLOR_TOKENS,
  COLOR_TOKENS_DARK,
  INDICATORS,
  STATUS_TEXT,
  formatReading,
} from "@/lib/indicatorMeta";
import { uiSans } from "@/app/fonts";
import {
  DEFAULT_PLANE_Y,
  H,
  LX,
  TAG_H,
  TAG_W,
  TX,
  W,
  createMarks,
  getRings,
  type Mark,
  type SiteRef,
} from "@/components/bodymap/geometry";
import { drawOverlay, type SiteStyle } from "@/components/bodymap/drawOverlay";
import { startSolidFigure } from "@/components/bodymap/solidFigure";

export type BodyMapProps = {
  // The site highlighted from outside (a hovered dashboard row), or null.
  hot: IndicatorId | null;
  // Called when the pointer moves onto or off a site on the figure.
  onHotChange: (id: IndicatorId | null) => void;
  // Whether the card is in its enlarged layout, and the button that switches it.
  isWide: boolean;
  onToggleWide: () => void;
};

// The emergency screen's figure: one crewmember's stored readings, front view, held still.
export type EmergencyBodyMapProps = {
  crewId: string; // whose readings to show (the patient)
  only: IndicatorId[]; // the indicators the responder may see; the rest are not drawn
};

// Worst first: the site the emergency figure points its section plane at.
const ATTENTION_ORDER = ["red", "amber"] as const;

// Which indicator each site on the figure stands for (positions are in bodymap/geometry.ts).
const SITE_IDS: Record<SiteRef, IndicatorId> = {
  T: "bodyTemperature",
  HR: "heartRate",
  BP: "bloodPressure",
  GLU: "bloodGlucose",
  SLP: "sleepDuration",
  MOOD: "mood",
};
const SITE_REFS = Object.keys(SITE_IDS) as SiteRef[];

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

// The same figure on the emergency screen. It shows the patient's readings, faces front and does
// not move or respond to the pointer: nothing here should pull attention away from the steps.
// Sites within range are small quiet markers; only a site that needs review or is critical gets
// its tag, so the responder's eye goes straight to it.
export function EmergencyBodyMap({ crewId, only }: EmergencyBodyMapProps) {
  return <BodyMapFigure emergency={{ crewId, only }} />;
}

export function BodyMap(props: BodyMapProps) {
  return <BodyMapFigure dashboard={props} />;
}

const NO_DASHBOARD: BodyMapProps = { hot: null, onHotChange: () => {}, isWide: false, onToggleWide: () => {} };

function BodyMapFigure({ dashboard, emergency }: { dashboard?: BodyMapProps; emergency?: EmergencyBodyMapProps }) {
  const { hot, onHotChange, isWide, onToggleWide } = dashboard ?? NO_DASHBOARD;
  const { statusFor: statusForActive, statusForCrew } = useArgus();
  const statusFor = (id: IndicatorId) => (emergency ? statusForCrew(emergency.crewId, id) : statusForActive(id));
  const isEmergency = emergency !== undefined;
  const router = useRouter();
  const [view, setView] = useState("auto");
  const [hasGl, setHasGl] = useState(false);

  const overlayRef = useRef<HTMLCanvasElement>(null);
  // Empty box the three.js canvas is put into. The canvas itself is made in the effect below.
  const glHostRef = useRef<HTMLDivElement>(null);

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
  // The overlay looks the colour up from the status, so it follows the light or dark theme.
  // Each tag also shows the status symbol and the latest reading with its unit.
  const styles = Object.fromEntries(SITE_REFS.map((ref) => [ref, style(ref)])) as Record<SiteRef, SiteStyle>;
  function style(ref: SiteRef): SiteStyle {
    const id = SITE_IDS[ref];
    const { latest, result } = statusFor(id);
    return {
      status: result.status,
      isSquare: result.status !== "amber",
      symbol: STATUS_TEXT[result.status].symbol,
      value: latest ? formatReading(latest) : "--",
      unit: latest ? INDICATORS[id].unit : "",
      hidden: emergency ? !emergency.only.includes(id) : false,
      quiet: emergency ? result.status === "green" : false,
    };
  }
  const stylesRef = useRef(styles);
  // Emergency: the worst visible site, so the section plane and the highlight sit on the problem.
  const attentionSite: SiteRef | null = emergency
    ? (ATTENTION_ORDER.flatMap((status) =>
        SITE_REFS.filter((ref) => !styles[ref].hidden && styles[ref].status === status),
      )[0] ?? null)
    : null;
  const isEmergencyRef = useRef(isEmergency);

  useEffect(() => {
    stylesRef.current = styles;
    onHotChangeRef.current = onHotChange;
    routerRef.current = router;
  });

  // A hovered dashboard row moves the section plane, like the mockup's row hover.
  // On the emergency screen the site that needs attention takes that place.
  useEffect(() => {
    const ref = isEmergency ? attentionSite : siteFor(hot);
    hotRef.current = ref;
    if (ref) selectedRef.current = ref;
  }, [hot, isEmergency, attentionSite]);

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

    const { rings } = getRings();

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
    // Emergency: face front and hold still, whatever the motion setting.
    const isFixed = isEmergencyRef.current;
    if (isFixed) {
      m.isAuto = false;
      m.target = null;
      m.angle = 0;
    }

    const solid = startSolidFigure(glCanvas, marks, () => setHasGl(true));
    const fontFamily = uiSans.style.fontFamily;

    // Canvas cannot read CSS variables, so each frame picks the hex colours for the current theme,
    // read from <html data-theme="..."> (set by ThemeButton.tsx).
    const root = document.documentElement;

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
        colors: root.dataset.theme === "dark" ? COLOR_TOKENS_DARK : COLOR_TOKENS,
        fontFamily,
      });
    }
    frameId = requestAnimationFrame(frame);

    // Which site (marker or tag) is under the pointer, in canvas coordinates.
    function hit(e: PointerEvent): SiteRef | null {
      const b = cv.getBoundingClientRect();
      const x = ((e.clientX - b.left) * W) / b.width;
      const y = ((e.clientY - b.top) * H) / b.height;
      let found: SiteRef | null = null;
      for (const mk of marks) {
        const tagX = mk.side === "right" ? TX : LX;
        const isOnTag = x >= tagX && x <= tagX + TAG_W && Math.abs(y - mk.ty) <= TAG_H / 2;
        if (Math.hypot(x - mk.sx, y - mk.sy) < 14 || isOnTag) {
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
    // The emergency figure is read-only: no dragging, no hover, no opening an indicator page.
    if (isFixed) {
      cv.style.cursor = "default";
    } else {
      cv.addEventListener("pointerdown", onDown);
      cv.addEventListener("pointermove", onMove);
      cv.addEventListener("pointerup", onUp);
      cv.addEventListener("pointerleave", onLeave);
    }

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

  if (isEmergency) {
    return (
      <div style={{ maxWidth: 440 }}>
        <div className={hasGl ? "bm well has-gl" : "bm well"} style={{ margin: 0 }}>
          <div ref={glHostRef} />
          <canvas
            ref={overlayRef}
            id="bm"
            role="img"
            aria-label="Front view of a crewmember in a flight suit with the patient's latest stored readings marked at their sites. Sites that need review or are critical carry a tag with the reading. The same readings are in the Latest vitals list."
          />
        </div>
        <p className="hint" style={{ margin: "8px 0 0" }}>
          Latest stored readings, not live. Only sites that need attention are labelled.
        </p>
      </div>
    );
  }

  return (
    <div className="cell c4 flush">
      <div className="head">
        <div className="row">
          <h2>Body map</h2>
          <span className="hint">Drag to rotate · select a site to open it</span>
        </div>
        {/* Enlarges the body map and narrows the table, or puts them back. The icon's four
            corner arrows point outwards to enlarge and inwards to shrink. */}
        <button
          type="button"
          className="btn icon-btn"
          aria-pressed={isWide}
          aria-label={isWide ? "Shrink body map" : "Enlarge body map"}
          title={isWide ? "Shrink body map" : "Enlarge body map"}
          onClick={onToggleWide}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            {isWide ? (
              <path d="M7 2v5H2M11 2v5h5M7 16v-5H2M11 16v-5h5" />
            ) : (
              <path d="M2 7V2h5M16 7V2h-5M2 11v5h5M16 11v5h-5" />
            )}
          </svg>
        </button>
      </div>
      <div className={hasGl ? "bm well has-gl" : "bm well"}>
        {/* The three.js canvas goes in here (see the effect above). No styles, so the canvas
            is still placed against .bm, exactly as before. */}
        <div ref={glHostRef} />
        <canvas
          ref={overlayRef}
          id="bm"
          role="img"
          aria-label="Rotating 3D model of a crewmember in a flight suit on a turntable, with one tagged site per indicator showing its status and latest reading: T on the forehead, HR on the chest, BP on the upper arm, GLU on the hand, SLP and MOOD beside the head. The same readings are in the table."
        />
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
        <span className="hint">T, HR and BP are at their measurement sites. GLU, SLP and MOOD are placed for display only.</span>
      </div>
    </div>
  );
}
