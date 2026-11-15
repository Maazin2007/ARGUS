"use client";

import { useMemo, useState } from "react";
import type { Environment, IndicatorId, Reading, Status, StatusResult } from "@/lib/types";
import { getStatus } from "@/lib/status";
import { missionDate } from "@/components/ArgusProvider";
import {
  INDICATORS,
  STATUS_COLOR,
  STATUS_TEXT,
  contextLabel,
  fmt,
  readingValues,
  ruleFor,
} from "@/lib/indicatorMeta";
import { COLOR_VAR } from "@/lib/indicatorMeta";

// The chart covers the 14 mission days ending today, like the mockup (MD-199 to MD-212).
const CHART_DAYS = 14;
// Mission days (counted from the first day shown) that get a number under the axis.
// Same pattern as the mockup: 199, 202, 205, 208 and 212.
const LABELLED_OFFSETS = [0, 3, 6, 9, 13];

// Plot area inside the 760x300 viewBox (same paddings as the mockup).
const PX0 = 52;
const PX1 = 748;
const PY0 = 28;
const PY1 = 268;

// Display greys from the mockup. SVG attributes cannot read CSS variables, so they come from the shared tokens.
const GREY = COLOR_VAR.muted;
const GRID = COLOR_VAR.line;
const AXIS = COLOR_VAR.line2;
const INK = COLOR_VAR.ink;

// One drawn reading. `ys` and `values` hold one entry per series (two for blood pressure).
type ChartPoint = {
  x: number;
  day: number;
  ys: number[];
  values: number[];
  status: Status;
  context: string;
};

type StripChartProps = {
  id: IndicatorId;
  history: Reading[]; // every reading of this indicator, oldest first
  latest: Reading | null;
  result: StatusResult;
  environment: Environment;
  missionDay: number;
  legendNote: string;
};

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

// x position of a mission day: the first day sits at 80, the last at 720.
function xForDay(day: number, firstDay: number): number {
  return 80 + ((day - firstDay) * 640) / (CHART_DAYS - 1);
}

// y position of a value. Values outside the axis are pinned to its edge so a wild reading stays visible.
function yForValue(v: number, min: number, max: number): number {
  const clamped = Math.max(min, Math.min(max, v));
  return round1(PY1 - ((clamped - min) / (max - min)) * (PY1 - PY0));
}

