"use client";

import { useState } from "react";
import { Screen } from "@/components/Screen";
import { StatusBadge } from "@/components/StatusBadge";
import { COLOR_VAR, STATUS_COLOR, STATUS_TEXT, environmentInfo, ruleFor } from "@/lib/indicatorMeta";
import { adjustRange } from "@/lib/status";
import type { Status } from "@/lib/types";
import type { CountStat, DayStat, Summary, SummaryEntry } from "../../../scripts/scenario";
// Written by `npm run evaluate` from scripts/scenarios/. This screen only draws it;
// it never works out a status itself.
import summaryJson from "../../../results/summary.json";

const summary = summaryJson as Summary;

// "none" when a method never gave that status.
function dayText(day: number | null): string {
  return day === null ? "none" : String(day);
}

// Many-seed result under the frozen-seed number: "mean / worst".
function dayStatText(s: DayStat): string {
  if (s.mean === null) return "none";
  return `${s.mean} / ${s.worst}${s.never ? ` · none in ${s.never}` : ""}`;
}

function countStatText(s: CountStat): string {
  return `${s.mean} / ${s.worst}`;
}

// One table cell: the frozen-seed result, and the many-seed mean / worst under it.
function ResultCell({ frozen, many }: { frozen: string | number; many: string }) {
  return (
    <td className="r mono">
      {frozen}
      <br />
      <small style={{ color: "var(--mu)" }}>{many}</small>
    </td>
  );
}

// ---------- scenario trace geometry (viewBox units) ----------

const W = 760;
const PLOT_LEFT = 184; // room for the limit labels and the method names
const PLOT_RIGHT = 744;
const LINE_TOP = 28;
const LINE_BOTTOM = 148;
const STRIP_TOP = 176; // first status strip
const STRIP_STEP = 30;
const CELL_H = 18;
const AXIS_Y = STRIP_TOP + STRIP_STEP * 3 + 8;
const H = AXIS_Y + 24;

const MUTED = COLOR_VAR.muted;
const INK = COLOR_VAR.ink;

type Limit = { label: string; value: number };

// The limits the three methods check against, read from the same rule the engine uses.
// Lower and upper limits both appear, so sleep and mood (which only have a lower
// limit) draw correctly. When the adjusted limit equals the Earth one, it is drawn once.
function scenarioLimits(entry: SummaryEntry): Limit[] {
  const { scenario } = entry;
  const rule = ruleFor(scenario.indicator, scenario.context);
  if (!rule) return [];
  const adjusted = adjustRange(rule, scenario.environment, scenario.firstMissionDay);
  const limits: Limit[] = [];
  for (const side of ["low", "high"] as const) {
    const sideText = side === "low" ? "lower" : "upper";
    const earth = rule.earthRange[side];
    const adj = adjusted?.[side] ?? null;
    if (earth !== null && adj !== null && earth === adj) {
      limits.push({ label: `Earth and adjusted ${sideText} limit`, value: earth });
    } else {
      if (earth !== null) limits.push({ label: `Earth ${sideText} limit`, value: earth });
      if (adj !== null) limits.push({ label: `Adjusted ${sideText} limit`, value: adj });
    }
    const critical = rule.criticalLimit?.[side] ?? null;
    if (critical !== null) limits.push({ label: `Critical ${sideText} limit`, value: critical });
  }
  return limits;
}

