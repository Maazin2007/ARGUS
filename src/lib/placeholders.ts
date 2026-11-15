// TEMPORARY stand-ins for backend functions that are not on `main` yet.
// Each one has the same name and shape as in plan/FLOW.md, so when the real file is
// merged the screens only change one import line, then this file is deleted:
//   saveReading, getReadings, saveCheckIn, getCheckIns, clearAll  -> src/lib/storage.ts   (Angad)
//   validateEntry                                                -> src/lib/validate.ts  (Angad)
//   getStep, nextStepId                                          -> src/lib/emergency.ts (James)
//   loadDemoProfile                                              -> src/lib/demoProfile.ts (James)
//   isCheckInDue                                                 -> src/lib/checkInDue.ts (James)
//
// Readings are kept in memory (not localStorage), so they reset on a page refresh.
// Only storage.ts may touch localStorage (plan/CODING_STANDARDS.md).

import type {
  CheckIn,
  EmergencyStep,
  IndicatorId,
  Measure,
  Reading,
} from "@/lib/types";
import seed from "@/data/seed.json";
import emergencyData from "@/data/emergencyPlaceholder.json";

// ---------- storage (Angad) ----------

let readings: Reading[] = (seed as Reading[]).slice();
let checkIns: CheckIn[] = [];

export function saveReading(reading: Reading): void {
  readings = readings.filter((r) => r.id !== reading.id).concat(reading);
}

// Oldest first, like the real storage.ts.
export function getReadings(indicator?: IndicatorId): Reading[] {
  const list = indicator
    ? readings.filter((r) => r.indicator === indicator)
    : readings;
  return list
    .slice()
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
}

export function saveCheckIn(checkIn: CheckIn): void {
  checkIns = checkIns.concat(checkIn);
}

export function getCheckIns(): CheckIn[] {
  return checkIns.slice();
}

export function clearAll(): void {
  readings = [];
  checkIns = [];
}

// ---------- demo profile (James) ----------

export function loadDemoProfile(): void {
  clearAll();
  for (const reading of seed as Reading[]) saveReading(reading);
}

// ---------- check-in due (James) ----------

const CHECK_IN_DUE_AFTER_HOURS = 24; // demo parameter

export function isCheckInDue(lastTimestamp: string | null, now: Date): boolean {
  if (!lastTimestamp) return true;
  const ageHours = (now.getTime() - Date.parse(lastTimestamp)) / 3_600_000;
  return ageHours >= CHECK_IN_DUE_AFTER_HOURS;
}

// ---------- input checks (Angad) ----------

// These bounds only catch typing errors. They are NOT medical limits.
// Wide on purpose; copied from the mockup's check-in form.
const TYPING_BOUNDS: Record<Measure, { min: number; max: number; unit: string }> = {
  heartRate: { min: 20, max: 250, unit: "bpm" },
  bodyTemperature: { min: 30, max: 45, unit: "°C" },
  systolic: { min: 40, max: 260, unit: "mmHg" },
  diastolic: { min: 20, max: 160, unit: "mmHg" },
  bloodGlucose: { min: 20, max: 600, unit: "mg/dL" },
  sleepDuration: { min: 0, max: 24, unit: "h" },
  mood: { min: 1, max: 5, unit: "of 5" },
};

export function validateEntry(
  measure: Measure,
  text: string,
): { ok: true; value: number } | { ok: false; message: string } {
  const bounds = TYPING_BOUNDS[measure];
  const value = text.trim();
  if (value === "")
    return { ok: false, message: `Enter a reading in ${bounds.unit}, or skip this one` };
  if (!/^\d+(\.\d+)?$/.test(value))
    return { ok: false, message: "Digits only, with an optional decimal point" };
  const n = Number(value);
  if (n < bounds.min || n > bounds.max)
    return {
      ok: false,
      message: `That is not a possible reading. Enter a value from ${bounds.min} to ${bounds.max} ${bounds.unit}`,
    };
  return { ok: true, value: n };
}

// ---------- emergency tree (James) ----------

// The screen needs a few fields the shared EmergencyStep type does not have yet
// (hint, button labels, log wording). Tell James before changing types.ts.
export type EmergencyStepUi = EmergencyStep & {
  hint: string;
  yesLabel?: string;
  noLabel?: string;
  logYes: string;
  logNo: string;
  showLimits?: boolean;
};

const STEPS = emergencyData.steps as EmergencyStepUi[];

export const EMERGENCY_SCENARIO: string = emergencyData.scenario;
export const EMERGENCY_FIRST_STEP_ID: string = emergencyData.firstStepId;
export const EMERGENCY_LIMITS_NOTE: string = emergencyData.limitsNote;

export function getStep(id: string): EmergencyStepUi | null {
  return STEPS.find((s) => s.id === id) ?? null;
}

// Returns the id of the next step, or null when the tree ends.
export function nextStepId(step: EmergencyStep, answer: "yes" | "no"): string | null {
  if (step.type === "instruction") return step.next;
  return answer === "yes" ? step.yes : step.no;
}
