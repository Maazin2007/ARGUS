// Display information for the six indicators: short codes, names, units and the
// context buttons. No medical limits live here; those come from src/data/indicators.json
// through getStatus. Owned by the frontend team.

import type {
  Environment,
  IndicatorId,
  IndicatorRule,
  Measure,
  Reading,
  StatusResult,
} from "@/lib/types";
import indicatorRules from "@/data/indicators.json";
import environments from "@/data/environments.json";

export type RefCode = "HR" | "T" | "BP" | "GLU" | "SLP" | "MOOD";

// One button in the check-in context picker. `context` is the string saved on the
// reading and matched against indicators.json, so it must use the backend's spelling.
export type ContextOption = { label: string; context: string };

export type IndicatorMeta = {
  id: IndicatorId;
  ref: RefCode;
  name: string;
  unit: string;
  decimals: number;
  // null: no context buttons (sleep, mood); defaultContext is used instead.
  contexts: ContextOption[] | null;
  contextTitle: string;
  defaultContext: string;
  // Y axis of the strip chart. Display only, not a medical range.
  chartAxis: { min: number; max: number; step: number };
};

// NOTE for the team: James's seed.json and Angad's indicators.json spell some contexts
// differently (temperature "resting" vs "restingCore", sleep "overnight" vs
// "dailyTotal18to60", mood "selfReport" vs "selfReported"). The values below follow
// seed.json. Once the two agree, change them here only.
export const INDICATORS: Record<IndicatorId, IndicatorMeta> = {
  heartRate: {
    id: "heartRate", ref: "HR", name: "Heart rate", unit: "bpm", decimals: 0,
    contexts: [
      { label: "Resting", context: "resting" },
      { label: "Exercise", context: "exercise" },
      { label: "Not sure", context: "unknown" },
    ],
    contextTitle: "Context", defaultContext: "resting",
    chartAxis: { min: 40, max: 140, step: 20 },
  },
  bodyTemperature: {
    id: "bodyTemperature", ref: "T", name: "Body temperature", unit: "°C", decimals: 1,
    contexts: [
      { label: "Forehead", context: "resting" },
      { label: "Tympanic", context: "resting" },
      { label: "Oral", context: "resting" },
    ],
    contextTitle: "Measurement site", defaultContext: "resting",
    chartAxis: { min: 35.5, max: 39.5, step: 0.5 },
  },
  bloodPressure: {
    id: "bloodPressure", ref: "BP", name: "Blood pressure", unit: "mmHg", decimals: 0,
    contexts: [
      { label: "Resting", context: "resting" },
      { label: "Not resting", context: "notResting" },
    ],
    contextTitle: "Context", defaultContext: "resting",
    chartAxis: { min: 40, max: 160, step: 20 },
  },
  bloodGlucose: {
    id: "bloodGlucose", ref: "GLU", name: "Blood glucose", unit: "mg/dL", decimals: 0,
    contexts: [
      { label: "Fasting", context: "fasting" },
      { label: "After a meal", context: "afterMeal" },
      { label: "Not sure", context: "unknown" },
    ],
    contextTitle: "Context", defaultContext: "fasting",
    chartAxis: { min: 40, max: 200, step: 20 },
  },
  sleepDuration: {
    id: "sleepDuration", ref: "SLP", name: "Sleep duration", unit: "h", decimals: 1,
    contexts: null, contextTitle: "Context", defaultContext: "overnight",
    chartAxis: { min: 3, max: 10, step: 1 },
  },
  mood: {
    id: "mood", ref: "MOOD", name: "Mood", unit: "of 5", decimals: 0,
    contexts: null, contextTitle: "Context", defaultContext: "selfReport",
    chartAxis: { min: 0.5, max: 5.5, step: 1 },
  },
};

// Dashboard and dropdown order, as in the mockup.
export const INDICATOR_ORDER: IndicatorId[] = [
  "heartRate", "bodyTemperature", "bloodPressure", "bloodGlucose", "sleepDuration", "mood",
];

export function isIndicatorId(value: string): value is IndicatorId {
  // hasOwn, not `in`: `in` also matches built-ins every object has, like "toString".
  return Object.hasOwn(INDICATORS, value);
}

// ---------- formatting ----------

export function fmt(value: number, decimals: number): string {
  return value.toFixed(decimals);
}

// Where a reading came from, in words. Older stored readings have no provenance.
export function provenanceLabel(reading: Reading): string {
  switch (reading.provenance) {
    case "manual":
      return "Typed in check-in";
    case "device":
      return "Device import";
    case "seed":
      return "Demo profile";
    default:
      return "Not recorded";
  }
}

// "72", "37.8" or "118/76".
export function formatReading(reading: Reading | null): string {
  if (!reading) return "--";
  if (reading.indicator === "bloodPressure") return `${reading.systolic}/${reading.diastolic}`;
  return fmt(reading.value, INDICATORS[reading.indicator].decimals);
}

// The number(s) to plot. Blood pressure gives [systolic, diastolic].
export function readingValues(reading: Reading): number[] {
  return reading.indicator === "bloodPressure"
    ? [reading.systolic, reading.diastolic]
    : [reading.value];
}

