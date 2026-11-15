"use client";

import { Screen } from "@/components/Screen";
import { StatusBadge } from "@/components/StatusBadge";
import { STATUS_COLOR, STATUS_TEXT, environmentInfo, ruleFor } from "@/lib/indicatorMeta";
import { adjustRange } from "@/lib/status";
import type { Status } from "@/lib/types";
import type { Scenario, ScenarioResult } from "../../../scripts/scenario";
// Both files are written by the backend: the scenario is frozen by hand, the result comes
// from `npm run evaluate`. This screen only draws them; it never works out a status itself.
import scenarioJson from "../../../scripts/scenarios/fever.json";
import resultJson from "../../../results/fever.json";

const scenario = scenarioJson as Scenario;
const result = resultJson as ScenarioResult;

// "none" when a method never gave that status during the fever.
function dayText(day: number | null): string {
  return day === null ? "none" : String(day);
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

const MUTED = "#7C7F7A"; // matches --mu; SVG presentation attributes cannot read var()
const INK = "#16181A"; // matches --tx

function ScenarioTrace() {
  const days = result.trace.length;
  const step = (PLOT_RIGHT - PLOT_LEFT) / days;
  const cellW = step - 2; // 2 px gap between neighbouring cells
  const xLeft = (index: number) => PLOT_LEFT + index * step;
  const xMid = (index: number) => xLeft(index) + step / 2;

  // The limits the three methods check against, read from the same rule the engine uses.
  const rule = ruleFor(scenario.indicator, scenario.context);
  const adjusted = rule
    ? adjustRange(rule, scenario.environment, scenario.firstMissionDay)
    : null;
  const limits = [
    { label: "Earth upper limit", value: rule?.earthRange.high ?? null },
    { label: "Adjusted upper limit", value: adjusted?.high ?? null },
    { label: "Critical limit", value: rule?.criticalLimit?.high ?? null },
  ].filter((l): l is { label: string; value: number } => l.value !== null);

  const values = [...result.trace.map((row) => row.value), ...limits.map((l) => l.value)];
  const lo = Math.floor(Math.min(...values) * 2) / 2 - 0.1;
  const hi = Math.ceil(Math.max(...values) * 2) / 2;
  const y = (v: number) => LINE_BOTTOM - ((v - lo) / (hi - lo)) * (LINE_BOTTOM - LINE_TOP);

  const points = result.trace
    .map((row, i) => `${xMid(i).toFixed(1)},${y(row.value).toFixed(1)}`)
    .join(" ");
  const onsetIndex = result.trace.findIndex((row) => row.dayAfterOnset === 0);
  const methods = result.methods;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Scenario trace: the simulated reading for ${days} mission days, with each method's status for every day underneath. The same data is in the results table and in results/fever.md.`}
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
            fontSize="11"
            fill={MUTED}
          >
            {limit.label} {limit.value} {scenario.unit}
          </text>
        </g>
      ))}

      {/* Fever onset marker, through the line chart and the three strips */}
      {onsetIndex >= 0 ? (
        <g>
          <line
            x1={xLeft(onsetIndex) - 1}
            x2={xLeft(onsetIndex) - 1}
            y1={LINE_TOP - 10}
            y2={AXIS_Y - 4}
            stroke={INK}
            strokeWidth="1"
            opacity="0.35"
          />
          <text
            className="svg-t"
            x={xLeft(onsetIndex) + 5}
            y={LINE_TOP - 12}
            fontSize="11"
            fill={INK}
          >
            Fever onset, mission day {scenario.feverStartMissionDay}
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
          {/* One string child: React needs a single text child inside an SVG <title>, or hydration fails. */}
          <title>{`Mission day ${row.missionDay}: ${row.value.toFixed(scenario.decimals)} ${scenario.unit}`}</title>
        </circle>
      ))}

      {/* One strip per method: a cell per day, coloured and marked with the status symbol */}
      {methods.map((method, m) => {
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
                    fill="#fff"
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

// Alert test: the results table and trace from `npm run evaluate`
// (scripts/scenarios/fever.json -> results/fever.json).
export function AlertsScreen() {
  const lastDay = scenario.firstMissionDay + scenario.days - 1;
  const usedStatuses = (["green", "amber", "red", "unknown"] as Status[]).filter((status) =>
    result.trace.some((row) => Object.values(row.statuses).includes(status)),
  );

  return (
    <Screen label="Alert test">
      <div className="grid">
        <div className="cell c12 flush">
          <div className="head">
            <h2>
              <span className="ix mono">01</span>Alert results
            </h2>
            <span className="pill">SIMULATED DATA · FROZEN SEED</span>
          </div>
          <div style={{ padding: "0 24px 16px" }}>
            <p className="note" style={{ margin: 0 }}>
              One simulated crewmember in {environmentInfo(scenario.environment).label}, mission days{" "}
              {scenario.firstMissionDay} to {lastDay}: {result.healthyDays} days at {scenario.base} ±{" "}
              {scenario.noise} {scenario.unit}, then a fever rising {scenario.risePerDay} {scenario.unit} a
              day for {result.feverDays} days. Three methods check the same readings.
            </p>
          </div>
          <div className="tw">
            <table className="plain">
              <thead>
                <tr>
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
                    fever readings left green
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
                {result.methods.map((method) => (
                  <tr key={method.id}>
                    <td>{method.label}</td>
                    <td className="r mono">{dayText(method.firstAmberDay)}</td>
                    <td className="r mono">{dayText(method.firstRedDay)}</td>
                    <td className="r mono">{method.missed}</td>
                    <td className="r mono">{method.falseAmber}</td>
                    <td className="r mono">{method.falseRed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ padding: "16px 24px 24px" }}>
            <p className="note" style={{ margin: 0 }}>
              <strong>Limits.</strong> This is a software test of the status rules on one simulated
              scenario. It is not clinical validation. All three methods run the same getStatus
              function used by the dashboard. The scenario and its expected outcomes were committed
              before the evaluation was first run. The onset day is day 0.
            </p>
          </div>
        </div>

        <div className="cell c12 flush">
          <div className="head">
            <h2>
              <span className="ix mono">02</span>Scenario trace
            </h2>
            <span className="hint mono">Status per reading, by method</span>
          </div>
          <div className="chart well">
            <ScenarioTrace />
          </div>
          <div className="legend">
            {usedStatuses.map((status) => (
              <StatusBadge key={status} status={status} />
            ))}
          </div>
        </div>
      </div>
    </Screen>
  );
}
