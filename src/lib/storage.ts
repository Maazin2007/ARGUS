import type { Reading, CheckIn, IndicatorId } from "@/lib/types";

const READINGS_KEY = "argus.readings";
const CHECK_INS_KEY = "argus.checkIns";

//get readings, optionally filtered by indicator
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

    const sorted = [...readings].sort((a: Reading, b: Reading) =>
      a.timestamp.localeCompare(b.timestamp),
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

//adding readings
export function saveReading(reading: Reading): void {
  if (typeof window === "undefined") {
    return;
  }

  const readings = getReadings();
  readings.push(reading);

  localStorage.setItem(READINGS_KEY, JSON.stringify(readings));
}

//get check-ins
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

    return (checkIns as CheckIn[]).sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp),
    );
  } catch (error) {
    console.error("Failed to load ARGUS check-ins:", error);
    return [];
  }
}

//adding check-ins
export function saveCheckIn(checkIn: CheckIn): void {
  if (typeof window === "undefined") {
    return;
  }

  const checkIns = getCheckIns();
  checkIns.push(checkIn);

  localStorage.setItem(CHECK_INS_KEY, JSON.stringify(checkIns));
}

//clear stored data
export function clearAll(): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(READINGS_KEY);
  localStorage.removeItem(CHECK_INS_KEY);
}