// "Resting", "Forehead"... falls back to the raw context string.
export function contextLabel(id: IndicatorId, context: string): string {
  const option = INDICATORS[id].contexts?.find((c) => c.context === context);
  if (option) return option.label;
  return context.charAt(0).toUpperCase() + context.slice(1);
}

// Written as "71.0 to 73.0" style ranges, with null meaning "no limit on that side".
export function formatRange(
  range: { low: number | null; high: number | null } | null,
  decimals: number,
): string {
  if (!range || (range.low === null && range.high === null)) return "Not set";
  if (range.low !== null && range.high !== null)
    return `${fmt(range.low, decimals)} – ${fmt(range.high, decimals)}`;
  if (range.low !== null) return `≥ ${fmt(range.low, decimals)}`;
  return `≤ ${fmt(range.high as number, decimals)}`;
}

// ---------- rules (read-only view of indicators.json) ----------

const RULES = indicatorRules as IndicatorRule[];

export function ruleFor(measure: Measure, context: string): IndicatorRule | null {
  return RULES.find((r) => r.measure === measure && r.context === context) ?? null;
}

// The measures behind one indicator (blood pressure has two).
export function measuresFor(id: IndicatorId): Measure[] {
  return id === "bloodPressure" ? ["systolic", "diastolic"] : [id];
}

// ---------- environment ----------

export type EnvironmentInfo = { id: Environment; label: string; delaySeconds: number };

export const ENVIRONMENTS: EnvironmentInfo[] = (
  environments as { id: Environment; label: string; signalDelaySeconds: number }[]
).map((e) => ({ id: e.id, label: e.label, delaySeconds: e.signalDelaySeconds }));

export function environmentInfo(id: Environment): EnvironmentInfo {
  return ENVIRONMENTS.find((e) => e.id === id) ?? ENVIRONMENTS[0];
}

// Round-trip time in minutes, one decimal, for "earliest reply in N min".
export function roundTripMinutes(delaySeconds: number): number {
  return Math.round(((delaySeconds * 2) / 60) * 10) / 10;
}

// Labels for a status, as shown in the mockup.
export const STATUS_TEXT: Record<StatusResult["status"], { symbol: string; label: string }> = {
  green: { symbol: "✓", label: "Within range" },
  amber: { symbol: "▲", label: "Needs review" },
  red: { symbol: "■", label: "Critical" },
  unknown: { symbol: "?", label: "Unknown" },
};

// The colour tokens from src/app/globals.css (:root), for code that cannot read
// CSS variables: canvas drawing, the three.js body figure and SVG attributes.
// The colour tokens, copied from globals.css for the one place that cannot read CSS: canvas.
// COLOR_TOKENS is the light theme and COLOR_TOKENS_DARK the dark one.
// tests/colorTokens.test.ts fails if either drifts from globals.css, so change both together.
// Everything else (SVG charts, inline styles) uses COLOR_VAR below, which follows the theme by itself.
export const COLOR_TOKENS = {
  bg: "#F1F3F5", // --bg
  panel: "#FFFFFF", // --panel
  panelWell: "#F5F6F8", // --panel-well
  line: "#E3E6EA", // --line
  line2: "#C9CED5", // --line2
  ink: "#12161A", // --tx
  muted: "#5A626B", // --mu
  green: "#2E7D4F", // --green
  amber: "#B7791F", // --amber
  red: "#C23A2E", // --red
  unknown: "#80868E", // --unknown
} as const;

export type ColorTokens = Record<keyof typeof COLOR_TOKENS, string>;

export const COLOR_TOKENS_DARK: ColorTokens = {
  bg: "#0D1014",
  panel: "#14181D",
  panelWell: "#1A1F25",
  line: "#232A31",
  line2: "#3A444E",
  ink: "#E6E9EC",
  muted: "#98A2AD",
  green: "#5FBF89",
  amber: "#E2AD52",
  red: "#F2776A",
  unknown: "#8D97A1",
};

// Which CSS variable each token mirrors, used by the drift test.
export const COLOR_TOKEN_VARS: Record<keyof typeof COLOR_TOKENS, string> = {
  bg: "--bg",
  panel: "--panel",
  panelWell: "--panel-well",
  line: "--line",
  line2: "--line2",
  ink: "--tx",
  muted: "--mu",
  green: "--green",
  amber: "--amber",
  red: "--red",
  unknown: "--unknown",
};

// The same tokens as `var(--name)` strings. SVG attributes and inline styles accept these,
// and the browser swaps the value when the theme changes.
export const COLOR_VAR: ColorTokens = {
  bg: "var(--bg)",
  panel: "var(--panel)",
  panelWell: "var(--panel-well)",
  line: "var(--line)",
  line2: "var(--line2)",
  ink: "var(--tx)",
  muted: "var(--mu)",
  green: "var(--green)",
  amber: "var(--amber)",
  red: "var(--red)",
  unknown: "var(--unknown)",
};

// Status colours for SVG fills and inline styles.
export const STATUS_COLOR: Record<StatusResult["status"], string> = {
  green: COLOR_VAR.green,
  amber: COLOR_VAR.amber,
  red: COLOR_VAR.red,
  unknown: COLOR_VAR.unknown,
};
