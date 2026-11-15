// The seven items of the daily checklist, in the mockup's order: the six indicators,
// then the overall self-rating. Display copy only; no medical limits live here.

import type { IndicatorId } from "@/lib/types";
import { INDICATORS, INDICATOR_ORDER } from "@/lib/indicatorMeta";

export type CheckInStep = {
  // null for the overall self-rating, which is not an indicator.
  indicator: IndicatorId | null;
  name: string;
  unit: string;
  // Pre-filled inputs for the pitch (blood pressure has two). Not medical limits.
  demo: string[] | null;
  // Small grey line under the input.
  hint: string | null;
  // 1 to 5 buttons instead of a number field, with the captions under the ends.
  scale: { lo: string; hi: string } | null;
  isLast: boolean;
};

// demo parameter: values typed in for the demo walk-through, as in the mockup.
// Glucose and mood are left empty on purpose.
const DEMO_VALUES: Partial<Record<IndicatorId, string[]>> = {
  heartRate: ["74"], // demo parameter
  bodyTemperature: ["38.6"], // demo parameter
  bloodPressure: ["103", "64"], // demo parameter
  sleepDuration: ["5.4"], // demo parameter
};

// Demo copy: wording from the mockup, not a published instruction.
const HINTS: Partial<Record<IndicatorId, string>> = {
  sleepDuration: "Hours asleep in the last 24, naps included",
};

export const CHECK_IN_STEPS: CheckInStep[] = [
  ...INDICATOR_ORDER.map(
    (id): CheckInStep => ({
      indicator: id,
      name: INDICATORS[id].name,
      unit: INDICATORS[id].unit,
      demo: DEMO_VALUES[id] ?? null,
      hint: HINTS[id] ?? null,
      // Mood is picked on a 1 to 5 scale rather than typed.
      scale: id === "mood" ? { lo: "1 = very low", hi: "5 = very good" } : null,
      isLast: false,
    }),
  ),
  {
    indicator: null,
    name: "Overall self-rating",
    unit: "of 5",
    demo: null,
    hint: null,
    scale: { lo: "1 = very unwell", hi: "5 = very well" },
    isLast: true,
  },
];

// What the astronaut did on one step. `context` is the chosen button's label.
export type LogEntry =
  | { skipped: true }
  | { skipped: false; raw: string[]; context: string | null; label: string };
