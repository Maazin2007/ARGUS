import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateScenario, type Scenario } from "../scripts/scenario";
import scenarioJson from "../scripts/scenarios/fever.json";
import committedResult from "../results/fever.json";

const scenario = scenarioJson as Scenario;

// If the status rules, the thresholds or the scenario change, the committed
// table is out of date. Run `npm run evaluate` and commit the new files.
test("results/fever.json matches the current status engine and scenario", () => {
  assert.deepEqual(evaluateScenario(scenario), committedResult);
});

test("the fever scenario has a healthy period and a fever period", () => {
  const result = evaluateScenario(scenario);
  assert.equal(result.healthyDays, 30);
  assert.equal(result.feverDays, 10);
});

// The critical limit is fixed, so no method may reach red earlier or later.
test("all three methods turn red on the same day", () => {
  const redDays = evaluateScenario(scenario).methods.map((m) => m.firstRedDay);
  assert.notEqual(redDays[0], null);
  assert.ok(redDays.every((day) => day === redDays[0]));
});
