import test from "node:test";
import assert from "node:assert/strict";

import rules from "@/data/indicators.json";
import seed from "@/data/seed.json";
import { getStatus } from "@/lib/status";
import type { IndicatorRule, Reading } from "@/lib/types";

const indicators = rules as IndicatorRule[];
const seedReadings = seed as Reading[];

test("indicator rules are not empty", () => {
  assert.ok(indicators.length > 0);
});

test("indicator rules have sources", () => {
  for (const rule of indicators) {
    assert.ok(rule.earthRange.source.trim());

    if (rule.criticalLimit) {
      assert.ok(rule.criticalLimit.source.trim());
    }

    for (const adjustment of rule.adjustments) {
      assert.ok(adjustment.source.trim());
    }
  }
});

test("indicator sources are complete", () => {
  for (const rule of indicators) {
    assert.ok(
      !rule.earthRange.source.toUpperCase().includes("PENDING"),
      `${rule.measure} has an unfinished source`,
    );
  }
});

test("indicator ranges are ordered correctly", () => {
  for (const rule of indicators) {
    const { low, high } = rule.earthRange;

    if (low !== null && high !== null) {
      assert.ok(low < high);
    }

    if (rule.criticalLimit) {
      const { low, high } = rule.criticalLimit;

      if (low !== null && high !== null) {
        assert.ok(low < high);
      }
    }
  }
});

test("indicator rules have no duplicate measure and context", () => {
  const keys = indicators.map((rule) => `${rule.measure}:${rule.context}`);

  assert.equal(new Set(keys).size, keys.length);
});

test("heart rate, temperature, BP, glucose, sleep, and mood rules match app contexts and units", () => {
  const expected: Array<[string, string, string]> = [
    ["heartRate", "resting", "bpm"],
    ["bodyTemperature", "resting", "°C"],
    ["systolic", "resting", "mmHg"],
    ["diastolic", "resting", "mmHg"],
    ["bloodGlucose", "fasting", "mg/dL"],
    ["sleepDuration", "overnight", "h"],
    ["mood", "selfReport", "of 5"],
  ];

  for (const [measure, context, unit] of expected) {
    assert.ok(
      indicators.some(
        (rule) =>
          rule.measure === measure &&
          rule.context === context &&
          rule.unit === unit,
      ),
      `Missing rule for ${measure} (${context}, ${unit})`,
    );
  }
});

test("heart rate and body temperature demo parameters are configured", () => {
  const hr = indicators.find((r) => r.measure === "heartRate");
  assert.equal(hr?.baselineFloor, 10);
  assert.deepEqual(hr?.criticalLimit, {
    low: 40,
    high: null,
    source: "demo parameter",
  });

  const temp = indicators.find((r) => r.measure === "bodyTemperature");
  assert.deepEqual(temp?.criticalLimit, {
    low: null,
    high: 38.5,
    source: "demo parameter",
  });
  assert.equal(temp?.adjustments[0]?.shift, 1.01);
  assert.equal(temp?.adjustments[0]?.rampDays, 75);
  assert.deepEqual(temp?.adjustments[0]?.environments, [
    "station",
    "marsTransit",
  ]);

  const sys = indicators.find((r) => r.measure === "systolic");
  const dia = indicators.find((r) => r.measure === "diastolic");
  assert.equal(sys?.adjustments[0]?.shift, -8);
  assert.equal(sys?.adjustments[0]?.rampDays, 85);
  assert.equal(dia?.adjustments[0]?.shift, -9);
  assert.equal(dia?.adjustments[0]?.rampDays, 85);
});

test("seed day-212 body temperature 37.4°C is amber on Earth and green on Mars transit", () => {
  const day212Temp = seedReadings.find(
    (r) => r.id === "seed-bodyTemperature-212",
  );
  assert.ok(day212Temp, "Expected seed-bodyTemperature-212 in seed.json");

  const now = new Date("2026-11-14T13:00:00.000Z");
  const earthResult = getStatus(day212Temp, seedReadings, "earth", 212, now);
  const marsResult = getStatus(
    day212Temp,
    seedReadings,
    "marsTransit",
    212,
    now,
  );

  assert.equal(earthResult.status, "amber");
  assert.equal(marsResult.status, "green");
});
