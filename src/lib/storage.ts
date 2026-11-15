import type { Reading, CheckIn, IndicatorId } from "@/lib/types";

const READINGS_KEY = "argus.readings";
const CHECK_INS_KEY = "argus.checkIns";

// Get readings, optionally filtered by indicator.
export function getReadings(indicator?: IndicatorId): Reading[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = localStorage.getItem(READINGS_KEY);

    if (stored === null) {
      return [];
    }

    const readings: unknown = JSON.parse(stored);

    if (!Array.isArray(readings)) {
      return [];
    }

    const sorted = [...readings].sort(
      (a: Reading, b: Reading) =>
        Date.parse(a.timestamp) - Date.parse(b.timestamp),
    ) as Reading[];

    if (indicator) {
      return sorted.filter((reading) => reading.indicator === indicator);
    }

    return sorted;
  } catch (error) {
    console.error("Failed to load ARGUS readings:", error);
    return [];
  }
}

// What a write returns. Writes can fail (storage full, or turned off in a
// private window), and a user can cause that, so we return a message the
// screen can show instead of throwing (CODING_STANDARDS.md).
export type SaveResult = { ok: true } | { ok: false; message: string };

const SAVE_FAILED: SaveResult = {
  ok: false,
  message:
    "Could not save to this browser's storage. It may be full, or turned off (for example in a private window).",
};

// Write one key, catching the browser's error instead of crashing the screen.
function writeKey(key: string, value: string): SaveResult {
  try {
    localStorage.setItem(key, value);
    return { ok: true };
  } catch (error) {
    console.error("Failed to save ARGUS data:", error);
    return SAVE_FAILED;
  }
}

// Add a reading.
export function saveReading(reading: Reading): SaveResult {
  if (typeof window === "undefined") {
    return { ok: true };
  }

  const readings = getReadings();
  readings.push(reading);

  return writeKey(READINGS_KEY, JSON.stringify(readings));
}

// Get check-ins.
export function getCheckIns(): CheckIn[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = localStorage.getItem(CHECK_INS_KEY);

    if (stored === null) {
      return [];
    }

    const checkIns: unknown = JSON.parse(stored);

    if (!Array.isArray(checkIns)) {
      return [];
    }

    return (checkIns as CheckIn[]).sort(
      (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp),
    );
  } catch (error) {
    console.error("Failed to load ARGUS check-ins:", error);
    return [];
  }
}

// Add a check-in.
export function saveCheckIn(checkIn: CheckIn): SaveResult {
  if (typeof window === "undefined") {
    return { ok: true };
  }

  const checkIns = getCheckIns();
  checkIns.push(checkIn);

  return writeKey(CHECK_INS_KEY, JSON.stringify(checkIns));
}

// Clear stored data.
export function clearAll(): SaveResult {
  if (typeof window === "undefined") {
    return { ok: true };
  }
  try {
    localStorage.removeItem(READINGS_KEY);
    localStorage.removeItem(CHECK_INS_KEY);
    return { ok: true };
  } catch (error) {
    console.error("Failed to clear ARGUS data:", error);
    return SAVE_FAILED;
  }
}
