// Builds one scenario's readings and runs them through getStatus three ways,
// once for the frozen seed (evaluateScenario) or across many seeds
// (evaluateScenarioMultiSeed).
// Pure: same scenario in, same result out. `scripts/evaluate.ts` writes the
// result to disk, and `tests/evaluate.test.ts` checks the committed result
// still matches the current status engine.

import { getStatus } from "@/lib/status";
import type { Environment, Status, ValueReading } from "@/lib/types";
import { mulberry32, noise } from "./random";
import feverJson from "./scenarios/fever.json";
import typoJson from "./scenarios/typo.json";
import spikeJson from "./scenarios/spike.json";
import sleepDebtJson from "./scenarios/sleepDebt.json";
import moodDropJson from "./scenarios/moodDrop.json";

// How the reading changes from the onset day:
//   ramp:   climbs (or falls) by risePerDay every day (the fever, sleep debt, mood drop)
//   step:   jumps by stepSize on the onset day and stays there (a sudden spike)
//   glitch: one odd reading, stepSize away, on glitchMissionDay only. Nothing is
//           wrong with the crewmember, so there is no onset and every alert is false.
export type ScenarioPattern = "ramp" | "step" | "glitch";

export type Scenario = {
  id?: string; // short name used in results/summary.json; fever.json predates it
  title?: string;
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
  feverStartMissionDay?: number; // fever.json's name for the onset day
  onsetMissionDay?: number | null; // newer scenarios; null means nothing goes wrong
  pattern?: ScenarioPattern; // ramp when missing
  stepSize?: number; // step and glitch only
  glitchMissionDay?: number; // glitch only
  risePerDay: number; // added each day from the onset day on (ramp only)
  expected: string[];
};

// The onset day, whichever name the file uses. null: no problem period.
export function onsetDay(scenario: Scenario): number | null {
  if (scenario.onsetMissionDay !== undefined) return scenario.onsetMissionDay;
  return scenario.feverStartMissionDay ?? null;
}

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
  feverDays: number; // days in the problem period (named for the first scenario, the fever)
  methods: MethodResult[];
  trace: TraceRow[];
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// How far the day's value sits from the base, before noise.
function shiftOn(scenario: Scenario, missionDay: number): number {
  const pattern = scenario.pattern ?? "ramp";
  if (pattern === "glitch") {
    return missionDay === scenario.glitchMissionDay ? (scenario.stepSize ?? 0) : 0;
  }
  const onset = onsetDay(scenario);
  if (onset === null) return 0;
  const onsetDayNumber = missionDay - onset + 1; // 1 on the onset day
  if (onsetDayNumber <= 0) return 0;
  return pattern === "step" ? (scenario.stepSize ?? 0) : onsetDayNumber * scenario.risePerDay;
}

// One reading per day. Healthy days sit at the base value; from the onset day
// the value moves as the scenario's pattern says.
export function generateScenarioReadings(scenario: Scenario): ValueReading[] {
  const random = mulberry32(scenario.seed);
  const lastTime = new Date(scenario.lastTimestamp).getTime();
  const readings: ValueReading[] = [];

  for (let day = 0; day < scenario.days; day++) {
    const missionDay = scenario.firstMissionDay + day;
    const daysBeforeLast = scenario.days - 1 - day;
    // One noise draw per day, in day order, so the frozen fever result is unchanged.
    const raw = scenario.base + shiftOn(scenario, missionDay) + noise(random, scenario.noise);

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
    const onset = onsetDay(scenario);
    const onsetOffset = onset === null ? -1 : reading.missionDay - onset;
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

// ---------- many seeds ----------

// A "days after onset" result over many seeds. The mean and worst (latest) day
// count only the seeds where the method gave that status; `never` counts the rest.
export type DayStat = { mean: number | null; worst: number | null; never: number };
// A count (missed, false alerts) over many seeds: the mean and the worst (largest).
export type CountStat = { mean: number; worst: number };

export type MultiSeedMethodResult = {
  id: MethodId;
  label: string;
  firstAmberDay: DayStat;
  firstRedDay: DayStat;
  missed: CountStat;
  falseAmber: CountStat;
  falseRed: CountStat;
};

export type MultiSeedResult = {
  seedCount: number;
  firstSeed: number; // seeds run are firstSeed, firstSeed + 1, ... (the frozen seed is the first)
  methods: MultiSeedMethodResult[];
};

const round2 = (n: number) => Math.round(n * 100) / 100;

function dayStat(days: (number | null)[]): DayStat {
  const fired = days.filter((d): d is number => d !== null);
  return {
    mean: fired.length ? round2(fired.reduce((a, b) => a + b, 0) / fired.length) : null,
    worst: fired.length ? Math.max(...fired) : null,
    never: days.length - fired.length,
  };
}

function countStat(counts: number[]): CountStat {
  return {
    mean: round2(counts.reduce((a, b) => a + b, 0) / counts.length),
    worst: Math.max(...counts),
  };
}

// Runs the same scenario with seeds scenario.seed, scenario.seed + 1, ... so the
// result shows whether the frozen-seed table was luck. Deterministic: same
// scenario and seed count in, same result out.
export function evaluateScenarioMultiSeed(
  scenario: Scenario,
  seedCount = 100,
): MultiSeedResult {
  const runs = Array.from({ length: seedCount }, (_, i) =>
    evaluateScenario({ ...scenario, seed: scenario.seed + i }),
  );

  const methods: MultiSeedMethodResult[] = METHODS.map(({ id, label }, m) => {
    const per = runs.map((run) => run.methods[m]);
    return {
      id,
      label,
      firstAmberDay: dayStat(per.map((r) => r.firstAmberDay)),
      firstRedDay: dayStat(per.map((r) => r.firstRedDay)),
      missed: countStat(per.map((r) => r.missed)),
      falseAmber: countStat(per.map((r) => r.falseAmber)),
      falseRed: countStat(per.map((r) => r.falseRed)),
    };
  });

  return { seedCount, firstSeed: scenario.seed, methods };
}

// ---------- every scenario ----------

// The scenarios in the order the alert screen shows them. fever.json has no id
// or title of its own (it predates them), so they are added here.
export const SCENARIOS: { id: string; title: string; scenario: Scenario }[] = [
  { id: "fever", title: "Slow-onset fever", scenario: feverJson as Scenario },
  { id: "typo", title: "Single odd reading", scenario: typoJson as Scenario },
  { id: "spike", title: "Sudden spike", scenario: spikeJson as Scenario },
  { id: "sleepDebt", title: "Creeping sleep debt", scenario: sleepDebtJson as Scenario },
  { id: "moodDrop", title: "Falling mood", scenario: moodDropJson as Scenario },
];

export const SEED_COUNT = 100;

export type SummaryEntry = {
  id: string;
  title: string;
  scenario: Scenario;
  frozen: ScenarioResult;
  multiSeed: MultiSeedResult;
};

export type Summary = { seedCount: number; scenarios: SummaryEntry[] };

export function buildSummary(seedCount = SEED_COUNT): Summary {
  return {
    seedCount,
    scenarios: SCENARIOS.map(({ id, title, scenario }) => ({
      id,
      title,
      scenario,
      frozen: evaluateScenario(scenario),
      multiSeed: evaluateScenarioMultiSeed(scenario, seedCount),
    })),
  };
}
