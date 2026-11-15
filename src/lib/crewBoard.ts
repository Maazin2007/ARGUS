// The crew board: one line per crewmember with a status word and the last day
// they logged a reading. It never carries a reading's value, so crewmates see
// that someone needs attention without seeing their data. Pure: the caller
// passes in the readings and "now".

import type { Environment, IndicatorId, Reading, Status } from "@/lib/types";
import { getStatus } from "@/lib/status";

// demo parameter: this many mission days without a reading counts as overdue.
// A crewmember who has collapsed cannot press anything, so silence is the signal.
export const CREW_OVERDUE_DAYS = 2;

const INDICATOR_IDS: IndicatorId[] = [
  "heartRate",
  "bloodPressure",
  "bodyTemperature",
  "bloodGlucose",
  "sleepDuration",
  "mood",
];

// Worst first, so one critical indicator decides the crewmember's status.
const WORST_FIRST: Status[] = ["red", "amber", "unknown", "green"];

export type CrewSummary = {
  status: Status; // the worst status across the six indicators
  lastReadingDay: number | null; // null: nothing logged yet
  overdue: boolean;
};

export function summarizeCrew(
  readings: Reading[], // one crewmember's readings, oldest first
  environment: Environment,
  missionDay: number,
  now: Date,
): CrewSummary {
  const statuses = INDICATOR_IDS.map((id): Status => {
    const history = readings.filter((r) => r.indicator === id);
    const latest = history[history.length - 1];
    if (!latest) return "unknown";
    return getStatus(latest, history.slice(0, -1), environment, missionDay, now).status;
  });
  const status = WORST_FIRST.find((s) => statuses.includes(s)) ?? "unknown";

  const lastReadingDay = readings.length
    ? Math.max(...readings.map((r) => r.missionDay))
    : null;
  const overdue =
    lastReadingDay === null || missionDay - lastReadingDay >= CREW_OVERDUE_DAYS;

  return { status, lastReadingDay, overdue };
}
