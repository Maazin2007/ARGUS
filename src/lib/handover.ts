// Builds the handover report for the crew medical officer and the ground: the
// last 7 mission days of readings, every amber or red result in that window with
// its reason, and the recent self-ratings with any feel-vs-data mismatch.
// Pure: the screen passes in the readings, check-ins and "now".

import type { CheckIn, Environment, IndicatorId, Reading, StatusResult } from "@/lib/types";
import { getStatus } from "@/lib/status";
import { checkFeelVsData } from "@/lib/feelVsData";

// demo parameter: how many mission days the report covers.
export const HANDOVER_DAYS = 7;

export type HandoverAlert = {
  reading: Reading;
  result: StatusResult;
};

export type HandoverCheckIn = {
  checkIn: CheckIn;
  missionDay: number;
  mismatch: string | null; // the feel-vs-data message, when the rating and the data disagree
  readingCount: number; // readings saved with this check-in; 0 means there was nothing to compare
};

export type HandoverReport = {
  missionDay: number;
  environment: Environment;
  oneWayDelaySeconds: number;
  roundTripDelaySeconds: number;
  generatedAt: string; // ISO time the report was built for
  days: number[]; // mission days covered, oldest first
  // indicator -> mission day -> readings that day (oldest first)
  table: Record<IndicatorId, Record<number, Reading[]>>;
  alerts: HandoverAlert[]; // every non-green result (amber, red, unknown), oldest first
  checkIns: HandoverCheckIn[];
};

export type HandoverInput = {
  readings: Reading[]; // oldest first
  checkIns: CheckIn[];
  environment: Environment;
  missionDay: number;
  oneWayDelaySeconds: number;
  now: Date;
  missionDayOf: (timestampMs: number) => number;
  indicators: IndicatorId[];
};

export function buildHandover(input: HandoverInput): HandoverReport {
  const firstDay = input.missionDay - HANDOVER_DAYS + 1;
  const days = Array.from({ length: HANDOVER_DAYS }, (_, i) => firstDay + i);
  const inWindow = (day: number) => day >= firstDay && day <= input.missionDay;

  const table = Object.fromEntries(
    input.indicators.map((id) => [id, Object.fromEntries(days.map((d) => [d, [] as Reading[]]))]),
  ) as HandoverReport["table"];

  const alerts: HandoverAlert[] = [];
  // Status of each reading at the time it was logged: only earlier readings count
  // as history and "now" is the reading's own time. The environment is the one
  // selected now, as on the dashboard.
  input.readings.forEach((reading, index) => {
    if (!inWindow(reading.missionDay)) return;
    table[reading.indicator]?.[reading.missionDay]?.push(reading);
    const earlier = input.readings.slice(0, index).filter((r) => r.indicator === reading.indicator);
    const result = getStatus(reading, earlier, input.environment, reading.missionDay, new Date(reading.timestamp));
    if (result.status !== "green") alerts.push({ reading, result });
  });

  const checkIns: HandoverCheckIn[] = input.checkIns
    .map((checkIn) => {
      const missionDay = input.missionDayOf(Date.parse(checkIn.timestamp));
      // The readings saved with this check-in share its timestamp.
      const statuses = input.readings
        .filter((r) => r.timestamp === checkIn.timestamp)
        .map((r) => {
          const earlier = input.readings.filter(
            (e) => e.indicator === r.indicator && Date.parse(e.timestamp) < Date.parse(r.timestamp),
          );
          return getStatus(r, earlier, input.environment, missionDay, new Date(r.timestamp)).status;
        });
      return {
        checkIn,
        missionDay,
        mismatch: checkFeelVsData(checkIn.selfRating, statuses),
        readingCount: statuses.length,
      };
    })
    .filter((c) => inWindow(c.missionDay));

  return {
    missionDay: input.missionDay,
    environment: input.environment,
    oneWayDelaySeconds: input.oneWayDelaySeconds,
    roundTripDelaySeconds: input.oneWayDelaySeconds * 2,
    generatedAt: input.now.toISOString(),
    days,
    table,
    alerts,
    checkIns,
  };
}

// The packet copied for the ground: the same report as plain JSON.
export function telemetryPacket(report: HandoverReport): string {
  return JSON.stringify(
    {
      kind: "ARGUS handover packet (simulated data)",
      ...report,
      alerts: report.alerts.map(({ reading, result }) => ({
        id: reading.id,
        indicator: reading.indicator,
        timestamp: reading.timestamp,
        status: result.status,
        reasons: result.reasons,
        referenceRange: result.referenceRange,
        baseline: result.baseline,
      })),
    },
    null,
    2,
  );
}
