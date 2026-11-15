import type { Reading, CheckIn, IndicatorId } from "@/lib/types";
import { CONSOLE_OWNER_ID, CREW } from "@/lib/crew";

// The console is shared, so every crewmember has their own readings and check-ins.
// Each function works on the active crewmember unless it is given a crew id.
const ACTIVE_CREW_KEY = "argus.activeCrew";
const readingsKey = (crewId: string) => `argus.readings.${crewId}`;
const checkInsKey = (crewId: string) => `argus.checkIns.${crewId}`;

// Who is using the console, or null when nobody has chosen yet.
export function getActiveCrewId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const id = localStorage.getItem(ACTIVE_CREW_KEY);
    return CREW.some((c) => c.id === id) ? id : null;
  } catch {
    return null;
  }
}

// null signs the current person out, back to "Who is using this console?".
export function setActiveCrewId(crewId: string | null): SaveResult {
  if (typeof window === "undefined") return { ok: true };
  try {
    if (crewId === null) localStorage.removeItem(ACTIVE_CREW_KEY);
    else localStorage.setItem(ACTIVE_CREW_KEY, crewId);
    return { ok: true };
  } catch (error) {
    console.error("Failed to save the active crewmember:", error);
    return SAVE_FAILED;
  }
}

// The crewmember a call works on when no id is passed.
function currentCrewId(): string {
  return getActiveCrewId() ?? CONSOLE_OWNER_ID;
}

// Get readings, optionally filtered by indicator.
export function getReadings(indicator?: IndicatorId, crewId: string = currentCrewId()): Reading[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = localStorage.getItem(readingsKey(crewId));

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
export function saveReading(reading: Reading, crewId: string = currentCrewId()): SaveResult {
  if (typeof window === "undefined") {
    return { ok: true };
  }

  const readings = getReadings(undefined, crewId);
  readings.push(reading);

  return writeKey(readingsKey(crewId), JSON.stringify(readings));
}

// Replace one crewmember's readings in a single write (used by the demo profile).
export function replaceReadings(readings: Reading[], crewId: string): SaveResult {
  if (typeof window === "undefined") {
    return { ok: true };
  }
  return writeKey(readingsKey(crewId), JSON.stringify(readings));
}

// Get check-ins.
export function getCheckIns(crewId: string = currentCrewId()): CheckIn[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = localStorage.getItem(checkInsKey(crewId));

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
export function saveCheckIn(checkIn: CheckIn, crewId: string = currentCrewId()): SaveResult {
  if (typeof window === "undefined") {
    return { ok: true };
  }

  const checkIns = getCheckIns(crewId);
  checkIns.push(checkIn);

  return writeKey(checkInsKey(crewId), JSON.stringify(checkIns));
}

// Clear every crewmember's stored data. Who is using the console is kept.
export function clearAll(): SaveResult {
  if (typeof window === "undefined") {
    return { ok: true };
  }
  try {
    for (const member of CREW) {
      localStorage.removeItem(readingsKey(member.id));
      localStorage.removeItem(checkInsKey(member.id));
    }
    return { ok: true };
  } catch (error) {
    console.error("Failed to clear ARGUS data:", error);
    return SAVE_FAILED;
  }
}
