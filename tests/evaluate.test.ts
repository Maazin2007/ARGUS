import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildSensitivity,
  buildSummary,
  evaluateScenario,
  evaluateScenarioMultiSeed,
  SCENARIOS,
  type Scenario,
  type SensitivityConfig,
} from "../scripts/scenario";
import scenarioJson from "../scripts/scenarios/fever.json";
import committedResult from "../results/fever.json";
import committedSummary from "../results/summary.json";
import sensitivityJson from "../scripts/scenarios/sensitivity.json";
import committedSensitivity from "../results/sensitivity.json";

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

// ---------- all scenarios and the many-seed run ----------


const summary = buildSummary();
const entry = (id: string) => {
  const found = summary.scenarios.find((s) => s.id === id);
  assert.ok(found, `scenario ${id} exists`);
  return found;
};

// Same rule as fever.json: if anything changes, run `npm run evaluate` and commit.
test("results/summary.json matches the current status engine and scenarios", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(summary)), committedSummary);
});

test("the summary's fever result is the committed frozen fever result", () => {
  assert.deepEqual(entry("fever").frozen, committedResult);
});

test("the many-seed run is deterministic and starts at the frozen seed", () => {
  const first = evaluateScenarioMultiSeed(scenario, 5);
  assert.deepEqual(evaluateScenarioMultiSeed(scenario, 5), first);
  assert.equal(first.firstSeed, scenario.seed);
  assert.equal(first.seedCount, 5);
});

test("every scenario has a unique id", () => {
  const ids = SCENARIOS.map((s) => s.id);
  assert.equal(new Set(ids).size, ids.length);
});

test("a single odd reading gives no false alert with the adjusted range or the baseline", () => {
  const methods = entry("typo").multiSeed.methods;
  for (const id of ["adjustedRange", "adjustedRangeAndBaseline"]) {
    const m = methods.find((x) => x.id === id);
    assert.ok(m);
    assert.equal(m.falseAmber.worst, 0, `${id} false amber`);
    assert.equal(m.falseRed.worst, 0, `${id} false red`);
  }
});

test("a spike above the critical limit is red on day 0 for every method and every seed", () => {
  for (const m of entry("spike").multiSeed.methods) {
    assert.equal(m.firstRedDay.worst, 0, m.label);
    assert.equal(m.firstRedDay.never, 0, m.label);
  }
});

// Sleep and mood have no adjustment and no personal baseline, so the extra
// information must not change their result.
test("sleep debt and falling mood give the same result with all three methods", () => {
  for (const id of ["sleepDebt", "moodDrop"]) {
    const [a, b, c] = entry(id).multiSeed.methods;
    const strip = ({ firstAmberDay, firstRedDay, missed, falseAmber, falseRed }: typeof a) => ({
      firstAmberDay,
      firstRedDay,
      missed,
      falseAmber,
      falseRed,
    });
    assert.deepEqual(strip(a), strip(b), id);
    assert.deepEqual(strip(b), strip(c), id);
  }
});

// ---------- sensitivity grid ----------

const sensitivityConfig = sensitivityJson as SensitivityConfig;
const sensitivity = buildSensitivity(sensitivityConfig, scenario);

test("results/sensitivity.json matches the current status engine and grid", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(sensitivity)), committedSensitivity);
});

test("the grid point with fever.json's own setting gives the same 100-seed result", () => {
  const point = sensitivity.points.find(
    (p) => p.noise === scenario.noise && p.risePerDay === scenario.risePerDay,
  );
  assert.ok(point, "the grid includes fever.json's setting");
  assert.deepEqual(point.result, entry("fever").multiSeed);
});

test("every pre-registered prediction gets a verdict", () => {
  assert.deepEqual(
    sensitivity.checks.map((c) => c.id),
    sensitivityConfig.predictions.map((p) => p.id),
  );
  for (const c of sensitivity.checks) assert.equal(c.text, sensitivityConfig.predictions.find((p) => p.id === c.id)?.text);
});
