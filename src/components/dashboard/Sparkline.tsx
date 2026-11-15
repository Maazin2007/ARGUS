"use client";

import { useEffect, useRef } from "react";
import type { Reading, StatusResult } from "@/lib/types";
import { STATUS_COLOR, readingValues } from "@/lib/indicatorMeta";
import { COLOR_TOKENS } from "@/lib/indicatorMeta";

// How many mission days the sparkline covers, ending on today's mission day.
const SPARK_DAYS = 14;
// Grey used by the mockup for the line and the baseline band (display only).
const SPARK_GREY = COLOR_TOKENS.muted;

type SparklineProps = {
  history: Reading[]; // oldest first
  result: StatusResult;
  missionDay: number;
};

// The dashboard's 14-day mini chart (a port of the mockup's `spark()`).
// x is the mission day, y is scaled to fit the readings and the personal baseline band.
// Blood pressure plots the systolic number, as the mockup does.
export function Sparkline({ history, result, missionDay }: SparklineProps) {
  const firstDay = missionDay - (SPARK_DAYS - 1);
  const shown = history.filter((r) => r.missionDay >= firstDay && r.missionDay <= missionDay);
  const values = shown.map((r) => readingValues(r)[0]);

  // The band is only drawn when the baseline has both sides; a one-sided band has no height.
  const b = result.baseline;
  const band = b && b.low !== null && b.high !== null ? { low: b.low, high: b.high } : null;

  const all = band ? [...values, band.low, band.high] : values;
  const lo = Math.min(...all);
  const hi = Math.max(...all);

  // Same geometry as the mockup: 96x28 box, 5 px left padding, 84 px wide plot, 18 px tall.
  const x = (day: number) => 5 + ((day - firstDay) * 84) / (SPARK_DAYS - 1);
  const y = (v: number) => 23 - ((v - lo) / (hi - lo || 1)) * 18;

  const points = shown.map((r, i) => `${x(r.missionDay).toFixed(1)},${y(values[i]).toFixed(1)}`).join(" ");
  const svgRef = useRef<SVGSVGElement>(null);

  // Restart the draw-in animation whenever this chart mounts or its line changes.
  // Removing the class, forcing a layout read, then adding it back makes the browser replay it.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    svg.classList.remove("go");
    void svg.getBoundingClientRect();
    svg.classList.add("go");
  }, [points]);

  if (!shown.length) {
    return (
      <span className="mono" style={{ color: "var(--mu)", fontSize: 11 }}>
        No data
      </span>
    );
  }

  const last = shown.length - 1;
  const cx = x(shown[last].missionDay).toFixed(1);
  const cy = y(values[last]).toFixed(1);
  const color = STATUS_COLOR[result.status];

  return (
    <svg ref={svgRef} className="spark" width="96" height="28" viewBox="0 0 96 28" aria-hidden="true">
      {band ? (
        <rect
          x="1"
          y={y(band.high).toFixed(1)}
          width="94"
          height={(y(band.low) - y(band.high)).toFixed(1)}
          fill={SPARK_GREY}
          fillOpacity="0.16"
        />
      ) : null}
      <polyline
        points={points}
        pathLength="1"
        fill="none"
        stroke={SPARK_GREY}
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <circle cx={cx} cy={cy} r="5.5" fill={color} fillOpacity="0.22" />
      <circle cx={cx} cy={cy} r="2.5" fill={color} />
    </svg>
  );
}