// The mockup's strip chart (`drawChart` + hover), drawn with JSX instead of an HTML string.
export function StripChart({
  id,
  history,
  latest,
  result,
  environment,
  missionDay,
  legendNote,
}: StripChartProps) {
  const meta = INDICATORS[id];
  const isBp = id === "bloodPressure";
  const { min, max, step } = meta.chartAxis;
  const axisDecimals = step < 1 ? 1 : 0;
  const firstDay = missionDay - (CHART_DAYS - 1);

  // Hover is remembered together with the indicator it belongs to, so switching
  // indicators clears it without remounting the chart.
  const [hover, setHover] = useState<{ id: IndicatorId; index: number }>({ id, index: -1 });
  const hoverIndex = hover.id === id ? hover.index : -1;
  const show = (index: number) => setHover({ id, index });

  const dayX = (day: number) => xForDay(day, firstDay);
  const y = (v: number) => yForValue(v, min, max);

  // Status of every reading as it was when logged: each one is checked against
  // only the readings that came before it, on its own mission day.
  const points: ChartPoint[] = useMemo(() => {
    const result: ChartPoint[] = [];
    history.forEach((reading, i) => {
      if (reading.missionDay < firstDay || reading.missionDay > missionDay) return;
      const status = getStatus(
        reading,
        history.slice(0, i),
        environment,
        reading.missionDay,
        missionDate(reading.missionDay),
      ).status;
      const values = readingValues(reading);
      const x = round1(xForDay(reading.missionDay, firstDay));
      const ys = values.map((v) => yForValue(v, min, max));
      result.push({ x, day: reading.missionDay, ys, values, status, context: reading.context });
    });
    return result;
  }, [history, environment, firstDay, missionDay, min, max]);

  // ---------- static layers ----------

  const plot: React.ReactNode[] = [];

  // Reference range band. A missing side runs to the edge of the axis; no sides, no band.
  const ref = result.referenceRange;
  if (ref && (ref.low !== null || ref.high !== null)) {
    const top = y(ref.high ?? max);
    plot.push(
      <rect key="ref-band" x={PX0} y={top} width={PX1 - PX0} height={y(ref.low ?? min) - top} fill={GREY} fillOpacity={0.07} />,
    );
  }
  const base = result.baseline;
  if (base && (base.low !== null || base.high !== null)) {
    const top = y(base.high ?? max);
    plot.push(
      <rect key="base-band" x={PX0} y={top} width={PX1 - PX0} height={y(base.low ?? min) - top} fill={GREY} fillOpacity={0.14} />,
    );
  }

  // Horizontal gridlines with y-axis numbers. Counting steps avoids floating-point drift.
  const firstTick = Math.ceil(min / step - 1e-9) * step;
  for (let k = 0; firstTick + k * step <= max + 1e-9; k++) {
    const v = firstTick + k * step;
    plot.push(
      <g key={`grid-${k}`}>
        <line x1={PX0} x2={PX1} y1={y(v)} y2={y(v)} stroke={GRID} />
        <text className="svg-t" x={PX0 - 8} y={y(v) + 4} textAnchor="end" fontSize={11} fill={GREY}>
          {v.toFixed(axisDecimals)}
        </text>
      </g>,
    );
  }

  // Day ticks along the x axis; labelled days also get a vertical gridline.
  for (let offset = 0; offset < CHART_DAYS; offset++) {
    const day = firstDay + offset;
    const isLabelled = LABELLED_OFFSETS.includes(offset);
    const x = round1(dayX(day));
    plot.push(
      <g key={`day-${day}`}>
        {isLabelled && (
          <>
            <line x1={x} x2={x} y1={PY0} y2={PY1} stroke={GRID} />
            <text className="svg-t" x={x} y={288} textAnchor="middle" fontSize={11} fill={GREY}>
              {day}
            </text>
          </>
        )}
        <line x1={x} x2={x} y1={PY1} y2={PY1 + (isLabelled ? 6 : 3)} stroke={AXIS} />
      </g>,
    );
  }

  plot.push(<path key="axes" d={`M${PX0} ${PY0} V${PY1} H${PX1}`} fill="none" stroke={AXIS} />);
  plot.push(
    <text key="md" className="svg-t" x={PX0 - 8} y={288} textAnchor="end" fontSize={11} fill={GREY}>
      MD
    </text>,
    <text key="unit" className="svg-t" x={PX0} y={16} fontSize={11} fill={GREY}>
      {meta.unit}
    </text>,
  );

  // Dashed limit lines. Critical limits come from the rule for the latest reading's context
  // (systolic for blood pressure, matching "Bands follow systolic").
  const critical = latest ? ruleFor(isBp ? "systolic" : id, latest.context)?.criticalLimit ?? null : null;
  const limitLines: { label: string; value: number | null; color: string }[] = [
    { label: "REF LO", value: ref?.low ?? null, color: GREY },
    { label: "REF HI", value: ref?.high ?? null, color: GREY },
    { label: "CRIT LO", value: critical?.low ?? null, color: STATUS_COLOR.red },
    { label: "CRIT HI", value: critical?.high ?? null, color: STATUS_COLOR.red },
  ];
  for (const line of limitLines) {
    // Lines on or past the axis edge are skipped, as in the mockup.
    if (line.value === null || line.value <= min || line.value >= max) continue;
    const ly = y(line.value);
    plot.push(
      <g key={line.label}>
        <line x1={PX0} x2={PX1} y1={ly} y2={ly} stroke={line.color} strokeOpacity={0.8} strokeDasharray="5 4" />
        <text className="svg-t" x={PX1 - 6} y={ly - 5} textAnchor="end" fontSize={10} fill={line.color}>
          {line.label} {fmt(line.value, meta.decimals)}
        </text>
      </g>,
    );
  }

  if (!points.length) {
    plot.push(
      <text key="empty" className="svg-t" x={400} y={148} textAnchor="middle" fontSize={13} fill={INK}>
        No data
      </text>,
      <text key="empty-sub" className="svg-t" x={400} y={168} textAnchor="middle" fontSize={11} fill={GREY}>
        {`No reading logged MD-${firstDay} to MD-${missionDay}`}
      </text>,
    );
  }

  // One line per series: blood pressure draws systolic, then diastolic at lower opacity.
  const seriesCount = isBp ? 2 : 1;
  for (let k = 0; k < seriesCount && points.length; k++) {
    const faded = k > 0;
    plot.push(
      <polyline
        key={`line-${k}`}
        points={points.map((p) => `${p.x.toFixed(1)},${p.ys[k]}`).join(" ")}
        fill="none"
        stroke={INK}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeOpacity={faded ? 0.55 : undefined}
      />,
    );
    points.forEach((p, i) => {
      // Status shapes go on the first series only; the diastolic line gets plain markers.
      const status: Status = k === 0 ? p.status : "green";
      const px = p.x;
      const py = p.ys[k];
      const key = `pt-${k}-${i}`;
      if (status === "red") {
        plot.push(<rect key={key} x={px - 5} y={py - 5} width={10} height={10} fill={STATUS_COLOR.red} />);
      } else if (status === "amber") {
        plot.push(<path key={key} d={`M${px} ${py - 9} L${px + 8} ${py + 6} H${px - 8} Z`} fill={STATUS_COLOR.amber} />);
      } else if (status === "unknown") {
        plot.push(<circle key={key} cx={px} cy={py} r={5} fill={COLOR_VAR.panel} stroke={STATUS_COLOR.unknown} strokeWidth={1.5} />);
      } else {
        plot.push(
          <rect
            key={key}
            x={px - 3.5}
            y={py - 3.5}
            width={7}
            height={7}
            fill={COLOR_VAR.panelWell}
            stroke={INK}
            strokeWidth={1.5}
            strokeOpacity={faded ? 0.55 : undefined}
          />,
        );
      }
    });
    if (isBp) {
      const last = points[points.length - 1];
      plot.push(
        <text key={`end-${k}`} className="svg-t" x={dayX(last.day) + 14} y={last.ys[k] + 4} fontSize={10} fill={GREY}>
          {k === 0 ? "SYS" : "DIA"}
        </text>,
      );
    }
  }

  // ---------- hover layer (the mockup's chShow) ----------

  let hoverLayer: React.ReactNode = null;
  const p = hoverIndex >= 0 ? points[hoverIndex] : undefined;
  if (p) {
    const valueText = `${p.values.map((v) => fmt(v, meta.decimals)).join("/")} ${meta.unit}`;
    const dayText = `MD-${p.day} · ${STATUS_TEXT[p.status].label} · ${contextLabel(id, p.context)}`;
    // Box width estimated from character counts, as the mockup does; flips left near the edge.
    const w = Math.round(Math.max(valueText.length * 7.4, dayText.length * 6.2)) + 24;
    const tx = p.x + 14 + w > PX1 ? p.x - 14 - w : p.x + 14;
    const ty = Math.max(PY0 + 4, Math.min(PY1 - 52, p.ys[0] - 56));
    hoverLayer = (
      <>
        <line x1={p.x} x2={p.x} y1={PY0} y2={PY1} stroke={INK} />
        <line x1={PX0} x2={p.x} y1={p.ys[0]} y2={p.ys[0]} stroke={INK} strokeOpacity={0.7} strokeDasharray="2 3" />
        {p.ys.map((cy, i) => (
          <circle key={i} cx={p.x} cy={cy} r={8} fill="none" stroke={INK} strokeWidth={1.5} />
        ))}
        <rect x={tx} y={ty} width={w} height={44} rx={2} fill={COLOR_VAR.bg} stroke={AXIS} />
        <text className="svg-t" x={tx + 12} y={ty + 17} fontSize={10} fill={GREY}>
          {dayText}
        </text>
        <text className="svg-t" x={tx + 12} y={ty + 34} fontSize={12} fontWeight={500} fill={INK}>
          {valueText}
        </text>
      </>
    );
  }

  // Nearest reading to the pointer, within 48 viewBox units; otherwise none.
  function pointAt(e: React.PointerEvent<SVGSVGElement>): number {
    const box = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - box.left) * 760) / box.width;
    let best = -1;
    let bestDistance = Infinity;
    points.forEach((pt, i) => {
      const d = Math.abs(pt.x - x);
      if (d < bestDistance) {
        bestDistance = d;
        best = i;
      }
    });
    return bestDistance < 48 ? best : -1;
  }

  function onPointer(e: React.PointerEvent<SVGSVGElement>) {
    const i = pointAt(e);
    if (i !== hoverIndex) show(i);
  }

  function onKeyDown(e: React.KeyboardEvent<SVGSVGElement>) {
    if (!points.length) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      show(Math.max(0, (hoverIndex < 0 ? points.length : hoverIndex) - 1));
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      show(Math.min(points.length - 1, hoverIndex + 1));
    } else if (e.key === "Escape") {
      show(-1);
    }
  }

  return (
    <div className="cell c8 flush">
      <div className="head">
        <h2>Strip chart</h2>
        <span className="hint mono">{`MD-${firstDay} to MD-${missionDay} · hover or use ← → for a reading`}</span>
      </div>
      <div className="chart well">
        <svg
          viewBox="0 0 760 300"
          role="img"
          id="ch"
          tabIndex={0}
          aria-label={`Trend chart for ${meta.name}, mission day ${firstDay} to ${missionDay}, with the reference range and personal baseline drawn as bands. Arrow keys step through readings`}
          onPointerMove={onPointer}
          onPointerDown={onPointer}
          onPointerLeave={() => show(-1)}
          onFocus={() => {
            // Keyboard users land on the newest reading first.
            if (hoverIndex < 0 && points.length) show(points.length - 1);
          }}
          onBlur={() => show(-1)}
          onKeyDown={onKeyDown}
        >
          <g>{plot}</g>
          <g pointerEvents="none">{hoverLayer}</g>
        </svg>
      </div>
      <div className="legend">
        <span>
          <span className="sw" style={{ background: "color-mix(in srgb, var(--mu) 7%, transparent)" }}></span>Reference range
        </span>
        <span>
          <span className="sw" style={{ background: "color-mix(in srgb, var(--mu) 20%, transparent)" }}></span>Personal baseline
        </span>
        <span>
          <span className="sw sw-dash"></span>Reference limit
        </span>
        <span>
          <span className="sw sw-dash" style={{ borderTopColor: "var(--red)" }}></span>Critical limit
        </span>
        <span>
          <span style={{ color: "var(--amber)" }} aria-hidden="true">
            ▲{" "}
          </span>
          Needs review
        </span>
        <span>
          <span style={{ color: "var(--red)" }} aria-hidden="true">
            ■{" "}
          </span>
          Critical
        </span>
        <span>
          <span style={{ color: "var(--unknown)" }} aria-hidden="true">
            ○{" "}
          </span>
          Unknown
        </span>
        <span>{legendNote}</span>
      </div>
    </div>
  );
}