function ScenarioTrace({ entry }: { entry: SummaryEntry }) {
  const { scenario, frozen: result } = entry;
  const days = result.trace.length;
  const step = (PLOT_RIGHT - PLOT_LEFT) / days;
  const cellW = step - 2; // 2 px gap between neighbouring cells
  const xLeft = (index: number) => PLOT_LEFT + index * step;
  const xMid = (index: number) => xLeft(index) + step / 2;

  const limits = scenarioLimits(entry);
  const values = [...result.trace.map((row) => row.value), ...limits.map((l) => l.value)];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = (max - min) * 0.08 || 0.5;
  const lo = min - pad;
  const hi = max + pad;
  const y = (v: number) => LINE_BOTTOM - ((v - lo) / (hi - lo)) * (LINE_BOTTOM - LINE_TOP);

  const points = result.trace
    .map((row, i) => `${xMid(i).toFixed(1)},${y(row.value).toFixed(1)}`)
    .join(" ");

  // The marked day: the onset, or the odd reading for the glitch scenario.
  const isGlitch = scenario.pattern === "glitch";
  const markIndex = isGlitch
    ? result.trace.findIndex((row) => row.missionDay === scenario.glitchMissionDay)
    : result.trace.findIndex((row) => row.dayAfterOnset === 0);
  const markText = isGlitch ? "Odd reading" : "Onset";

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`${entry.title}: the simulated reading for ${days} mission days, with each method's status for every day underneath. The same data is in the results table and in results/summary.md.`}
    >
      {/* Limits: recessive lines, each labelled directly at the left edge */}
      {limits.map((limit) => (
        <g key={limit.label}>
          <line
            x1={PLOT_LEFT}
            x2={PLOT_RIGHT}
            y1={y(limit.value)}
            y2={y(limit.value)}
            stroke={MUTED}
            strokeWidth="1"
            strokeDasharray="2 4"
            opacity="0.7"
          />
          <text
            className="svg-t"
            x={PLOT_LEFT - 10}
            y={y(limit.value)}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize="10"
            fill={MUTED}
          >
            {limit.label} {limit.value} {scenario.unit}
          </text>
        </g>
      ))}

      {/* Onset (or odd reading) marker, through the line chart and the three strips */}
      {markIndex >= 0 ? (
        <g>
          <line
            x1={xLeft(markIndex) - 1}
            x2={xLeft(markIndex) - 1}
            y1={LINE_TOP - 10}
            y2={AXIS_Y - 4}
            stroke={INK}
            strokeWidth="1"
            opacity="0.35"
          />
          <text className="svg-t" x={xLeft(markIndex) + 5} y={LINE_TOP - 12} fontSize="11" fill={INK}>
            {markText}, mission day {result.trace[markIndex].missionDay}
          </text>
        </g>
      ) : null}

      {/* The simulated reading */}
      <polyline
        points={points}
        fill="none"
        stroke={INK}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {result.trace.map((row, i) => (
        <circle key={row.missionDay} cx={xMid(i)} cy={y(row.value)} r="5" fill="transparent">
          {/* One string child: React 19 treats <title> specially and several text children break hydration. */}
          <title>{`Mission day ${row.missionDay}: ${row.value.toFixed(scenario.decimals)} ${scenario.unit}`}</title>
        </circle>
      ))}

      {/* One strip per method: a cell per day, coloured and marked with the status symbol */}
      {result.methods.map((method, m) => {
        const top = STRIP_TOP + m * STRIP_STEP;
        return (
          <g key={method.id}>
            <text
              className="svg-t"
              x={PLOT_LEFT - 10}
              y={top + CELL_H / 2}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="11"
              fill={INK}
            >
              {method.label}
            </text>
            {result.trace.map((row, i) => {
              const status: Status = row.statuses[method.id];
              return (
                <g key={row.missionDay}>
                  <rect
                    x={xLeft(i) + 1}
                    y={top}
                    width={cellW}
                    height={CELL_H}
                    rx="3"
                    fill={STATUS_COLOR[status]}
                  />
                  <text
                    className="svg-t"
                    x={xMid(i)}
                    y={top + CELL_H / 2 + 0.5}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="8"
                    fill={COLOR_VAR.panel}
                    aria-hidden="true"
                  >
                    {STATUS_TEXT[status].symbol}
                  </text>
                  <title>{`${method.label}, mission day ${row.missionDay} (${row.value.toFixed(scenario.decimals)} ${scenario.unit}): ${STATUS_TEXT[status].label}`}</title>
                </g>
              );
            })}
          </g>
        );
      })}

      {/* Mission-day axis: a label every five days */}
      {result.trace.map((row, i) =>
        row.missionDay % 5 === 0 ? (
          <text
            key={row.missionDay}
            className="svg-t"
            x={xMid(i)}
            y={AXIS_Y + 8}
            textAnchor="middle"
            fontSize="10"
            fill={MUTED}
          >
            {row.missionDay}
          </text>
        ) : null,
      )}
      <text className="svg-t" x={PLOT_LEFT - 10} y={AXIS_Y + 8} textAnchor="end" fontSize="10" fill={MUTED}>
        Mission day
      </text>
    </svg>
  );
}

// One sentence on what the selected scenario simulates.
function scenarioDescription(entry: SummaryEntry): string {
  const { scenario, frozen } = entry;
  const where = `${environmentInfo(scenario.environment).label}, mission days ${scenario.firstMissionDay} to ${
    scenario.firstMissionDay + scenario.days - 1
  }`;
  const usual = `${scenario.base} ± ${scenario.noise} ${scenario.unit}`;
  switch (scenario.pattern ?? "ramp") {
    case "glitch":
      return `${where}: ${frozen.healthyDays} ordinary days at ${usual}, with one odd reading ${scenario.stepSize} ${scenario.unit} away on mission day ${scenario.glitchMissionDay}. Nothing is wrong, so every alert is false.`;
    case "step":
      return `${where}: ${frozen.healthyDays} days at ${usual}, then a jump of ${scenario.stepSize} ${scenario.unit} that lasts ${frozen.feverDays} days.`;
    default:
      return `${where}: ${frozen.healthyDays} days at ${usual}, then a change of ${scenario.risePerDay} ${scenario.unit} a day for ${frozen.feverDays} days.`;
  }
}

