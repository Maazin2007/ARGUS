import type { Measure } from "@/lib/types";

// Demo bounds to catch typing errors only, not medical limits.
const INPUT_LIMITS: Record<
  Measure,
  { min: number; max: number; unit: string; example: string }
> = {
  heartRate: { min: 20, max: 250, unit: "bpm", example: "72" },
  systolic: { min: 40, max: 300, unit: "mmHg", example: "120" },
  diastolic: { min: 20, max: 200, unit: "mmHg", example: "80" },
  bloodGlucose: { min: 20, max: 600, unit: "mg/dL", example: "95" },
  bodyTemperature: { min: 25, max: 45, unit: "°C", example: "36.8" },
  sleepDuration: { min: 0, max: 24, unit: "hours", example: "7.5" },
  mood: { min: 1, max: 5, unit: "1-5", example: "4" },
};

export function validateEntry(
  measure: Measure,
  text: string,
): { ok: false; message: string } | { ok: true; value: number } {
  const limits = INPUT_LIMITS[measure];

  // No input provided.
  if (text.trim() === "") {
    return {
      ok: false,
      message: `Please enter a value in ${limits.unit}, for example ${limits.example}.`,
    };
  }

  const value = Number(text);

  // Not a finite number.
  if (!Number.isFinite(value)) {
    return {
      ok: false,
      message: `Please enter a valid number in ${limits.unit}, for example ${limits.example}.`,
    };
  }

  // Outside typo-catching bounds.
  if (value < limits.min || value > limits.max) {
    return {
      ok: false,
      message: `Enter a value between ${limits.min} and ${limits.max} ${limits.unit}, for example ${limits.example}.`,
    };
  }

  if (measure === "mood" && !Number.isInteger(value)) {
    return {
      ok: false,
      message: "Mood must be a whole number from 1 to 5, for example 4.",
    };
  }

  return { ok: true, value };
}
