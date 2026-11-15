// Builds one scenario's readings and runs them through getStatus three ways.
// Pure: same scenario in, same result out. `scripts/evaluate.ts` writes the
// result to disk, and `tests/evaluate.test.ts` checks the committed result
// still matches the current status engine.

import { getStatus } from "@/lib/status";
import type { Environment, Status, ValueReading } from "@/lib/types";
import { mulberry32, noise } from "./random";

export type Scenario = {
  note: string;
  seed: number;
  indicator: ValueReading["indicator"];
  unit: string;
  context: string;
  environment: Environment;
  firstMissionDay: number;
  days: number;
  lastTimestamp: string;
  base: number; // the astronaut's usual value before the fever
  noise: number; // each day lands within ± noise of that day's value
  decimals: number;
  feverStartMissionDay: number;
  risePerDay: number; // added each day from the onset day on
  expected: string[];
};

export type MethodId =
  | "earthRange"
  | "adjustedRange"
  | "adjustedRangeAndBaseline";

export const METHODS: { id: MethodId; label: string }[] = [
  { id: "earthRange", label: "Earth range only" },
  { id: "adjustedRange", label: "Adjusted range" },
  { id: "adjustedRangeAndBaseline", label: "Adjusted range and baseline" },
];

export type MethodResult = {
  id: MethodId;
  label: string;
  firstAmberDay: number | null; // days after onset; the onset day is 0
  firstRedDay: number | null;
  missed: number; // fever readings left green
  falseAmber: number; // amber readings in the healthy period
  falseRed: number; // red readings in the healthy period
};

export type TraceRow = {
  missionDay: number;
  dayAfterOnset: number | null; // null in the healthy period
  value: number;
  statuses: Record<MethodId, Status>;
};

export type ScenarioResult = {
  healthyDays: number;
  feverDays: number;
  methods: MethodResult[];
  trace: TraceRow[];
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// One reading per day. Healthy days sit at the base value; from the onset day
// the value climbs by risePerDay each day.
export function generateScenarioReadings(scenario: Scenario): ValueReading[] {
  const random = mulberry32(scenario.seed);
  const lastTime = new Date(scenario.lastTimestamp).getTime();
  const readings: ValueReading[] = [];

  for (let day = 0; day < scenario.days; day++) {
    const missionDay = scenario.firstMissionDay + day;
    const daysBeforeLast = scenario.days - 1 - day;
    const feverDay = missionDay - scenario.feverStartMissionDay + 1; // 1 on the onset day
    const rise = feverDay > 0 ? feverDay * scenario.risePerDay : 0;
    const raw = scenario.base + rise + noise(random, scenario.noise);

    readings.push({
      id: `scenario-${scenario.indicator}-${missionDay}`,
      indicator: scenario.indicator,
      value: Number(raw.toFixed(scenario.decimals)),
      unit: scenario.unit,
      timestamp: new Date(lastTime - daysBeforeLast * MS_PER_DAY).toISOString(),
      missionDay,
      environment: scenario.environment,
      context: scenario.context,
      simulated: true,
    });
  }

  return readings;
}

// The three methods differ only in what getStatus is given, so the table
// tests the same function the dashboard uses:
//   Earth range only:            environment "earth", no history
//   Adjusted range:              the real environment, no history
//   Adjusted range and baseline: the real environment and the earlier readings
function statusFor(
  method: MethodId,
  reading: ValueReading,
  earlier: ValueReading[],
  scenario: Scenario,
): Status {
  const environment =
    method === "earthRange" ? "earth" : scenario.environment;
  const history = method === "adjustedRangeAndBaseline" ? earlier : [];
  // "now" is the reading's own time, so the reading is never stale.
  const now = new Date(reading.timestamp);
  return getStatus(reading, history, environment, reading.missionDay, now)
    .status;
}

export function evaluateScenario(scenario: Scenario): ScenarioResult {
  const readings = generateScenarioReadings(scenario);

  const trace: TraceRow[] = readings.map((reading, index) => {
    const earlier = readings.slice(0, index);
    const onsetOffset = reading.missionDay - scenario.feverStartMissionDay;
    return {
      missionDay: reading.missionDay,
      dayAfterOnset: onsetOffset >= 0 ? onsetOffset : null,
      value: reading.value,
      statuses: {
        earthRange: statusFor("earthRange", reading, earlier, scenario),
        adjustedRange: statusFor("adjustedRange", reading, earlier, scenario),
        adjustedRangeAndBaseline: statusFor(
          "adjustedRangeAndBaseline",
          reading,
          earlier,
          scenario,
        ),
      },
    };
  });

  const healthy = trace.filter((row) => row.dayAfterOnset === null);
  const fever = trace.filter((row) => row.dayAfterOnset !== null);

  const methods: MethodResult[] = METHODS.map(({ id, label }) => {
    const firstDay = (status: Status) =>
      fever.find((row) => row.statuses[id] === status)?.dayAfterOnset ?? null;
    const count = (rows: TraceRow[], status: Status) =>
      rows.filter((row) => row.statuses[id] === status).length;

    return {
      id,
      label,
      firstAmberDay: firstDay("amber"),
      firstRedDay: firstDay("red"),
      missed: count(fever, "green"),
      falseAmber: count(healthy, "amber"),
      falseRed: count(healthy, "red"),
    };
  });

  return {
    healthyDays: healthy.length,
    feverDays: fever.length,
    methods,
    trace,
  };
}
