// TEMPORARY stand-ins for the emergency tree, which has no real file yet.
// The functions have the same names and shapes as in plan/FLOW.md, so when
// src/lib/emergency.ts and src/data/emergency.json exist the screens only change
// one import line, then this file is deleted.
//
// Storage, input checks and the demo profile used to live here too. They now come
// from src/lib/storage.ts, src/lib/validate.ts and src/lib/demoProfile.ts.

import type { EmergencyStep } from "@/lib/types";
import emergencyData from "@/data/emergencyPlaceholder.json";

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
