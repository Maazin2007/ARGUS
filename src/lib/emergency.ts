// The emergency decision tree from src/data/emergency.json: look up a step, and
// work out which step an answer leads to. The screen walks the tree with these
// two functions (src/components/emergency/emergencyPath.ts).

import type { EmergencyStep } from "@/lib/types";
import emergencyData from "@/data/emergency.json";

// The screen needs a few fields the shared EmergencyStep type does not have
// (hint, button labels, log wording).
export type EmergencyStepUi = EmergencyStep & {
  hint: string;
  yesLabel?: string;
  noLabel?: string;
  logYes: string;
  logNo: string;
  showLimits?: boolean;
  showElapsed?: boolean; // show a running "time on this step" clock
};

export const EMERGENCY_STEPS = emergencyData.steps as EmergencyStepUi[];
export const EMERGENCY_SCENARIO: string = emergencyData.scenario;
export const EMERGENCY_FIRST_STEP_ID: string = emergencyData.firstStepId;
export const EMERGENCY_LIMITS_NOTE: string = emergencyData.limitsNote;

export function getStep(id: string): EmergencyStepUi | null {
  return EMERGENCY_STEPS.find((s) => s.id === id) ?? null;
}

// Returns the id of the next step, or null when the tree ends.
export function nextStepId(step: EmergencyStep, answer: "yes" | "no"): string | null {
  if (step.type === "instruction") return step.next;
  return answer === "yes" ? step.yes : step.no;
}
