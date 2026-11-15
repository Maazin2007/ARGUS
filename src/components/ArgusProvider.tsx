"use client";

// Shared app state: environment, mission day and the stored readings.
// Every screen reads from here, so switching the environment in the header
// updates the dashboard, the chart and the escalation card at once.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Environment, IndicatorId, Reading, StatusResult } from "@/lib/types";
import { getStatus } from "@/lib/status";
import { getCheckIns, getReadings } from "@/lib/placeholders";
import { INDICATOR_ORDER } from "@/lib/indicatorMeta";

// demo parameter: the pitch runs on Mars transit, mission day 212 (plan/DESIGN_IDEAS.md).
export const DEMO_MISSION_DAY = 212;
// demo parameter: mission day 0 is 2026-04-16, which lines seed.json's day 212 up with 2026-11-14.
const MISSION_DAY_ZERO_UTC = Date.UTC(2026, 3, 16);
// demo parameter: statuses are worked out as of this hour (UTC) on the current mission day.
const STATUS_HOUR_UTC = 23;

// The date of a mission day, at the given hour UTC.
export function missionDate(missionDay: number, hourUtc = STATUS_HOUR_UTC): Date {
  return new Date(MISSION_DAY_ZERO_UTC + missionDay * 86_400_000 + hourUtc * 3_600_000);
}

export type IndicatorState = {
  latest: Reading | null;
  history: Reading[]; // oldest first, includes `latest`
  result: StatusResult;
};

type ArgusState = {
  ready: boolean; // false until storage has been read in the browser
  environment: Environment;
  setEnvironment: (env: Environment) => void;
  missionDay: number;
  statusTime: Date; // the "now" passed to getStatus
  readings: Reading[];
  lastCheckInDay: number | null;
  lastIndicator: IndicatorId;
  setLastIndicator: (id: IndicatorId) => void;
  // Call after saving readings or a check-in so every screen re-reads storage.
  reload: () => void;
  statusFor: (id: IndicatorId) => IndicatorState;
};

const ArgusContext = createContext<ArgusState | null>(null);

const NO_READING: StatusResult = {
  status: "unknown",
  reasons: ["No reading logged yet. Status stays unknown until one is logged."],
  referenceRange: null,
  baseline: null,
  criticalLimitCrossed: false,
};

export function ArgusProvider({ children }: { children: React.ReactNode }) {
  const [environment, setEnvironment] = useState<Environment>("marsTransit");
  const [readings, setReadings] = useState<Reading[]>([]);
  const [checkInTimes, setCheckInTimes] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [lastIndicator, setLastIndicator] = useState<IndicatorId>("heartRate");
  const missionDay = DEMO_MISSION_DAY;
  const statusTime = useMemo(() => missionDate(missionDay), [missionDay]);

  const reload = useCallback(() => {
    setReadings(getReadings());
    setCheckInTimes(getCheckIns().map((c) => c.timestamp));
    setReady(true);
  }, []);

  // Storage is read after the first paint, never during rendering (avoids hydration errors).
  // CODING_STANDARDS.md asks for exactly this pattern, so the lint rule is switched off here.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  const statusFor = useCallback(
    (id: IndicatorId): IndicatorState => {
      const history = readings.filter((r) => r.indicator === id);
      const latest = history.length ? history[history.length - 1] : null;
      if (!latest) return { latest, history, result: NO_READING };
      const earlier = history.slice(0, -1);
      return {
        latest,
        history,
        result: getStatus(latest, earlier, environment, missionDay, statusTime),
      };
    },
    [readings, environment, missionDay, statusTime],
  );

  // Last check-in: the newest saved check-in, or else the newest reading's mission day.
  const lastCheckInDay = useMemo(() => {
    if (checkInTimes.length) {
      const t = Date.parse(checkInTimes[checkInTimes.length - 1]);
      return Math.floor((t - MISSION_DAY_ZERO_UTC) / 86_400_000);
    }
    if (!readings.length) return null;
    return Math.max(...readings.map((r) => r.missionDay));
  }, [checkInTimes, readings]);

  const value: ArgusState = {
    ready,
    environment,
    setEnvironment,
    missionDay,
    statusTime,
    readings,
    lastCheckInDay,
    lastIndicator,
    setLastIndicator,
    reload,
    statusFor,
  };

  return <ArgusContext.Provider value={value}>{children}</ArgusContext.Provider>;
}

export function useArgus(): ArgusState {
  const state = useContext(ArgusContext);
  if (!state) throw new Error("useArgus must be used inside <ArgusProvider>");
  return state;
}

// All six indicators' statuses, in dashboard order.
export function useAllStatuses(): { id: IndicatorId; state: IndicatorState }[] {
  const { statusFor } = useArgus();
  return INDICATOR_ORDER.map((id) => ({ id, state: statusFor(id) }));
}
