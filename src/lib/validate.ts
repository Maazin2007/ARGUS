import type { Measure } from "@/lib/types";

const INPUT_LIMITS: Record<
  Measure,
  { min: number; max: number; unit: string }
> = {
  heartRate: { min: 20, max: 250, unit: "bpm" },
  systolic: { min: 40, max: 300, unit: "mmHg" },
  diastolic: { min: 20, max: 200, unit: "mmHg" },
  bloodGlucose: { min: 20, max: 600, unit: "mg/dL" },
  bodyTemperature: { min: 25, max: 45, unit: "°C" },
  sleepDuration: { min: 0, max: 24, unit: "hours" },
  mood: { min: 1, max: 5, unit: "1–5" },
};

export function validateEntry(
  measure: Measure,
  text: string,
): { ok: false; message: string } | { ok: true; value: number } {
  const limits = INPUT_LIMITS[measure];

  // no input provided
  if (text.trim() === "") {
    return {
      ok: false,
      message: "Please enter a value.",
    };
  }

  const value = Number(text);

  // not a finite number
  if (!Number.isFinite(value)) {
    return {
      ok: false,
      message: "Please enter a valid number",
    };
  }

  //within limits
  if (value < limits.min || value > limits.max) {
    return {
      ok: false,
      message: `Enter a value between ${limits.min} and ${limits.max} ${limits.unit}.`,
    };
  }

  if (measure === "mood" && !Number.isInteger(value)) {
    return {
      ok: false,
      message: "Mood must be a whole number from 1 to 5.",
    };
  }

  return { ok: true, value };
}
