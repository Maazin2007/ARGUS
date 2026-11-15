"use client";

// Shared app state: who is using the console, the environment, the mission day and the stored readings.
// Every screen reads from here, so switching the environment in the header
// updates the dashboard, the chart and the escalation card at once.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Environment, IndicatorId, Reading, StatusResult } from "@/lib/types";
import { getStatus } from "@/lib/status";
import { getActiveCrewId, getCheckIns, getReadings, setActiveCrewId } from "@/lib/storage";
import { loadDemoProfile } from "@/lib/demoProfile";
import { CREW } from "@/lib/crew";
import { summarizeCrew, type CrewSummary } from "@/lib/crewBoard";
import { INDICATOR_ORDER } from "@/lib/indicatorMeta";

// demo parameter: the pitch runs on Mars transit, mission day 212 (plan/DESIGN_IDEAS.md).
export const DEMO_MISSION_DAY = 212;
// demo parameter: mission day 0 is 2026-04-16, which lines seed.json's day 212 up with 2026-11-14.
const MISSION_DAY_ZERO_UTC = Date.UTC(2026, 3, 16);
// demo parameter: statuses are worked out as of this hour (UTC) on the current mission day.
const STATUS_HOUR_UTC = 23;

// The mission day a moment falls on (used for imported device readings).
export function missionDayOf(timestampMs: number): number {
  return Math.floor((timestampMs - MISSION_DAY_ZERO_UTC) / 86_400_000);
}

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
  // Who is using the shared console; null until someone taps their name.
  activeCrewId: string | null;
  setActiveCrew: (crewId: string | null) => void;
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
  // Message shown above every screen when a storage write failed; null when all is well.
  storageError: string | null;
  setStorageError: (message: string | null) => void;
  statusFor: (id: IndicatorId) => IndicatorState;
  // The same for any crewmember (emergency mode shows the patient's vitals).
  statusForCrew: (crewId: string, id: IndicatorId) => IndicatorState;
  // One status word and last-reading day per crewmember, for the crew board. No values.
  crewSummary: (crewId: string) => CrewSummary;
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
  const [activeCrewId, setActiveCrewIdState] = useState<string | null>(null);
  // Every crewmember's readings, by crew id. `readings` is the active person's.
  const [allReadings, setAllReadings] = useState<Record<string, Reading[]>>({});
  const readings = useMemo(
    () => (activeCrewId ? (allReadings[activeCrewId] ?? []) : []),
    [activeCrewId, allReadings],
  );
  const [checkInTimes, setCheckInTimes] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [lastIndicator, setLastIndicator] = useState<IndicatorId>("heartRate");
  const [storageError, setStorageError] = useState<string | null>(null);
  const missionDay = DEMO_MISSION_DAY;
  // The demo clock, never earlier than the newest reading. Live check-ins are
  // stamped a minute apart after the demo time (CheckInScreen), so without this a
  // new reading would sit "in the future" relative to the status time.
  const statusTime = useMemo(() => {
    const demoMs = missionDate(missionDay).getTime();
    const newestMs = readings.reduce((max, r) => Math.max(max, Date.parse(r.timestamp) || 0), 0);
    return new Date(Math.max(demoMs, newestMs));
  }, [missionDay, readings]);

  const reload = useCallback(() => {
    // Storage starts empty in a new browser. Load the demo profile so the first
    // screen always has data; the "Simulated data" tags say what it is.
    if (CREW.every((member) => getReadings(undefined, member.id).length === 0)) {
      const loaded = loadDemoProfile();
      if (!loaded.ok) setStorageError(loaded.message);
    }
    const active = getActiveCrewId();
    setActiveCrewIdState(active);
    setAllReadings(Object.fromEntries(CREW.map((member) => [member.id, getReadings(undefined, member.id)])));
    setCheckInTimes(active ? getCheckIns(active).map((c) => c.timestamp) : []);
    setReady(true);
  }, []);

  const setActiveCrew = useCallback(
    (crewId: string | null) => {
      const saved = setActiveCrewId(crewId);
      if (!saved.ok) setStorageError(saved.message);
      reload();
    },
    [reload],
  );

  // Storage is read after the first paint, never during rendering (avoids hydration errors).
  // CODING_STANDARDS.md asks for exactly this pattern, so the lint rule is switched off here.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload]);

  const statusOf = useCallback(
    (list: Reading[], id: IndicatorId): IndicatorState => {
      const history = list.filter((r) => r.indicator === id);
      const latest = history.length ? history[history.length - 1] : null;
      if (!latest) return { latest, history, result: NO_READING };
      const earlier = history.slice(0, -1);
      return {
        latest,
        history,
        result: getStatus(latest, earlier, environment, missionDay, statusTime),
      };
    },
    [environment, missionDay, statusTime],
  );
  const statusFor = useCallback((id: IndicatorId) => statusOf(readings, id), [statusOf, readings]);
  const statusForCrew = useCallback(
    (crewId: string, id: IndicatorId) => statusOf(allReadings[crewId] ?? [], id),
    [statusOf, allReadings],
  );
  const crewSummary = useCallback(
    (crewId: string) => summarizeCrew(allReadings[crewId] ?? [], environment, missionDay, statusTime),
    [allReadings, environment, missionDay, statusTime],
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
    activeCrewId,
    setActiveCrew,
    environment,
    setEnvironment,
    missionDay,
    statusTime,
    readings,
    lastCheckInDay,
    lastIndicator,
    setLastIndicator,
    reload,
    storageError,
    setStorageError,
    statusFor,
    statusForCrew,
    crewSummary,
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
