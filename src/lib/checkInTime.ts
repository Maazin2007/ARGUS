// When a new check-in is stamped. The demo clock is frozen on one mission day,
// so every check-in used to get the same timestamp. The baseline check only
// compares a reading with EARLIER ones, so readings with equal times never
// counted as "in a row". Each new check-in now lands a minute after the newest
// stored reading, and never before the demo time. Pure: "now" is passed in.

import type { Reading } from "@/lib/types";

// demo parameter: gap between two check-ins logged on the same simulated day.
export const CHECK_IN_GAP_MINUTES = 1;

export function checkInTime(statusTime: Date, readings: Reading[]): Date {
  // `|| 0`: one stored reading with an unreadable timestamp must not break every later check-in.
  const newestMs = readings.reduce((max, r) => Math.max(max, Date.parse(r.timestamp) || 0), 0);
  return new Date(Math.max(statusTime.getTime(), newestMs + CHECK_IN_GAP_MINUTES * 60_000));
}
