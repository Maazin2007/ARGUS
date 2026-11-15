// Pure helpers for check-in reminders (plan/BACKEND.md step 8) and multi-indicator
// combined review notes. Both take their inputs as arguments and never read the
// system clock or browser storage directly.

import type { IndicatorId, Status } from "@/lib/types";

// A check-in is due once the last check-in is older than this many hours.
export const CHECK_IN_DUE_HOURS = 24; // demo parameter

export type CheckInDueResult = {
  isDue: boolean;
  hoursSinceLast: number | null;
  reason: string;
};

// Returns true when no check-in has been logged yet, when the stored timestamp is
// invalid, or when more than `dueAfterHours` have elapsed since the last check-in.
export function isCheckInDue(
  lastCheckInTimestamp: string | null,
  now: Date,
  dueAfterHours: number = CHECK_IN_DUE_HOURS,
): CheckInDueResult {
  if (!lastCheckInTimestamp) {
    return {
      isDue: true,
      hoursSinceLast: null,
      reason: "No check-in logged yet. Complete a check-in to record baseline readings.",
    };
  }

  const lastMs = new Date(lastCheckInTimestamp).getTime();
  if (Number.isNaN(lastMs)) {
    return {
      isDue: true,
      hoursSinceLast: null,
      reason: "Last check-in timestamp could not be read. Start a new check-in.",
    };
  }

  const elapsedHours = Math.max(0, (now.getTime() - lastMs) / (1000 * 60 * 60));
  const roundedHours = Number(elapsedHours.toFixed(1));

  if (elapsedHours >= dueAfterHours) {
    return {
      isDue: true,
      hoursSinceLast: roundedHours,
      reason: `Last check-in was ${roundedHours} hours ago (due every ${dueAfterHours} hours, demo parameter).`,
    };
  }

  return {
    isDue: false,
    hoursSinceLast: roundedHours,
    reason: `Last check-in was ${roundedHours} hours ago.`,
  };
}

// Checks for multi-indicator combinations that warrant a single plain-language
// overview note alongside the individual indicator statuses. Each rule is
// explicitly labelled as a demo rule unless backed by a clinical protocol.
export function checkCombinedAlerts(
  statuses: Partial<Record<IndicatorId, Status>>,
): string[] {
  const notes: string[] = [];

  const isFlagged = (status: Status | undefined): boolean =>
    status === "amber" || status === "red";

  // Short sleep and low mood on the same check-in: isolation and circadian
  // disruption often move both together.
  if (isFlagged(statuses.sleepDuration) && isFlagged(statuses.mood)) {
    notes.push(
      "Sleep duration and mood both need review today. Consider reviewing rest schedule and workload with the Crew Medical Officer (demo rule).",
    );
  }

  // Body temperature and resting heart rate both flagged on the same check-in.
  if (isFlagged(statuses.bodyTemperature) && isFlagged(statuses.heartRate)) {
    notes.push(
      "Body temperature and heart rate both need review. Rest in a ventilated area, re-measure after 20 minutes, and notify the Crew Medical Officer if both stay outside range (demo rule).",
    );
  }

  return notes;
}