// Alert test: every scenario from `npm run evaluate` (scripts/scenarios/ -> results/summary.json).
export function AlertsScreen() {
  const [selectedId, setSelectedId] = useState(summary.scenarios[0].id);
  const selected = summary.scenarios.find((s) => s.id === selectedId) ?? summary.scenarios[0];
  const usedStatuses = (["green", "amber", "red", "unknown"] as Status[]).filter((status) =>
    selected.frozen.trace.some((row) => Object.values(row.statuses).includes(status)),
  );

  return (
    <Screen label="Alert test">
      <div className="grid">
        <div className="cell c12 flush">
          <div className="head">
            <h2>Alert results, all scenarios</h2>
            <span className="pill">Simulated data · frozen seed + {summary.seedCount} seeds</span>
          </div>
          <div style={{ padding: "0 24px 16px" }}>
            <p className="note" style={{ margin: 0 }}>
              {summary.scenarios.length} simulated scenarios, each checked three ways by the same status rules. The big
              number is the frozen-seed run; the small line under it is the mean / worst over{" "}
              {summary.seedCount} seeds. Days count from the onset day, which is day 0.
            </p>
          </div>
          <div className="tw">
            <table className="plain">
              <thead>
                <tr>
                  <th>Scenario</th>
                  <th>Method</th>
                  <th className="r">
                    First amber
                    <br />
                    days after onset
                  </th>
                  <th className="r">
                    First red
                    <br />
                    days after onset
                  </th>
                  <th className="r">
                    Missed
                    <br />
                    readings left green
                  </th>
                  <th className="r">
                    False amber
                    <br />
                    before onset
                  </th>
                  <th className="r">
                    False red
                    <br />
                    before onset
                  </th>
                </tr>
              </thead>
              <tbody>
                {summary.scenarios.flatMap((entry) =>
                  entry.frozen.methods.map((method, i) => {
                    const many = entry.multiSeed.methods[i];
                    return (
                      <tr key={`${entry.id}-${method.id}`}>
                        {i === 0 ? (
                          <td rowSpan={entry.frozen.methods.length} style={{ verticalAlign: "top", paddingTop: 16 }}>
                            {entry.title}
                          </td>
                        ) : null}
                        <td>{method.label}</td>
                        <ResultCell frozen={dayText(method.firstAmberDay)} many={dayStatText(many.firstAmberDay)} />
                        <ResultCell frozen={dayText(method.firstRedDay)} many={dayStatText(many.firstRedDay)} />
                        <ResultCell frozen={method.missed} many={countStatText(many.missed)} />
                        <ResultCell frozen={method.falseAmber} many={countStatText(many.falseAmber)} />
                        <ResultCell frozen={method.falseRed} many={countStatText(many.falseRed)} />
                      </tr>
                    );
                  }),
                )}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "16px 24px 24px" }}>
            <p className="note" style={{ margin: 0 }}>
              <strong>Limits.</strong> This is a software test of the status rules on simulated
              scenarios. It is not clinical validation. All three methods run the same getStatus
              function used by the dashboard. The fever scenario and its expected outcomes were
              committed before it was first run. The other four were added later, with their
              expected outcomes written before their first run but committed together with the
              results. Sleep and mood have no spaceflight adjustment and no personal
              baseline in our rules, so all three methods give the same result for them. A
              pre-registered sensitivity test (2,000 runs, plan/EVALUATION.md) varies the noise and
              the fever speed: the result holds everywhere, but a fever rising only 0.05 °C a day is
              usually missed.
            </p>
          </div>
        </div>

        <div className="cell c12 flush">
          <div className="head">
            <h2>Scenario trace</h2>
            <div className="seg" role="group" aria-label="Scenario">
              {summary.scenarios.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  aria-pressed={entry.id === selected.id}
                  onClick={() => setSelectedId(entry.id)}
                >
                  {entry.title}
                </button>
              ))}
            </div>
          </div>
          <div style={{ padding: "0 24px 8px" }}>
            <p className="note" style={{ margin: 0 }}>
              {scenarioDescription(selected)}
            </p>
          </div>
          <div className="chart well">
            <ScenarioTrace entry={selected} />
          </div>
          <div className="legend">
            {usedStatuses.map((status) => (
              <StatusBadge key={status} status={status} />
            ))}
          </div>
          <div style={{ padding: "0 24px 24px" }}>
            <p className="note" style={{ margin: 0 }}>
              What we expected before running each scenario is recorded with it in
              scripts/scenarios/ and in results/summary.md.
            </p>
          </div>
        </div>
      </div>
    </Screen>
  );
}
