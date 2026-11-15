import assert from "node:assert/strict";
import { test } from "node:test";

import {
  EMERGENCY_FIRST_STEP_ID,
  EMERGENCY_STEPS,
  getStep,
  nextStepId,
} from "@/lib/emergency";

const ids = new Set(EMERGENCY_STEPS.map((s) => s.id));

// Every id a step can lead to, whichever answer is given.
function targets(id: string): string[] {
  const step = getStep(id);
  if (!step) return [];
  return [nextStepId(step, "yes"), nextStepId(step, "no")].filter(
    (t): t is string => t !== null,
  );
}

test("step ids are unique", () => {
  assert.equal(ids.size, EMERGENCY_STEPS.length);
});

test("the first step exists", () => {
  assert.ok(getStep(EMERGENCY_FIRST_STEP_ID));
});

test("every yes, no and next pointer is an existing step id or null", () => {
  for (const step of EMERGENCY_STEPS) {
    for (const pointer of [step.yes, step.no, step.next]) {
      assert.ok(pointer === null || ids.has(pointer), `${step.id} points to missing step ${pointer}`);
    }
  }
});

test("questions use yes/no and instructions use next", () => {
  for (const step of EMERGENCY_STEPS) {
    if (step.type === "question") {
      assert.ok(step.yes && step.no, `question ${step.id} needs both yes and no`);
    } else {
      assert.equal(step.yes, null, `instruction ${step.id} should not have yes`);
      assert.equal(step.no, null, `instruction ${step.id} should not have no`);
    }
  }
});

test("every step is reachable from the first step", () => {
  const seen = new Set<string>();
  const queue = [EMERGENCY_FIRST_STEP_ID];
  while (queue.length) {
    const id = queue.shift() as string;
    if (seen.has(id)) continue;
    seen.add(id);
    queue.push(...targets(id));
  }
  for (const id of ids) assert.ok(seen.has(id), `step ${id} cannot be reached`);
});

test("the tree has no loops, so every path ends", () => {
  // Depth-first walk: meeting a step that is already on the current path is a loop.
  function walk(id: string, path: string[]): void {
    assert.ok(!path.includes(id), `loop: ${[...path, id].join(" -> ")}`);
    for (const next of targets(id)) walk(next, [...path, id]);
  }
  walk(EMERGENCY_FIRST_STEP_ID, []);
});

test("every step has a valid label and a source", () => {
  for (const step of EMERGENCY_STEPS) {
    assert.ok(
      step.label === "Published" || step.label === "Demo copy",
      `${step.id} has label ${step.label}`,
    );
    assert.ok(step.source.trim().length > 0, `${step.id} has no source`);
  }
});

test("every Published step cites an opened publication", () => {
  for (const step of EMERGENCY_STEPS.filter((s) => s.label === "Published")) {
    assert.match(step.source, /doi\.org\/10\./, `${step.id} needs a DOI link`);
    assert.doesNotMatch(step.source, /team draft|not yet opened|until a team member/i, `${step.id} source is not an opened publication`);
  }
});

test("no step gives medication or dosing advice", () => {
  for (const step of EMERGENCY_STEPS) {
    const words = `${step.text} ${step.hint}`;
    assert.doesNotMatch(words, /\b\d+(\.\d+)?\s?(mg|mcg|ml|mL|units?)\b/, `${step.id} mentions a dose`);
    assert.doesNotMatch(words, /\b(give|administer|inject)\b[^.]*\b(aspirin|adrenaline|epinephrine|nitroglycerin|amiodarone)\b/i, `${step.id} gives a drug instruction`);
  }
});

// CODING_STANDARDS.md: the app never says "healthy", "safe" or "normal".
test("no step uses the words healthy, safe or normal", () => {
  for (const step of EMERGENCY_STEPS) {
    const words = [step.text, step.hint, step.logYes, step.logNo, step.yesLabel ?? "", step.noLabel ?? ""].join(" ");
    assert.doesNotMatch(words, /\b(healthy|safe|normal(ly)?)\b/i, `${step.id} uses a banned word`);
  }
});
