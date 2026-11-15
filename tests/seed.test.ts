import assert from "node:assert/strict";
import { test } from "node:test";
import { getStatus } from "@/lib/status";
import type { IndicatorRule, Measure, Reading } from "@/lib/types";
import seedJson from "@/data/seed.json";
import rulesJson from "@/data/indicators.json";

const seed = seedJson as Reading[];
const rules = rulesJson as IndicatorRule[];

// The engine matches measure and context exactly, so a spelling difference
// between the seed and the rules turns every reading into "unknown".
function hasRule(measure: Measure, reading: Reading): boolean {
  return rules.some(
    (rule) =>
      rule.measure === measure &&
      rule.context === reading.context &&
      rule.unit === reading.unit,
  );
}

test("seed has 30 readings for each of the six indicators, all marked simulated", () => {
  const counts = new Map<string, number>();
  for (const reading of seed) {
    counts.set(reading.indicator, (counts.get(reading.indicator) ?? 0) + 1);
  }
  assert.deepEqual(Object.fromEntries(counts), {
    heartRate: 30,
    bodyTemperature: 30,
    bloodGlucose: 30,
    sleepDuration: 30,
    mood: 30,
    bloodPressure: 30,
  });
  assert.ok(seed.every((reading) => reading.simulated));
});

test("every seed reading's context and unit match a rule in indicators.json", () => {
  for (const reading of seed) {
    const measures: Measure[] =
      reading.indicator === "bloodPressure"
        ? ["systolic", "diastolic"]
        : [reading.indicator];
    for (const measure of measures) {
      assert.ok(
        hasRule(measure, reading),
        `No rule for ${measure} with context "${reading.context}" and unit "${reading.unit}" (${reading.id})`,
      );
    }
  }
});

test("day-212 seed temperature is amber on Earth and green in Mars transit", () => {
  const temperatures = seed.filter((r) => r.indicator === "bodyTemperature");
  const latest = temperatures.find((r) => r.missionDay === 212);
  assert.ok(latest, "seed has no day-212 temperature reading");
  const earlier = temperatures.filter((r) => r.id !== latest.id);
  const now = new Date(latest.timestamp);

  const onEarth = getStatus(latest, earlier, "earth", 212, now);
  const inTransit = getStatus(latest, earlier, "marsTransit", 212, now);

  assert.equal(onEarth.status, "amber");
  assert.equal(inTransit.status, "green");
  assert.equal(inTransit.referenceRange?.adjusted, true);
});

test("the demo profile's latest readings show all six indicators green in Mars transit", () => {
  const indicators = [...new Set(seed.map((r) => r.indicator))];
  assert.equal(indicators.length, 6);
  for (const indicator of indicators) {
    const history = seed
      .filter((r) => r.indicator === indicator)
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    const latest = history[history.length - 1];
    const result = getStatus(
      latest,
      history.slice(0, -1),
      "marsTransit",
      latest.missionDay,
      new Date(latest.timestamp),
    );
    assert.equal(
      result.status,
      "green",
      `${indicator} is ${result.status}: ${result.reasons.join(" ")}`,
    );
  }
});
