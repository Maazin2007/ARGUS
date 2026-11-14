import assert from "node:assert/strict";
import { test } from "node:test";
import { adjustRange, checkReading, getStatus } from "@/lib/status";
import type { IndicatorRule, Reading } from "@/lib/types";

const now = new Date("2026-11-14T13:05:00Z");

// Test rules with easy numbers (labelled as test values per plan/BACKEND.md).
const testRules: IndicatorRule[] = [
  {
    measure: "heartRate",
    context: "resting",
    unit: "bpm",
    earthRange: { low: 60, high: 100, source: "test value" },
    criticalLimit: { low: 40, high: 150, source: "test value" },
    baselineFloor: 10,
    adjustments: [],
  },
  {
    measure: "bodyTemperature",
    context: "resting",
    unit: "°C",
    earthRange: { low: 36, high: 37, source: "test value" },
    criticalLimit: { low: 35, high: 39, source: "test value" },
    baselineFloor: 0.3,
    adjustments: [
      {
        environments: ["station", "marsTransit"],
        shift: 1,
        rampDays: 75,
        source: "test value",
        note: "Test adjustment",
      },
    ],
  },
  {
    measure: "sleepDuration",
    context: "daily",
    unit: "h",
    earthRange: { low: 6, high: 9, source: "test value" },
    criticalLimit: null, // sleep has no red rule
    baselineFloor: 1,
    adjustments: [],
  },
];

const restingHeartRate: Reading = {
  id: "r-001",
  indicator: "heartRate",
  value: 72,
  unit: "bpm",
  timestamp: "2026-11-14T13:00:00Z",
  missionDay: 212,
  environment: "marsTransit",
  context: "resting",
  simulated: false,
};

const lateMissionTemperature: Reading = {
  id: "r-002",
  indicator: "bodyTemperature",
  value: 37.6,
  unit: "°C",
  timestamp: "2026-11-14T13:00:00Z",
  missionDay: 212,
  environment: "marsTransit",
  context: "resting",
  simulated: false,
};

test("getStatus returns the agreed shape", () => {
  const result = getStatus(restingHeartRate, [], "marsTransit", 212, now);
  assert.ok(["green", "amber", "red", "unknown"].includes(result.status));
  assert.ok(result.reasons.length > 0);
  assert.equal(typeof result.criticalLimitCrossed, "boolean");
});

test("unsupported context returns unknown", () => {
  const exerciseReading: Reading = {
    ...restingHeartRate,
    context: "exercise",
    value: 140,
  };
  const result = checkReading(
    exerciseReading,
    [],
    testRules,
    "earth",
    0,
    now,
  );
  assert.equal(result.status, "unknown");
  assert.equal(result.criticalLimitCrossed, false);
});

test("stale reading returns unknown", () => {
  const staleReading: Reading = {
    ...restingHeartRate,
    timestamp: "2026-11-10T13:00:00Z", // 4 days (96 hours) before `now`
  };
  const result = checkReading(staleReading, [], testRules, "earth", 0, now);
  assert.equal(result.status, "unknown");
});

test("reading crossing criticalLimit returns red", () => {
  const highReading: Reading = {
    ...restingHeartRate,
    value: 165,
  };
  const result = checkReading(highReading, [], testRules, "earth", 0, now);
  assert.equal(result.status, "red");
  assert.equal(result.criticalLimitCrossed, true);
});

test("reading outside reference range returns amber", () => {
  const elevatedReading: Reading = {
    ...restingHeartRate,
    value: 115,
  };
  const result = checkReading(elevatedReading, [], testRules, "earth", 0, now);
  assert.equal(result.status, "amber");
  assert.equal(result.criticalLimitCrossed, false);
});

test("reading inside reference range returns green", () => {
  const result = checkReading(restingHeartRate, [], testRules, "earth", 0, now);
  assert.equal(result.status, "green");
  assert.equal(result.criticalLimitCrossed, false);
});

test("mission day 0 gives the unadjusted Earth range", () => {
  const tempRule = testRules[1];
  const range = adjustRange(tempRule, "marsTransit", 0);
  assert.equal(range.low, 36);
  assert.equal(range.high, 37);
  assert.equal(range.adjusted, false);
});

test("mission day past rampDays gives the full shift", () => {
  const tempRule = testRules[1];
  const range = adjustRange(tempRule, "marsTransit", 212);
  assert.equal(range.low, 37);
  assert.equal(range.high, 38);
  assert.equal(range.adjusted, true);
});

test("late-mission temperature that is amber on Earth is green after space adjustment", () => {
  const onEarth = checkReading(
    lateMissionTemperature,
    [],
    testRules,
    "earth",
    212,
    now,
  );
  assert.equal(onEarth.status, "amber");
  assert.equal(onEarth.referenceRange?.adjusted, false);

  const inTransit = checkReading(
    lateMissionTemperature,
    [],
    testRules,
    "marsTransit",
    212,
    now,
  );
  assert.equal(inTransit.status, "green");
  assert.equal(inTransit.referenceRange?.adjusted, true);
});

test("temperature above criticalLimit stays red even after space adjustment", () => {
  const criticalFever: Reading = {
    ...lateMissionTemperature,
    value: 39.5,
  };
  const result = checkReading(
    criticalFever,
    [],
    testRules,
    "marsTransit",
    212,
    now,
  );
  assert.equal(result.status, "red");
  assert.equal(result.criticalLimitCrossed, true);
});
