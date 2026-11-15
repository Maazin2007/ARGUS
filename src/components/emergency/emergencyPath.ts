import { EMERGENCY_FIRST_STEP_ID, getStep, nextStepId } from "@/lib/emergency";
import type { EmergencyStepUi } from "@/lib/emergency";

// One answer the crew gave, with the UTC time it was given.
// `at` is the same moment in milliseconds, so the next step can show how long it has been open.
export type EmergencyAnswer = { answer: "yes" | "no"; time: string; at: number };

// One row of the step log: the step that was answered, and the answer.
export type AnsweredStep = { step: EmergencyStepUi; answer: EmergencyAnswer };

// Replays the answers from the first step. We store only the answers (not the step ids)
// so "Back one step" is just removing the last answer, and the tree is the single
// source of truth for where each answer leads.
export function walkPath(path: EmergencyAnswer[]): {
  answered: AnsweredStep[];
  current: EmergencyStepUi | null; // null once the tree has ended
} {
  const answered: AnsweredStep[] = [];
  let current = getStep(EMERGENCY_FIRST_STEP_ID);
  for (const answer of path) {
    if (!current) break;
    answered.push({ step: current, answer });
    const nextId = nextStepId(current, answer.answer);
    current = nextId ? getStep(nextId) : null;
  }
  return { answered, current };
}

// The label shown on a step's YES / NO button. Instruction steps say DONE / UNABLE.
export function buttonLabel(step: EmergencyStepUi, answer: "yes" | "no"): string {
  if (answer === "yes") return step.yesLabel ?? "YES";
  return step.noLabel ?? "NO";
}

// "HH:MM:SS" (UTC, as in the mockup) for the step log. Only call this in an event handler, never during render.
export function utcTime(date: Date): string {
  const two = (n: number) => String(n).padStart(2, "0");
  return `${two(date.getUTCHours())}:${two(date.getUTCMinutes())}:${two(date.getUTCSeconds())}`;
}
